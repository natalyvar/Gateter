import { getProfile, listMeows } from "../api/users.js";
import { meowForm } from "../components/meowForm.js";
import { timeline } from "../components/timeline.js";
import { isOwner, subscribe } from "../state/session.js";
import { h } from "../utils/dom.js";
import { presenceLabel } from "../utils/presence.js";
import { formatMonthYear } from "../utils/time.js";
import { emptyState } from "./notFound.js";

function skeleton() {
  return h("div", { class: "skeleton", "aria-busy": "true", "aria-label": "Cargando perfil" },
    h("div", { class: "skeleton__block skeleton__block--header" }),
    h("div", { class: "skeleton__block" }),
    h("div", { class: "skeleton__block" }),
  );
}

function userNotFound(username) {
  document.title = "Usuario no encontrado · Gateter";
  return emptyState({
    emoji: "😿",
    title: "Usuario no encontrado",
    text: `No existe ningún gato llamado @${username}. Revisa el nombre e inténtalo de nuevo.`,
    action: h("a", { href: "/", class: "btn btn--primary", dataset: { link: "" } }, "Volver al inicio"),
  });
}

function profileHeader(profile) {
  const count = h("strong", {}, String(profile.meows_count));
  const header = h("header", { class: "profile card" },
    h("div", { class: "profile__avatar", "aria-hidden": "true" }, profile.username.slice(0, 1).toUpperCase()),
    h("div", {},
      h("h1", { class: "profile__name" }, `@${profile.username}`),
      h("p", { class: `profile__presence${profile.is_online ? " profile__presence--online" : ""}` },
        h("span", { class: `presence-dot presence-dot--inline${profile.is_online ? " presence-dot--online" : ""}`,
          "aria-hidden": "true" }),
        presenceLabel(profile)),
      h("p", { class: "profile__meta" },
        count, " maullidos · en Gateter desde ", formatMonthYear(profile.date_joined)),
    ),
  );
  const addToCount = (delta) => (count.textContent = String(Number(count.textContent) + delta));
  return { header, addToCount };
}

export async function profileView(outlet, { params, signal }) {
  const { username } = params;
  outlet.append(skeleton());

  let profile;
  let page;
  try {
    [profile, page] = await Promise.all([
      getProfile(username, { signal }),
      listMeows(username, { signal }),
    ]);
  } catch (error) {
    if (signal.aborted) return;
    outlet.replaceChildren(
      error.isNotFound
        ? userNotFound(username)
        : emptyState({ emoji: "😾", title: "No pudimos cargar el perfil", text: error.message }),
    );
    return;
  }

  document.title = `@${profile.username} · Gateter`;

  const { header, addToCount } = profileHeader(profile);
  const meows = timeline({
    fetchPage: (cursor) => listMeows(profile.username, { cursor, signal }),
    emptyText: isOwner(profile.username)
      ? "Aún no has maullado. ¡Estrena tu perfil! 🐾"
      : "Este gato todavía no ha maullado.",
    signal,
    onDeleted: () => addToCount(-1),
  });

  // Compositor: solo en el perfil propio (requisito de la prueba).
  const composerSlot = h("div");
  function renderComposer() {
    const own = isOwner(profile.username);
    composerSlot.hidden = !own;
    composerSlot.replaceChildren(
      own
        ? meowForm({
            onCreated: (meow) => {
              meows.prepend(meow);
              addToCount(1);
            },
          })
        : "",
    );
  }
  renderComposer();
  const unsubscribe = subscribe(renderComposer);
  signal.addEventListener("abort", unsubscribe, { once: true });

  outlet.replaceChildren(header, composerSlot, meows.element);
  meows.render(page);
}
