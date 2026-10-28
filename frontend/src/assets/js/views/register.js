import { register } from "../api/auth.js";
import { authForm } from "../components/authForm.js";
import { showToast } from "../components/toast.js";
import { navigate } from "../router.js";
import { getUser, setUser } from "../state/session.js";
import { h } from "../utils/dom.js";
import { profilePath } from "./paths.js";

const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/;

export function registerView(outlet) {
  const user = getUser();
  if (user) return navigate(profilePath(user.username), { replace: true });

  document.title = "Crear cuenta · Gateter";
  outlet.append(
    authForm({
      title: "Únete a la manada",
      subtitle: "Crea tu cuenta y publica tu primer maullido.",
      submitLabel: "Crear cuenta",
      fields: [
        {
          label: "Nombre de usuario",
          name: "username",
          autocomplete: "username",
          hint: "3 a 30 caracteres: letras, números o _",
          required: true,
          maxlength: 30,
        },
        {
          label: "Contraseña",
          name: "password",
          type: "password",
          autocomplete: "new-password",
          hint: "Mínimo 8 caracteres, que no sea solo números ni demasiado común.",
          required: true,
        },
        { label: "Repite la contraseña", name: "password2", type: "password", autocomplete: "new-password", required: true },
      ],
      validate: ({ username, password, password2 }) => {
        const errors = {};
        if (!USERNAME_RE.test(username.trim())) errors.username = "Usa 3 a 30 letras, números o guion bajo.";
        if (password.length < 8) errors.password = "La contraseña debe tener al menos 8 caracteres.";
        else if (password !== password2) errors.password2 = "Las contraseñas no coinciden.";
        return errors;
      },
      onSubmit: async ({ username, password }) => {
        // El backend inicia la sesión automáticamente al registrarse.
        const data = await register(username.trim(), password);
        setUser(data.user);
        showToast(`¡Bienvenido/a, @${data.user.username}! 😺`, { type: "success" });
        navigate(profilePath(data.user.username));
      },
      footer: h("span", {}, "¿Ya tienes cuenta? ", h("a", { href: "/login", dataset: { link: "" } }, "Entra")),
    }),
  );
}
