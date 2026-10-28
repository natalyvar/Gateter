import { login } from "../api/auth.js";
import { authForm } from "../components/authForm.js";
import { navigate } from "../router.js";
import { getUser, setUser } from "../state/session.js";
import { h } from "../utils/dom.js";

export function loginView(outlet) {
  if (getUser()) return navigate("/", { replace: true });

  document.title = "Entrar · Gateter";
  outlet.append(
    authForm({
      title: "¡Hola de nuevo!",
      subtitle: "Entra para seguir maullando.",
      submitLabel: "Entrar",
      fields: [
        { label: "Nombre de usuario", name: "username", autocomplete: "username", required: true },
        { label: "Contraseña", name: "password", type: "password", autocomplete: "current-password", required: true },
      ],
      validate: ({ username, password }) => {
        const errors = {};
        if (!username.trim()) errors.username = "Escribe tu nombre de usuario.";
        if (!password) errors.password = "Escribe tu contraseña.";
        return errors;
      },
      onSubmit: async ({ username, password }) => {
        const data = await login(username.trim(), password);
        setUser(data.user);
        navigate("/");
      },
      footer: h("span", {}, "¿Aún no tienes cuenta? ",
        h("a", { href: "/registro", dataset: { link: "" } }, "Regístrate")),
    }),
  );
}
