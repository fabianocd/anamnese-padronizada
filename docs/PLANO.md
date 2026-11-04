# Plano de implementação

Marque `[x]` ao concluir cada fase. Detalhes de stack, segurança e formatação estão no `CLAUDE.md`.

## Fases

- [x] **1. Setup e layout**: Next.js + TS strict + Tailwind + shadcn/ui; shell (sidebar, topo com breadcrumb e "+ Nova anamnese", menu lateral no celular); tema escuro glass com acento laranja e fundo em gradiente; rotas vazias; `.env.example`; repo GitHub `anamnese-padronizada` (privado); lint + typecheck.
- [x] **2. Auth e banco com RLS**: `@supabase/ssr` + `src/proxy.ts`; login, cadastro (com confirmação por e-mail), recuperação de senha, logout; migrations (`templates`, `anamneses` com `template_snapshot`, `profiles`, `specialties`); RLS + policies em tudo; policies de storage por pasta `{user_id}/`; tipos gerados; Security Advisor sem alertas. Configurações já com perfil, especialidades (adicionar/remover), alterar senha e excluir conta. Isolamento entre contas testado (RLS, storage, FKs compostas).
- [x] **3. Extração com Gemini**: upload (1 PDF ou até 10 imagens, máx. 20 MB) direto do navegador para `{user_id}/sources/{uploadId}/` no bucket; `POST /api/modelos/extrair` lê a pasta (RLS do usuário), revalida e chama o Gemini com JSON schema; validação zod + normalização (ids, caixa alta, siglas da lista, `#ID` em linha única, `#CONDUTA` no fim); erros amigáveis → "Tentar de novo" ou "Criar manualmente" (esqueleto ID/QP/HDA/CONDUTA); rascunho no sessionStorage e prévia em `/modelos/novo/revisar` (o editor da fase 4 entra nessa página). Testado com `docs/anamnese-pediatrica-exemplo.pdf` (21 seções, 100 campos, anexos ignorados).
- [ ] **4. Editor de modelo**: título, especialidade, seções e campos (dnd-kit), tipos, opções, dicas, opção "linha única" por seção; prévia ao vivo; CRUD de modelos; marcar modelo padrão por especialidade.
- [ ] **5. Preenchimento e histórico**: formulário gerado do snapshot; autosave; histórico com busca e filtro por modelo; abrir, editar, duplicar, excluir.
- [ ] **6. Exportação em PDF**: formatador único (prévia + PDF), `@react-pdf/renderer`, botão "copiar texto".
- [ ] **7. Deploy**: projeto na Vercel ligado ao GitHub (push na `main` publica sozinho); variáveis de ambiente; região `iad1`; Site URL e Redirect URLs no Supabase; ligar **Confirm email** no Supabase (desligado durante o desenvolvimento) e testar o cadastro com confirmação.

## Decisões tomadas

1. **Linha única**: opção por seção no editor, ligada por padrão na `#ID` (ex.: `#ID: M.S., 2 ANOS, NATURAL DE SOBRAL-CE`). Seções com um campo só saem na mesma linha automaticamente. Pode ser alterada a qualquer momento.
2. **LGPD**: a IA renomeia "Nome" para "Iniciais", e o formulário avisa para não usar o nome completo. O rótulo continua editável.
3. **Perguntas compostas**: medidas (Peso / Comp / PC / IMC) viram campos numéricos separados; perguntas como "Acorda quantas vezes? Mama durante a noite?" viram um campo de texto, com as perguntas na `hint`.
4. **Hints** aparecem só no formulário, nunca no PDF.
5. **Siglas**: ID, QP, HDA, HPP, HF, HD, DNPM. Exame físico por extenso: `#EXAME FÍSICO:`. Demais seções por extenso.
6. **yes_no**: SIM/NÃO com observação opcional (ex.: `-PRÉ-NATAL: SIM, 8 CONSULTAS`).
7. **Upload**: 1 PDF ou até 10 imagens, máx. 20 MB.
8. **Arquivo original** guardado no bucket e ligado ao modelo.
9. **Configurações**: perfil (nome e instituição, que podem ir no cabeçalho do PDF), alterar senha, excluir conta com todos os dados (usa `SUPABASE_SECRET_KEY`, só no servidor).
10. **Cadastro** com confirmação por e-mail. Durante o desenvolvimento a confirmação fica desligada no Supabase (o cadastro entra direto); ligar na fase de deploy.
11. **Tema**: escuro (padrão, gradiente quente no lugar da foto da referência) e claro (fundo marfim/bege). A troca fica em Configurações > Aparência (Claro / Escuro / Sistema), salva no navegador (localStorage) e aplicada por script inline antes da pintura (`src/lib/theme.ts`).
12. **Especialidades**: lista editável pela pessoa, sem modelos pré-definidos. A pessoa marca o próprio modelo padrão por especialidade (ex.: "Anamnese Pediátrica" para Pediatria), salvo na conta, e "Nova anamnese" já o sugere.
13. **Git**: repo privado `anamnese-padronizada` no GitHub (`fabianocd`). A Vercel já tem acesso ao GitHub. Push na `main` faz deploy automático. Push só quando o usuário pedir.
14. **Gemini**: chave do plano gratuito; usar o modelo Flash mais recente. Limites baixos → mensagem amigável quando a cota estourar. No plano gratuito o Google pode usar o conteúdo para treino, o que é aceitável porque só a ficha em branco é enviada.
15. **Auth no servidor**: `src/lib/auth.ts` (`getCurrentUser`/`requireUser`, via `getClaims`) é a checagem de verdade; o proxy só renova a sessão e redireciona (sem sessão → `/entrar?next=...`; logado em `/entrar` → `/modelos`). O cliente de servidor chama `connection()`: dados da conta só com request real, nunca em prerender/prefetch.
16. **Links de e-mail** caem em `/auth/confirm`, que aceita `?code=` (template padrão do Supabase) e `?token_hash=&type=` (template customizado, que funciona mesmo abrindo o e-mail em outro navegador/celular).
17. **Bucket** `anamneses-docs`: privado, limite de 20 MB, só PDF e imagens (JPEG, PNG, WebP, HEIC/HEIF).
18. **Excluir conta**: apaga os arquivos do bucket e depois o usuário (o banco apaga o resto em cascata).
19. **Modelos do Gemini**: principal `gemini-3.8-flash` (trocável por `GEMINI_MODEL`), reservas `gemini-3.5-flash` e `gemini-3.5-flash-lite` quando o anterior dá 503 ou estoura o tempo. Retries automáticos do SDK desligados; orçamento total de 105 s (rota com `maxDuration = 120`). Arquivos até 14 MB vão inline; acima disso pela Files API, apagados logo depois. No plano gratuito os 503 ("high demand") são frequentes e uma leitura leva ~35–65 s.
20. **Rascunho do modelo**: fica no `sessionStorage` (só a aba atual) até ser salvo no editor; guarda `sourceFilePath` = pasta do envio, que vai para `templates.source_file_path`. Se a extração falha, a pasta do envio é apagada.
21. **Schema**: seções ganharam `singleLine?: boolean` (decisão 1). Títulos, siglas e rótulos são guardados em caixa alta; opções e hints como vieram.

## Para implementar no futuro

- **SMTP próprio** (ex.: Resend) no Supabase Auth: o SMTP embutido envia poucos e-mails por hora. Necessário antes de abrir o app para uma turma ou mais pessoas.
- **Upgrade do Gemini** para plano pago, se o uso crescer (resolve boa parte dos 503 e da demora).
- **Limpeza de envios órfãos**: pastas `{user_id}/sources/...` de rascunhos abandonados (extraídos mas nunca salvos como modelo). Ex.: rotina que apaga pastas sem modelo com mais de 1 dia.
- **Limite de extrações por usuário** (rate limit) se o app abrir para mais pessoas.
