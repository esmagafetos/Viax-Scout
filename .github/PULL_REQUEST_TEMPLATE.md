<!--
Obrigado pela contribuição! Preencha os campos abaixo para acelerar a revisão.
Use Conventional Commits no título do PR: feat:, fix:, docs:, chore:, refactor:, perf:, test:, build:, ci:
-->

## Descrição
<!-- O que este PR faz? Por que essa mudança é necessária? Inclua contexto relevante. -->

## Tipo de mudança
- [ ] 🐛 Bug fix (correção que não quebra funcionalidades existentes)
- [ ] ✨ Nova funcionalidade (não-disruptiva)
- [ ] 💥 Breaking change (correção ou feature que altera comportamento existente)
- [ ] 📝 Documentação
- [ ] 🔧 Refatoração (sem mudança de comportamento externo)
- [ ] ⚡ Performance
- [ ] 🧪 Testes
- [ ] 🛠️ Build / CI / instaladores
- [ ] 🧹 Chore / manutenção de dependências

## Issue relacionada
<!-- Closes #123 / Refs #456 -->

## Como testar
<!-- Passos claros para a pessoa revisora reproduzir e validar a mudança. -->

1.
2.
3.

## Checklist geral
- [ ] O código segue as convenções do projeto (TypeScript estrito, sem `any` injustificado)
- [ ] `pnpm run typecheck` passou sem erros
- [ ] `pnpm run build` passou sem erros (quando aplicável)
- [ ] Commits seguem [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] Título do PR é descritivo (ex.: `feat: adiciona suporte a CEP com hífen`)
- [ ] Documentação atualizada (`README.md`, `replit.md`, `.github/CONTRIBUTING.md`) quando aplicável
- [ ] Não há segredos, chaves de API, dados pessoais ou credenciais no diff
- [ ] Testei manualmente o fluxo afetado

## Checklist específico (marque o que se aplica)
- [ ] Atualizei `lib/api-spec/openapi.yaml` e rodei `pnpm --filter @workspace/api-spec run codegen`
- [ ] Atualizei o schema em `lib/db/src/schema/` e rodei `pnpm --filter @workspace/db run push`
- [ ] Mudanças no app mobile foram validadas com `expo-doctor` e build EAS local
- [ ] Mudanças nos instaladores foram testadas em ao menos um SO alvo

## Checklist de segurança (para mudanças na API ou autenticação)
- [ ] Nenhum dado sensível foi exposto em logs ou respostas de erro
- [ ] Entradas do usuário são validadas via Zod antes de atingir o banco de dados
- [ ] N/A — mudança de frontend / docs apenas

## Screenshots / Demo (se UI)
<!-- Antes / Depois, GIF, vídeo curto, etc. -->

## Notas adicionais
<!-- Trade-offs, decisões, follow-ups planejados. -->
