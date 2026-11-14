import { createFileRoute } from "@tanstack/react-router";

import { DiceView } from "@/components/rpg/DiceView";

export const Route = createFileRoute("/dados")({
  head: () => ({
    meta: [
      { title: "Mesa de dados — Grimório" },
      { name: "description", content: "Role d4, d6, d8, d10, d12, d20 e d100 com modificador, vantagem e histórico." },
      { property: "og:title", content: "Mesa de dados — Grimório" },
      { property: "og:description", content: "Role d4, d6, d8, d10, d12, d20 e d100 com modificador, vantagem e histórico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiceView,
});
