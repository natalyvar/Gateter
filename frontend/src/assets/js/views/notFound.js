import { h } from "../utils/dom.js";

export function emptyState({ emoji, title, text, action }) {
  return h("section", { class: "empty card" },
    h("div", { class: "empty__emoji", "aria-hidden": "true" }, emoji),
    h("h1", { class: "empty__title" }, title),
    h("p", { class: "empty__text" }, text),
    action ?? null,
  );
}

export function notFoundView(outlet) {
  document.title = "Página no encontrada · Gateter";
  outlet.append(
    emptyState({
      emoji: "🙀",
      title: "Esta página se escapó por la ventana",
      text: "La dirección que buscas no existe.",
      action: h("a", { href: "/", class: "btn btn--primary", dataset: { link: "" } }, "Volver al inicio"),
    }),
  );
}
