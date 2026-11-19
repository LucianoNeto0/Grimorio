# Grimório

Aplicação web e Android para criação e gerenciamento de fichas de RPG. O Grimório combina dados de personagens, rolagens, temas visuais e geração de personagens com IA em uma experiência única para jogadores e mestres.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111111)](https://react.dev/) [![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

> Projeto de portfólio em evolução, com foco em produto, integração de IA, validação de dados e distribuição multiplataforma.

## Destaques

- Criação de fichas de personagem com nome, raça, classe, nível, atributos, perícias, habilidades, itens e história.
- Geração assistida por IA a partir de uma ideia curta, sistema e nível informados pelo usuário.
- Resposta estruturada em JSON com schema explícito e validação por Zod.
- Dados de fichas e preferências visuais persistidos localmente no navegador ou no aparelho.
- Temas visuais, rolagem de dados, telas de ajuda e navegação por rotas.
- Versão web com IA e versão Android offline sem o recurso de geração por IA.
- Deploy web na Vercel e geração de APK por GitHub Actions.
- Limitação de uso da IA por IP e por cota global usando Redis REST/Upstash.

## Arquitetura resumida

A interface é construída em React com TypeScript e TanStack Start. A camada de servidor mantém as chamadas aos provedores de IA fora do cliente. O fluxo de geração valida a entrada, aplica limites de uso, chama o Gemini ou uma API compatível, extrai o JSON retornado e valida o resultado antes de entregá-lo à interface.

A configuração `vite.config.ts` diferencia os alvos de build. O build web mantém a camada de servidor e a IA; o build Android gera uma SPA estática com Capacitor, sem incluir chaves ou chamadas de IA no aplicativo.

## Tecnologias

- React 19 e TypeScript.
- TanStack Start e TanStack Router.
- Vite e Nitro com preset Vercel.
- Tailwind CSS e Radix UI.
- Google Gemini e provedores compatíveis com OpenAI, com saída JSON estruturada.
- Zod para validação de entrada e resposta.
- Redis REST/Upstash para rate limiting.
- Capacitor para empacotamento Android.
- Vitest, Testing Library, ESLint e Prettier.

## Requisitos

- Node.js 22 ou superior.
- npm ou Bun.
- Para desenvolvimento com IA: uma chave do provedor configurada no ambiente do servidor.
- Para limites de produção: Redis REST/Upstash configurado.
- Para gerar o APK localmente: Android Studio e Android SDK.

## Desenvolvimento local

```bash
git clone https://github.com/LucianoNeto0/Grimorio.git
cd Grimorio
npm install
cp .env.example .env
npm run dev
```

Nunca use variáveis `VITE_` para armazenar chaves secretas. Variáveis de provedores de IA devem permanecer no ambiente do servidor.

## Variáveis de ambiente

Consulte `.env.example` para os nomes esperados. Em produção, o rate limiting usa uma destas combinações de variáveis do Upstash:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

ou os nomes gerados pela integração:

```text
UPSTASH_REDIS_REST_KV_REST_API_URL
UPSTASH_REDIS_REST_KV_REST_API_TOKEN
```

O limite padrão é de 2 gerações por IP a cada 10 minutos, 5 gerações por IP em 24 horas e 15 gerações globais em 24 horas. O teto global pode ser ajustado com `AI_GLOBAL_DAILY_LIMIT`. Em produção, se o Redis não estiver configurado ou estiver indisponível, as chamadas de IA são bloqueadas.

## Provedores e resiliência da IA

`AI_PROVIDER_ORDER` define a prioridade (padrão: `nvidia,gemini,groq,openrouter`). Um provedor é ignorado quando sua chave ou modelo não está configurado. Gemini usa `GEMINI_MODEL` (ou, por compatibilidade, somente o primeiro valor de `GEMINI_MODELS`); os demais precisam de modelo explícito: `GROQ_MODEL`, `NVIDIA_MODEL` e `OPENROUTER_MODEL`.

O servidor tenta os provedores em série, com repetições apenas para falhas transitórias, timeout por provedor, prazo global e circuit breaker em memória por instância. Se nenhum provedor produzir uma ficha válida, a interface mostra o erro e oferece a ficha básica somente como ação explícita do usuário; ela não é apresentada como resultado da IA.

## Verificações

```bash
npm run lint
npm test
npm run build
```

## Web e Android

O projeto usa marcadores no início da primeira linha da mensagem de commit:

- `[web]`: mantém a IA e publica a versão web na Vercel.
- `[apk]`: gera a versão Android sem IA; a Vercel ignora esse commit.
- `[ambos]`: atualiza a web e gera o APK como artefato do GitHub Actions.

Se não houver marcador, a Vercel publica normalmente e o APK não é gerado. O build Android pode ser baixado em **Actions → Build APK → Artifacts**. Para a Vercel reconhecer o marcador `[apk]`, habilite **Automatically expose System Environment Variables** em **Project Settings → Environment Variables**.

Para gerar a versão Android localmente:

```bash
npm run build:apk
npm run android:open
```

O APK produzido pelo workflow é de depuração. Para distribuição na Play Store ainda é necessário configurar assinatura de release.

O alvo APK mantém as fichas no armazenamento local do aparelho e não inclui a criação por IA nem chaves de provedores.

## Segurança e privacidade

As chaves de IA não devem ser incluídas no bundle web nem no APK. A geração passa pelo servidor e o rate limiting usa um hash do endereço IP para formar as chaves do Redis. Ainda assim, não envie segredos, dados pessoais ou conteúdo privado para a aplicação sem avaliar o provedor de IA e sua política de retenção.

## Status

Aplicação funcional em evolução, com distribuição web e Android. O próximo passo natural é ampliar a cobertura de testes, adicionar uma demonstração hospedada e documentar versões dos sistemas de RPG suportados.

## Autor

Luciano Cardoso do Rêgo Neto
GitHub: [@LucianoNeto0](https://github.com/LucianoNeto0)

## Licença

Este projeto é disponibilizado publicamente para fins de demonstração e avaliação de portfólio. Todos os direitos são reservados ao autor. Consulte o arquivo `LICENSE` antes de reutilizar qualquer parte do projeto.
