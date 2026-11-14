import { createFileRoute } from "@tanstack/react-router";

import { ThemeView } from "@/components/rpg/ThemeView";

export const Route = createFileRoute("/visual")({
  head: () => ({
    meta: [
      { title: "Visual — Grimório" },
      { name: "description", content: "Escolha temas, cores e imagem de fundo para a sua ficha de RPG." },
      { property: "og:title", content: "Visual — Grimório" },
      { property: "og:description", content: "Escolha temas, cores e imagem de fundo para a sua ficha de RPG." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThemeView,
});
