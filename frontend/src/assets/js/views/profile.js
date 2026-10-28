import { getProfile, listMeows } from "../api/users.js";
import { meowCard } from "../components/meowCard.js";
import { meowForm } from "../components/meowForm.js";
import { showToast } from "../components/toast.js";
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
  return { header, incrementCount: () => (count.textContent = String(Number(count.textContent) + 1)) };
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

  const { header, incrementCount } = profileHeader(profile);
  const list = h("div", { class: "timeline", "aria-live": "polite" });
  const emptyTimeline = h("p", { class: "timeline__empty" },
    isOwner(profile.username) ? "Aún no has maullado. ¡Estrena tu perfil! 🐾" : "Este gato todavía no ha maullado.");
  const composerSlot = h("div");

  // --- Timeline con paginación "cargar más" -------------------------------
  let nextCursor = page.next;
  const loadMore = h("button", { type: "button", class: "btn btn--ghost btn--block" }, "Cargar más maullidos");

  function appendMeows(meows) {
    list.append(...meows.map((meow) => meowCard(meow)));
    loadMore.hidden = !nextCursor;
    emptyTimeline.hidden = list.childElementCount > 0;
  }

  loadMore.addEventListener("click", async () => {
    loadMore.disabled = true;
    try {
      const next = await listMeows(profile.username, { cursor: nextCursor, signal });
      nextCursor = next.next;
      appendMeows(next.results);
    } catch (error) {
      if (!signal.aborted) showToast(error.message, { type: "error" });
    } finally {
      loadMore.disabled = false;
    }
  });

  // --- Compositor: solo en el perfil propio --------------------------------
  function renderComposer() {
    composerSlot.hidden = !isOwner(profile.username);
    composerSlot.replaceChildren(
      isOwner(profile.username)
        ? meowForm({
            onCreated: (meow) => {
              list.prepend(meowCard(meow, { isNew: true }));
              emptyTimeline.hidden = true;
              incrementCount();
            },
          })
        : "",
    );
  }
  renderComposer();
  const unsubscribe = subscribe(renderComposer);
  signal.addEventListener("abort", unsubscribe, { once: true });

  outlet.replaceChildren(header, composerSlot, emptyTimeline, list, loadMore);
  appendMeows(page.results);
}
