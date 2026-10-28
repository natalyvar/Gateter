import { listFeed } from "../api/meows.js";
import { meowForm } from "../components/meowForm.js";
import { timeline } from "../components/timeline.js";
import { getUser, subscribe } from "../state/session.js";
import { h } from "../utils/dom.js";
import { emptyState } from "./notFound.js";

function welcomeBanner() {
  return h("section", { class: "welcome card" },
    h("p", { class: "hero__eyebrow" }, "La red social para amantes de los gatos"),
    h("h1", { class: "welcome__title" }, "Di lo que piensas en ", h("em", {}, "140"), " maullidos."),
    h("p", { class: "welcome__lead" }, "Lee lo que maúlla la manada y únete para publicar los tuyos."),
    h("div", { class: "hero__actions" },
      h("a", { href: "/registro", class: "btn btn--primary", dataset: { link: "" } }, "Crear cuenta"),
      h("a", { href: "/login", class: "btn btn--ghost", dataset: { link: "" } }, "Ya tengo cuenta"),
    ),
  );
}

function feedSkeleton() {
  return h("div", { class: "skeleton", "aria-busy": "true", "aria-label": "Cargando maullidos" },
    h("div", { class: "skeleton__block" }),
    h("div", { class: "skeleton__block" }),
    h("div", { class: "skeleton__block" }),
  );
}

/** Inicio: maullidos de todos, del más reciente al más antiguo. */
export async function feedView(outlet, { signal }) {
  document.title = "Inicio · Gateter";

  const top = h("div");
  const loading = feedSkeleton();
  outlet.append(top, h("h2", { class: "section-title" }, "Últimos maullidos"), loading);

  const feed = timeline({
    fetchPage: (cursor) => listFeed({ cursor, signal }),
    emptyText: "Todavía nadie ha maullado. ¡Sé el primero! 🐾",
    signal,
  });

  // Arriba: formulario para publicar (con sesión) o bienvenida (visitante).
  function renderTop() {
    top.replaceChildren(
      getUser() ? meowForm({ onCreated: (meow) => feed.prepend(meow) }) : welcomeBanner(),
    );
  }
  renderTop();
  const unsubscribe = subscribe(renderTop);
  signal.addEventListener("abort", unsubscribe, { once: true });

  try {
    const page = await listFeed({ signal });
    loading.replaceWith(feed.element);
    feed.render(page);
  } catch (error) {
    if (signal.aborted) return;
    loading.replaceWith(emptyState({ emoji: "😾", title: "No pudimos cargar los maullidos", text: error.message }));
  }
}
