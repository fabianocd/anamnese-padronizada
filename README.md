# Prontus

Anamnese padronizada: app web para profissionais e estudantes de medicina padronizarem anamneses.

Envie a ficha de anamnese que você já usa (PDF ou fotos), a IA monta um **modelo** com as seções e os campos, você revisa e, a partir dele, preenche **anamneses** e exporta um PDF no formato padrão.

**Produção:** https://prontus-med.vercel.app

```
#ID: M.S., 2 ANOS, NATURAL DE SOBRAL-CE, ACOMPANHADA PELA MÃE
#QP: FEBRE HÁ 3 DIAS
#HDA: ...
#ALIMENTAÇÃO:
-ALEITAMENTO MATERNO EXCLUSIVO: ATÉ 6 MESES
-INTRODUÇÃO ALIMENTAR: ...
#CONDUTA: ...
```

## Funcionalidades

- **Novo modelo a partir da ficha:** envio de 1 PDF ou até 10 imagens (máx. 20 MB). O Gemini extrai só o que é campo a preencher e ignora anexos como escalas, calendário vacinal, tabelas de percentis e cabeçalhos institucionais.
- **Editor de modelo:**
  - título e especialidade, com um modelo padrão por especialidade;
  - seções com sigla (ID, QP, HDA, HPP, HF...) e opção de linha única;
  - campos de texto, texto longo, número, data, lista e Sim/Não;
  - arrastar e soltar e prévia ao vivo.
- **Preenchimento:** formulário gerado a partir do modelo, com salvamento automático e progresso por seção. Cada anamnese guarda uma cópia do modelo, então editar o modelo depois não altera as anamneses antigas. Se o modelo mudar, a anamnese oferece "Atualizar esta anamnese", sem perder respostas.
- **Histórico:** busca por título ou paciente, filtro por modelo, duplicar e excluir.
- **Calendário:** marcação de atendimentos (nome, horário, local e observação), com repetição semanal. Cada dia mostra se há atendimento ou anamnese, e ao clicar aparecem os atendimentos e as anamneses feitas naquele dia.
- **Bloco de Notas:** notas livres com título e salvamento automático.
- **Exportação:**
  - prévia em formato de folha;
  - PDF A4 com cabeçalho (modelo, paciente, data, profissional e instituição);
  - "Copiar texto" para colar no prontuário.
  - Tudo sai em caixa alta, e campos vazios são omitidos.
- **Conta:** cadastro com confirmação por e-mail, recuperação de senha, perfil, especialidades, tema claro ou escuro e exclusão da conta com todos os dados.

## Stack

| Área | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router, `cacheComponents`), React 19, TypeScript strict |
| Interface | Tailwind CSS 4, shadcn/ui, dnd-kit, sonner |
| Validação | zod |
| Backend | Supabase (Auth, Postgres com RLS, Storage) via `@supabase/ssr` |
| IA | Gemini API (`@google/genai`), com saída estruturada em JSON schema |
| PDF | `@react-pdf/renderer`, gerado no navegador, fonte Inter |
| Deploy | Vercel (região `iad1`) |

## Como rodar localmente

Pré-requisitos: Node.js 20+ e acesso ao projeto Supabase.

```bash
npm install
cp .env.example .env.local   # preencha as variáveis abaixo
npm run dev                  # http://localhost:3010
```

O servidor de desenvolvimento usa a porta **3010**. Ela precisa estar nas Redirect URLs do Supabase como `http://localhost:3010/**`.

### Variáveis de ambiente

| Variável | Onde é usada | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | cliente e servidor | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente e servidor | Chave publicável (`sb_publishable_...`) |
| `SUPABASE_SECRET_KEY` | só servidor | Chave secreta, usada apenas para excluir a conta |
| `GEMINI_API_KEY` | só servidor | Chave da Gemini API ([AI Studio](https://aistudio.google.com/apikey)) |
| `GEMINI_MODEL` | só servidor (opcional) | Troca o modelo principal (padrão: `gemini-3.8-flash`) |

As chaves ficam só no `.env.local`, que está fora do Git, e nas variáveis da Vercel. Uma variável nova precisa entrar nos três lugares: `.env.local`, `.env.example` e Vercel.

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento na porta 3010 |
| `npm run build` | Build de produção |
| `npm run typecheck` | Gera os tipos de rota e roda `tsc` |
| `npm run lint` | ESLint |

## Estrutura

```
src/
  app/
    (auth)/            entrar, cadastro, recuperar e redefinir senha
    (app)/             modelos, anamneses, histórico, calendário, notas, configurações
    api/modelos/       rota de extração com o Gemini
    auth/confirm/      destino dos links de e-mail
  components/
    template-editor/   editor de modelo
    anamnesis-form/    formulário de preenchimento
    anamnesis-export/  prévia e PDF
    app-shell/         sidebar e barra do celular
    ui/                componentes shadcn/ui
  lib/
    gemini/            chamada à IA e normalização do resultado
    templates/         schema do modelo (zod) e preparação para salvar
    anamneses/         respostas, formatador de exportação e atualização com o modelo
    calendar/          datas no fuso de Brasília e validação dos atendimentos
    supabase/          clientes (navegador, servidor, proxy) e tipos gerados
  proxy.ts             renova a sessão e protege as rotas
supabase/migrations/   migrations do banco
docs/                  plano por fases e decisões
```

## Banco e segurança

- **Tabelas:** `profiles`, `specialties`, `templates` (schema do modelo em JSONB) `anamneses` (cópia do modelo + respostas em JSONB), `notes` (Bloco de Notas) e `appointments` (atendimentos do Calendário).
- **RLS em todas as tabelas:** cada pessoa só acessa os próprios registros (`auth.uid() = user_id`). As chaves estrangeiras são compostas `(id, user_id)`, o que impede ligar dados a registros de outra conta.
- **Storage:** bucket privado `anamneses-docs`. Cada pessoa só acessa a própria pasta `{user_id}/`, e a leitura é feita por signed URLs.
- **Chaves no servidor:** `GEMINI_API_KEY` e `SUPABASE_SECRET_KEY` nunca vão para o navegador.
- **LGPD:** o paciente é identificado só por iniciais ou código. O app não coleta CPF, endereço nem nome completo, e o Gemini recebe apenas a ficha em branco.
- **Migrations:** toda mudança no banco é feita por migration em `supabase/migrations/`. Depois de cada uma, regenere `src/lib/supabase/database.types.ts`.

## Deploy

O projeto `anamnese-padronizada` na Vercel está ligado a este repositório, e cada push na `main` publica automaticamente em produção.

No Supabase (Authentication > URL Configuration):

- a Site URL é o domínio da Vercel;
- as Redirect URLs incluem `https://prontus-med.vercel.app/**`, `https://anamnese-padronizada.vercel.app/**` (endereço antigo) e `http://localhost:3010/**`;
- a opção **Confirm email** está ligada.

Se o domínio mudar, atualize essas URLs.

## Documentação

- [`docs/PLANO.md`](docs/PLANO.md): fases, decisões tomadas e próximos passos.
- [`CLAUDE.md`](CLAUDE.md): especificação do produto, padrão de formatação e convenções do código.

Para testar a extração, use qualquer ficha de anamnese em PDF ou foto, de preferência em branco, sem dados de pacientes.
