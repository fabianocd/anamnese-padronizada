import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import { z } from "zod";
import { aiExtractionSchema, type AiExtraction } from "@/lib/templates/normalize";

/** Flash mais recente disponível (decisão 14). Pode ser trocado por GEMINI_MODEL. */
const DEFAULT_MODEL = "gemini-3.8-flash";
/** Usados em ordem quando o anterior está sobrecarregado (503) ou demora demais. */
const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];

/**
 * Orçamento de tempo (a rota tem maxDuration = 120 s). Cada tentativa tem até
 * PRIMARY_TIMEOUT_MS, guardando MIN_ATTEMPT_MS para cada reserva seguinte; a
 * última usa o que sobrar do total.
 */
const TOTAL_BUDGET_MS = 105_000;
const PRIMARY_TIMEOUT_MS = 50_000;
const MIN_ATTEMPT_MS = 15_000;

/** Acima disso os arquivos vão pela Files API em vez de inline (base64 cresce ~33%). */
const INLINE_LIMIT_BYTES = 14 * 1024 * 1024;

const SYSTEM_INSTRUCTION = `Você recebe uma ficha de anamnese em branco (PDF ou fotos), em português, usada por profissionais e estudantes de medicina. Sua tarefa é transformar a ficha em um modelo estruturado de seções e campos para preenchimento.

EXTRAIA SOMENTE o que é campo a ser preenchido na anamnese.

IGNORE completamente:
- anexos e material de referência: escalas (Bristol, Denver etc.), calendário vacinal, estágios de Tanner, tabelas de percentis (pressão arterial, circunferência abdominal), gráficos e figuras;
- cabeçalhos, rodapés e logos institucionais, nome da instituição, do curso e do professor;
- a seção "ANEXOS" e tudo que vem dentro dela.
Se um campo da ficha só aponta para um anexo (ex.: "Vacinas: ver calendário vacinal"), mantenha o campo e descarte o anexo. Uma referência curta pode ir na hint (ex.: hint "Ver calendário vacinal").
Se a ficha tiver respostas escritas, ignore as respostas: extraia só a estrutura.

SEÇÕES
- Uma seção por item/tópico principal da ficha, na mesma ordem.
- "title": título por extenso, sem numeração (ex.: "IDENTIFICAÇÃO", "ALIMENTAÇÃO", "EXAME FÍSICO").
- "abbreviation": use somente estas siglas, quando a seção corresponder: ID (identificação), QP (queixa principal), HDA (história da doença atual), HPP (história patológica pregressa), HF (história familiar), HD (hipótese diagnóstica), DNPM (desenvolvimento neuropsicomotor). Nas demais, "". Exame físico fica por extenso, sem sigla.
- Seção sem subcampos (ex.: "Queixa Principal:") recebe um único campo long_text com o mesmo rótulo do título.
- Não crie a seção CONDUTA se ela não existir na ficha (ela é adicionada depois automaticamente). Se existir, mantenha-a, com campos "long_text".

CAMPOS
- "label": rótulo curto, sem ":" no fim, corrigindo erros óbvios de digitação (ex.: "Identifacação" → "Identificação", "Asculta" → "Ausculta").
- Proteção de dados (LGPD): o campo "Nome" do paciente vira "Iniciais". Não crie campos de CPF, endereço, telefone ou documentos.
- Medidas compostas viram campos "number" separados (ex.: "Peso: / Comp: / PC: / IMC:" → PESO, COMPRIMENTO, PERÍMETRO CEFÁLICO, IMC). Coloque a unidade na hint quando for óbvia (kg, cm).
- Cada linha/item da ficha é um campo próprio. Nunca junte linhas diferentes em um campo só (ex.: na rotina, "Horário de acordar? Café?", "Hora do lanche?", "Almoço:" e "Jantar?" são campos separados).
- Várias perguntas NA MESMA linha viram UM campo de texto, com as perguntas na hint (ex.: "Sono: Acorda quantas vezes? Mama durante a noite?" → label "SONO", hint "Acorda quantas vezes? Mama durante a noite?"; "Horário de acordar? Café?" → label "HORÁRIO DE ACORDAR", hint "Horário de acordar? Café?").
- Texto que claramente não pertence ao campo (resto de título quebrado, ex.: "...na gestação:Parto e Período") deve ser descartado.
- Texto de orientação junto do campo vai para a hint (ex.: "Evacuações: Escala de Bristol" → hint "Escala de Bristol"; faixas de tempo de tela recomendadas por idade → hint resumida).
- Tipos:
  - "short_text": respostas curtas (idade, local, nome de exame, data aproximada em texto);
  - "long_text": relatos e descrições (HDA, exame de um sistema, hipóteses, conduta);
  - "yes_no": perguntas de sim ou não (ex.: "Pré-natal: sim ou não?", "Suplementação de vitamina D?", "Água tratada"); a pessoa pode complementar com observação;
  - "number": medidas e contagens numéricas (peso, comprimento, número de consultas, número de pessoas na casa);
  - "date": somente quando a ficha pede uma data de calendário;
  - "select": somente quando a ficha lista as opções explicitamente (ex.: "brincando ou introvertido?" → opções ["Brincando", "Introvertido"]).
- "options": só para "select"; nos outros tipos, [].
- "hint": "" quando não houver orientação.

"suggestedTitle": título curto do modelo a partir da ficha (ex.: "Anamnese Pediátrica").
"isAnamnesisForm": false se o documento claramente não for uma ficha de anamnese ou roteiro de consulta (nesse caso, "sections": []).`;

const RESPONSE_JSON_SCHEMA = (() => {
  const schema = z.toJSONSchema(aiExtractionSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
})();

export type ExtractionFile = { data: ArrayBuffer; mimeType: string; name: string };

export type ExtractionErrorCode =
  | "not_configured"
  | "quota"
  | "unavailable"
  | "unreadable"
  | "invalid_response"
  | "not_anamnesis"
  | "empty";

export class ExtractionError extends Error {
  constructor(
    public code: ExtractionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

const MESSAGES: Record<ExtractionErrorCode, string> = {
  not_configured: "A leitura por IA não está configurada no servidor.",
  quota:
    "O limite de uso gratuito da IA foi atingido por agora. Tente de novo em alguns minutos ou crie o modelo manualmente.",
  unavailable: "A IA está indisponível no momento. Tente de novo em instantes.",
  unreadable:
    "A IA não conseguiu ler o arquivo. Confira se o PDF não está protegido por senha e se as fotos estão nítidas.",
  invalid_response: "A IA devolveu um resultado fora do formato esperado. Tente de novo.",
  not_anamnesis: "O arquivo não parece ser uma ficha de anamnese.",
  empty: "A IA não encontrou campos para preencher nesse arquivo.",
};

function fail(code: ExtractionErrorCode): never {
  throw new ExtractionError(code, MESSAGES[code]);
}

function mapApiError(error: unknown): never {
  if (error instanceof ExtractionError) throw error;
  // Só status e mensagem do Google: nada do conteúdo da ficha vai para o log.
  console.error(
    "Gemini: falha na extração",
    error instanceof ApiError ? `${error.status} ${error.message}` : error,
  );
  if (error instanceof ApiError) {
    if (error.status === 429) fail("quota");
    if (error.status === 400 || error.status === 413) fail("unreadable");
    if (error.status === 401 || error.status === 403) fail("not_configured");
  }
  fail("unavailable");
}

/**
 * Envia a ficha ao Gemini e devolve a estrutura extraída (validada com zod,
 * ainda não normalizada). Lança ExtractionError com mensagem amigável.
 */
export async function extractTemplateWithGemini(files: ExtractionFile[]): Promise<AiExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) fail("not_configured");

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  // Sem retries automáticos do SDK (padrão: 5 tentativas com espera de até 60 s).
  const ai = new GoogleGenAI({ apiKey, httpOptions: { retryOptions: { attempts: 1 } } });
  const models = [...new Set([process.env.GEMINI_MODEL || DEFAULT_MODEL, ...FALLBACK_MODELS])];
  const totalBytes = files.reduce((sum, file) => sum + file.data.byteLength, 0);
  const uploaded: string[] = [];

  try {
    let parts: Part[];
    if (totalBytes <= INLINE_LIMIT_BYTES) {
      parts = files.map((file) => ({
        inlineData: { data: Buffer.from(file.data).toString("base64"), mimeType: file.mimeType },
      }));
    } else {
      parts = [];
      for (const file of files) {
        const result = await ai.files.upload({
          file: new Blob([file.data], { type: file.mimeType }),
          config: { mimeType: file.mimeType, displayName: file.name },
        });
        if (!result.name || !result.uri) fail("unavailable");
        uploaded.push(result.name);
        parts.push({ fileData: { fileUri: result.uri, mimeType: file.mimeType } });
      }
    }

    const intro =
      files.length > 1
        ? `As ${files.length} imagens a seguir são as páginas da ficha, em ordem.`
        : "A seguir está a ficha.";

    const generate = (model: string, timeout: number) =>
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: intro }, ...parts] }],
        config: {
          httpOptions: { timeout, retryOptions: { attempts: 1 } },
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_JSON_SCHEMA,
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

    let response: Awaited<ReturnType<typeof generate>> | undefined;
    for (const [index, model] of models.entries()) {
      const isLast = index === models.length - 1;
      const remaining = deadline - Date.now();
      const reserved = (models.length - 1 - index) * MIN_ATTEMPT_MS;
      const timeout = isLast ? remaining : Math.min(PRIMARY_TIMEOUT_MS, remaining - reserved);
      if (timeout < MIN_ATTEMPT_MS) fail("unavailable");
      try {
        response = await generate(model, timeout);
        break;
      } catch (error) {
        // Sobrecarga ou demora (comum no plano gratuito): tenta o reserva.
        const retryable = !(error instanceof ApiError) || error.status >= 500;
        if (!retryable || isLast) throw error;
        console.warn(
          `Gemini: ${model} falhou (${error instanceof ApiError ? error.status : "timeout/rede"}), tentando ${models[index + 1]}`,
        );
      }
    }
    if (!response) fail("unavailable");

    const text = response.text;
    if (!text) fail(response.promptFeedback?.blockReason ? "unreadable" : "invalid_response");

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      fail("invalid_response");
    }

    const parsed = aiExtractionSchema.safeParse(json);
    if (!parsed.success) fail("invalid_response");
    if (!parsed.data.isAnamnesisForm) fail("not_anamnesis");
    if (parsed.data.sections.length === 0) fail("empty");
    return parsed.data;
  } catch (error) {
    mapApiError(error);
  } finally {
    // Não deixar a ficha guardada no Google além do necessário.
    await Promise.allSettled(uploaded.map((name) => ai.files.delete({ name })));
  }
}
