import { createFileRoute } from "@tanstack/react-router";

import { SheetView } from "@/components/rpg/SheetView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grimório — Sua ficha de RPG" },
      {
        name: "description",
        content:
          "Ficha de RPG editável com atributos, barras de vida e mana, itens e criação de personagem com IA.",
      },
      { property: "og:title", content: "Grimório — Sua ficha de RPG" },
      {
        property: "og:description",
        content:
          "Ficha de RPG editável com atributos, barras de vida e mana, itens e criação de personagem com IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SheetView,
});
