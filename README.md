# Grimório

Ficha de RPG com dados, personagens salvos, temas e criação de personagens com IA.

## Desenvolvimento local

Requisitos: Node.js e npm.

```sh
npm install
npm run dev
```

## Versões e commits

O mesmo repositório gera as duas versões:

- `[web] ...`: mantém a IA e publica na Vercel. A branch `main` continua sendo a branch de produção.
- `[apk] ...`: gera a versão Android sem IA. A Vercel ignora esse commit.
- `[ambos] ...`: atualiza a versão web e gera um APK como artefato do GitHub Actions.

Use esses marcadores no início da primeira linha do commit. Se não houver marcador, a Vercel publica normalmente e o APK não é gerado. O build Android pode ser baixado em **Actions → Build APK → Artifacts**. O APK do workflow é de depuração; para publicar na Play Store ainda será necessário configurar assinatura de release.

Para a Vercel reconhecer o marcador `[apk]`, confirme em **Project Settings → Environment Variables** que **Automatically expose System Environment Variables** está habilitado. O `ignoreCommand` do `vercel.json` usa `VERCEL_GIT_COMMIT_MESSAGE`; se o marcador não estiver disponível, o comportamento seguro é continuar o deploy web.

### Gerar o APK localmente

Requer Android Studio, Android SDK e Node.js 22 ou superior.

```sh
npm run build:apk
npm run android:open
```

O alvo APK usa uma shell SPA estática, mantém as fichas no armazenamento local do aparelho e não inclui o recurso de criação com IA. O emblema da aplicação também é usado como ícone Android; para gerar os tamanhos nativos de novo, execute `npm run android:icons`. O build web mantém a IA no servidor da Vercel; nenhuma chave Gemini é incluída no APK.

Para limitar o uso da IA, crie um banco Redis REST na Upstash e configure as variaveis REST do Upstash na Vercel. O servidor aceita `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` e os nomes gerados pela integracao `UPSTASH_REDIS_REST_KV_REST_API_URL`/`UPSTASH_REDIS_REST_KV_REST_API_TOKEN`. O limite padrao e 2 geracoes por IP a cada 10 minutos, 5 por IP por janela de 24 horas e 15 geracoes globais por janela de 24 horas. Ajuste o teto global com `AI_GLOBAL_DAILY_LIMIT`. Em producao, sem Redis configurado ou disponivel, as chamadas de IA sao bloqueadas.

Configure as chaves dos provedores de IA no `.env` local. Não use variáveis `VITE_` para segredos.

## Verificações

```sh
npm run lint
npm test
npm run build
```

## Tecnologias

- TanStack Start
- React e TypeScript
- Tailwind CSS
