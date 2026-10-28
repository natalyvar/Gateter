import { navigate } from "../router.js";
import { getUser } from "../state/session.js";
import { h } from "../utils/dom.js";
import { profilePath } from "./paths.js";

export function homeView(outlet) {
  const user = getUser();
  if (user) return navigate(profilePath(user.username), { replace: true });

  document.title = "Gateter · La red social de los gatos";

  const search = h("input", {
    class: "field__input",
    name: "username",
    placeholder: "nombre de usuario",
    "aria-label": "Buscar perfil por nombre de usuario",
    autocomplete: "off",
    required: true,
  });

  const onSearch = (event) => {
    event.preventDefault();
    const username = search.value.trim().replace(/^@/, "");
    if (username) navigate(profilePath(username));
  };

  outlet.append(
    h("section", { class: "hero" },
      h("p", { class: "hero__eyebrow" }, "La red social para amantes de los gatos"),
      h("h1", { class: "hero__title" }, "Di lo que piensas en ", h("em", {}, "140"), " maullidos."),
      h("p", { class: "hero__lead" },
        "Publica mensajes cortos, mira el perfil de cualquier gato de la manada y comparte tu día ronroneo a ronroneo."),
      h("div", { class: "hero__actions" },
        h("a", { href: "/registro", class: "btn btn--primary btn--lg", dataset: { link: "" } }, "Crear cuenta"),
        h("a", { href: "/login", class: "btn btn--ghost btn--lg", dataset: { link: "" } }, "Ya tengo cuenta"),
      ),
      h("form", { class: "hero__search", onSubmit: onSearch },
        h("span", { class: "hero__at", "aria-hidden": "true" }, "@"),
        search,
        h("button", { type: "submit", class: "btn btn--ghost" }, "Ver perfil"),
      ),
    ),
  );
}
