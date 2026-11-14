import { createFileRoute } from "@tanstack/react-router";

import { PresetsView } from "@/components/rpg/PresetsView";

export const Route = createFileRoute("/personagens")({
  head: () => ({
    meta: [
      { title: "Personagens — Grimório" },
      {
        name: "description",
        content: "Guarde seus personagens e modelos de ficha para usar quando quiser.",
      },
      { property: "og:title", content: "Personagens — Grimório" },
      {
        property: "og:description",
        content: "Guarde seus personagens e modelos de ficha para usar quando quiser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PresetsView,
});
