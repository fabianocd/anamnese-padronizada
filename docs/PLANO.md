# Plano de implementação

Marque `[x]` ao concluir cada fase. Detalhes de stack, segurança e formatação estão no `CLAUDE.md`.

## Fases

- [x] **1. Setup e layout**: Next.js + TS strict + Tailwind + shadcn/ui; shell (sidebar, topo com breadcrumb e "+ Nova anamnese", menu lateral no celular); tema escuro glass com acento laranja e fundo em gradiente; rotas vazias; `.env.example`; repo GitHub `anamnese-padronizada` (privado); lint + typecheck.
- [ ] **2. Auth e banco com RLS**: `@supabase/ssr` + middleware; login, cadastro (com confirmação por e-mail), recuperação de senha, logout; migrations (`templates`, `anamneses` com `template_snapshot`, `profiles`, `specialties`); RLS + policies em tudo; policies de storage por pasta `{user_id}/`; tipos gerados; Security Advisor.
- [ ] **3. Extração com Gemini**: upload (1 PDF ou até 10 imagens, máx. 20 MB) para o bucket; route handler chama o Gemini com JSON schema; validação zod + normalização (ids, `#CONDUTA` no fim); erro amigável → criar manualmente; testar com `docs/anamnese-pediatrica-exemplo.pdf`.
- [ ] **4. Editor de modelo**: título, especialidade, seções e campos (dnd-kit), tipos, opções, dicas, opção "linha única" por seção; prévia ao vivo; CRUD de modelos; marcar modelo padrão por especialidade.
- [ ] **5. Preenchimento e histórico**: formulário gerado do snapshot; autosave; histórico com busca e filtro por modelo; abrir, editar, duplicar, excluir.
- [ ] **6. Exportação em PDF**: formatador único (prévia + PDF), `@react-pdf/renderer`, botão "copiar texto".
- [ ] **7. Deploy**: projeto na Vercel ligado ao GitHub (push na `main` publica sozinho); variáveis de ambiente; região `iad1`; Site URL e Redirect URLs no Supabase.

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
10. **Cadastro** com confirmação por e-mail.
11. **Tema**: escuro (padrão, gradiente quente no lugar da foto da referência) e claro (fundo marfim/bege). A troca fica em Configurações > Aparência (Claro / Escuro / Sistema), salva no navegador (localStorage) e aplicada por script inline antes da pintura (`src/lib/theme.ts`).
12. **Especialidades**: lista editável pela pessoa, sem modelos pré-definidos. A pessoa marca o próprio modelo padrão por especialidade (ex.: "Anamnese Pediátrica" para Pediatria), salvo na conta, e "Nova anamnese" já o sugere.
13. **Git**: repo privado `anamnese-padronizada` no GitHub (`fabianocd`). A Vercel já tem acesso ao GitHub. Push na `main` faz deploy automático. Push só quando o usuário pedir.
14. **Gemini**: chave do plano gratuito; usar o modelo Flash mais recente. Limites baixos → mensagem amigável quando a cota estourar. No plano gratuito o Google pode usar o conteúdo para treino, o que é aceitável porque só a ficha em branco é enviada.

## Para implementar no futuro

- **SMTP próprio** (ex.: Resend) no Supabase Auth: o SMTP embutido envia poucos e-mails por hora. Necessário antes de abrir o app para uma turma ou mais pessoas.
- **Upgrade do Gemini** para plano pago, se o uso crescer.
