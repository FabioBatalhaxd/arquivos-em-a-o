import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@/components/access/SignIn";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Black Friday 26 — Painel Operacional" },
      { name: "description", content: "Acompanhamento operacional em tempo real de pedidos, expedição, transportadoras e Intelipost." },
      { property: "og:title", content: "Black Friday 26 — Painel Operacional" },
      { property: "og:description", content: "Centro de controle executivo para a operação de Black Friday 26." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <SignIn />;
}
