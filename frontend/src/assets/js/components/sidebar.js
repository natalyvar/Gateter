import { listUsers } from "../api/users.js";
import { navigate } from "../router.js";
import { getUser, subscribe } from "../state/session.js";
import { h } from "../utils/dom.js";
import { presenceLabel } from "../utils/presence.js";
import { profilePath } from "../views/paths.js";

const POLL_INTERVAL_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 250;
const MOBILE_QUERY = window.matchMedia("(max-width: 900px)");

let sidebarEl = null;
let backdropEl = null;

/* ---------------------------------------------------------------------------
 * Drawer en móvil
 * ------------------------------------------------------------------------- */
export function toggleSidebar(force) {
  const open = force ?? !document.body.classList.contains("sidebar-open");
  document.body.classList.toggle("sidebar-open", open);
  backdropEl.hidden = !open;
  if (open) sidebarEl.querySelector("input")?.focus();
}

const closeOnMobile = () => MOBILE_QUERY.matches && toggleSidebar(false);

/* ---------------------------------------------------------------------------
 * Ítems de la lista
 * ------------------------------------------------------------------------- */
function isCurrentPath(username) {
  const match = /^\/usuarios\/([^/]+)\/?$/.exec(window.location.pathname);
  return match !== null && decodeURIComponent(match[1]).toLowerCase() === username.toLowerCase();
}

function userItem(user) {
  const me = getUser();
  const isMe = me !== null && me.username.toLowerCase() === user.username.toLowerCase();
  const label = presenceLabel(user);

  return h("li", {},
    h("a", {
      href: profilePath(user.username),
      class: "people__item",
      dataset: { link: "", username: user.username.toLowerCase() },
      "aria-current": isCurrentPath(user.username) ? "page" : null,
    },
      h("span", { class: "people__avatar", "aria-hidden": "true" },
        user.username.slice(0, 1).toUpperCase(),
        h("span", { class: `presence-dot${user.is_online ? " presence-dot--online" : ""}` }),
      ),
      h("span", { class: "people__text" },
        h("span", { class: "people__name" }, `@${user.username}`, isMe ? h("span", { class: "people__me" }, " (tú)") : null),
        h("span", { class: "people__status" }, label),
      ),
      h("span", { class: "visually-hidden" }, `, ${label}`),
    ),
  );
}

/* ---------------------------------------------------------------------------
 * Componente
 * ------------------------------------------------------------------------- */
export function mountSidebar(container, backdrop) {
  sidebarEl = container;
  backdropEl = backdrop;

  const search = h("input", {
    type: "search",
    class: "field__input people__search",
    placeholder: "Buscar gatos…",
    "aria-label": "Buscar usuarios por nombre",
    autocomplete: "off",
    maxlength: 30,
    spellcheck: "false",
  });
  const onlineBadge = h("span", { class: "people__badge", hidden: true });
  const list = h("ul", { class: "people__list", "aria-live": "polite" });
  const status = h("p", { class: "people__empty", hidden: true });

  let query = "";
  let controller = null;
  let debounceTimer = null;
  let pollTimer = null;

  function render(users) {
    list.replaceChildren(...users.map(userItem));

    const online = users.filter((u) => u.is_online).length;
    onlineBadge.textContent = `${online} en línea`;
    onlineBadge.hidden = online === 0;

    status.hidden = users.length > 0;
    status.textContent = query ? `Ningún gato coincide con “${query}”.` : "Aún no hay usuarios.";
  }

  async function load() {
    controller?.abort();
    controller = new AbortController();
    try {
      const page = await listUsers({ query, signal: controller.signal });
      render(page.results);
    } catch (error) {
      if (error.name === "AbortError") return;
      status.hidden = false;
      status.textContent = "No se pudo cargar la lista de usuarios.";
    }
  }

  // Búsqueda con debounce; Enter abre el primer resultado.
  search.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      query = search.value.trim().replace(/^@/, "");
      load();
    }, SEARCH_DEBOUNCE_MS);
  });
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const first = list.querySelector("a");
      if (first) navigate(first.getAttribute("href"));
    } else if (event.key === "Escape") {
      closeOnMobile();
    }
  });

  // Presencia: refresco periódico solo con la pestaña visible.
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(load, POLL_INTERVAL_MS);
  }
  function stopPolling() {
    clearInterval(pollTimer);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopPolling();
    else {
      load();
      startPolling();
    }
  });

  // Resalta el perfil abierto y cierra el drawer al navegar.
  window.addEventListener("routechange", () => {
    list.querySelectorAll("a[data-username]").forEach((a) => {
      if (isCurrentPath(a.dataset.username)) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    closeOnMobile();
  });

  // Al entrar/salir cambia quién es "tú" y el propio estado de conexión.
  subscribe(load);

  backdrop.addEventListener("click", () => toggleSidebar(false));
  MOBILE_QUERY.addEventListener("change", (e) => !e.matches && toggleSidebar(false));

  container.replaceChildren(
    h("div", { class: "people" },
      h("div", { class: "people__header" },
        h("h2", { class: "people__title" }, "Gatos"),
        onlineBadge,
      ),
      search,
      list,
      status,
    ),
  );

  load();
  startPolling();
}
