<!--
Obrigado pela contribuição! Preencha os campos abaixo para acelerar a revisão.
Use Conventional Commits no título do PR: feat:, fix:, docs:, chore:, refactor:, perf:, test:, build:, ci:
-->

## Descrição
<!-- O que este PR faz? Por que essa mudança é necessária? -->

## Tipo de mudança
- [ ] 🐛 Bug fix (mudança não-disruptiva que corrige um problema)
- [ ] ✨ Nova funcionalidade (mudança não-disruptiva que adiciona algo novo)
- [ ] 💥 Breaking change (correção ou funcionalidade que quebra compatibilidade)
- [ ] 📝 Documentação
- [ ] 🔧 Refatoração / melhoria interna
- [ ] ⚡ Performance
- [ ] 🧪 Testes
- [ ] 🛠️ Build / CI / instaladores

## Issue relacionada
<!-- Closes #123 / Refs #456 -->

## Como testar
<!-- Passos claros para a pessoa revisora reproduzir e validar a mudança. -->

1.
2.
3.

## Checklist
- [ ] Meu código segue o estilo do projeto e passou em `pnpm run typecheck`
- [ ] Atualizei o `openapi.yaml` e rodei `pnpm --filter @workspace/api-spec run codegen` (se mudei a API)
- [ ] Atualizei o schema com `pnpm --filter @workspace/db run push` (se mudei o banco)
- [ ] Atualizei a documentação (`README.md`, `replit.md`, ou docs internos) quando aplicável
- [ ] Não há segredos, chaves de API, dados pessoais ou credenciais no diff
- [ ] Testei manualmente o fluxo afetado

## Screenshots / Demo (se UI)
<!-- Antes / Depois, GIF, vídeo curto, etc. -->

## Notas adicionais
<!-- Qualquer contexto relevante para o revisor: trade-offs, decisões, follow-ups planejados. -->
