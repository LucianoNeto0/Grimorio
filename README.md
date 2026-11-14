# Grimório

Ficha de RPG com dados, personagens salvos, temas e criação de personagens com IA.

## Desenvolvimento local

Requisitos: Node.js e npm.

```sh
npm install
npm run dev
```

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
