import { logout } from "../api/auth.js";
import { navigate } from "../router.js";
import { getUser, setUser, subscribe } from "../state/session.js";
import { h } from "../utils/dom.js";
import { toggleSidebar } from "./sidebar.js";
import { showToast } from "./toast.js";

async function handleLogout() {
  try {
    await logout();
    setUser(null);
    showToast("Has cerrado sesión. ¡Hasta pronto! 🐾");
    navigate("/");
  } catch (error) {
    showToast(error.message, { type: "error" });
  }
}

function renderLinks(user) {
  if (user) {
    return [
      h("a", { href: `/usuarios/${encodeURIComponent(user.username)}`, class: "nav__link", dataset: { link: "" } },
        `@${user.username}`),
      h("button", { type: "button", class: "btn btn--ghost", onClick: handleLogout }, "Salir"),
    ];
  }
  return [
    h("a", { href: "/login", class: "nav__link", dataset: { link: "" } }, "Entrar"),
    h("a", { href: "/registro", class: "btn btn--primary", dataset: { link: "" } }, "Crear cuenta"),
  ];
}

export function mountNavbar(container) {
  const actions = h("div", { class: "nav__actions" });
  const update = (user) => actions.replaceChildren(...renderLinks(user));

  container.replaceChildren(
    h("nav", { class: "nav", "aria-label": "Principal" },
      h("div", { class: "nav__start" },
        h("button", {
          type: "button",
          class: "btn btn--ghost nav__menu",
          "aria-controls": "sidebar",
          "aria-label": "Ver gatos de Gateter",
          onClick: () => toggleSidebar(),
        }, "👥"),
        h("a", { href: "/", class: "nav__brand", dataset: { link: "" } },
          h("span", { class: "nav__logo", "aria-hidden": "true" }, "🐈‍⬛"), "Gateter"),
      ),
      actions,
    ),
  );

  update(getUser());
  subscribe(update);
}
