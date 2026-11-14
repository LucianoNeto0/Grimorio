# Project instructions

- RPG sheet state lives in `src/lib/rpg/store.tsx` and persists to localStorage. Keep keys in `src/lib/rpg/storage.ts` stable so saved sheets continue to load.
- Each palette in `src/styles.css` sets only base tokens; derive other tokens with `color-mix` so custom colors stay coherent.
- AI calls belong in server functions under `src/lib/rpg/*.functions.ts`. Read provider keys only from server environment variables and return `{ ok, ... }` results for friendly UI errors.
- AI character output keeps one fact per field. Put bonuses and damage in row tags, and descriptions in `d` or the feat section. `fromAi.ts` splits overflowing text as a safety net.
- Keep API keys and other secrets out of source control and browser code. `.env` is local-only.
- Do not hand-edit generated files such as `src/routeTree.gen.ts`.
- `vite.config.ts` explicitly configures TanStack Start, Tailwind, React, and Nitro for Vercel. Preserve the custom server entry and import protection when changing it.
