# ViaX:Trace Mobile (Android)

Aplicativo Android nativo (Expo / React Native) com a mesma identidade visual do ViaX:Trace web.

## Estrutura

```
app/
  _layout.tsx           # Provedores raiz (auth, query, fontes)
  index.tsx             # Login
  register.tsx          # Cadastro
  (tabs)/_layout.tsx    # Bottom tabs
  (tabs)/dashboard.tsx
  (tabs)/process.tsx    # Upload XLSX/CSV via SSE
  (tabs)/history.tsx
  (tabs)/settings.tsx
components/             # UI compartilhada (Card, Button, Input, etc.)
constants/colors.ts     # Tokens de cor (light/dark) sincronizados com viax-scout
hooks/useColors.ts
lib/api.ts              # Cliente HTTP + sessão (expo-secure-store)
lib/auth.tsx            # AuthContext
```

## Configuração da API

A URL do backend é lida da variável de ambiente `EXPO_PUBLIC_API_URL`.

- **Local**: crie `.env.local` com `EXPO_PUBLIC_API_URL=https://seu-backend.com`
- **EAS Build**: edite `eas.json` (`build.preview.env.EXPO_PUBLIC_API_URL`) ou defina `EXPO_PUBLIC_API_URL` em **GitHub → Settings → Variables → Actions**

## Build local (dev)

```bash
pnpm --filter @workspace/viax-mobile run start
```

## Build de release (APK)

O build é feito **na nuvem do Expo** via GitHub Actions:

1. Faça commit/push para `main`.
2. O workflow `.github/workflows/mobile-release.yml` dispara automaticamente.
3. EAS gera o APK e o workflow publica um **GitHub Release** com o `.apk` anexado.

### Pré-requisitos (uma vez)

- Secret `EXPO_TOKEN` no GitHub Actions (✅ já configurado).
- Variável `EXPO_PUBLIC_API_URL` em GitHub Variables apontando para o backend de produção.
- Substituir `REPLACE_WITH_YOUR_EAS_PROJECT_ID` em `app.json` pelo ID gerado no primeiro `eas init` (ou rodar `eas init` localmente uma vez para vincular o projeto).

## Notas

- Padrão de cores e raio idênticos ao web (`viax-scout`).
- Sessão persistida com `expo-secure-store` (cookie `connect.sid`).
- Upload via SSE (Server-Sent Events) consumindo o mesmo endpoint do web: `POST /api/process/upload`.
