/**
 * Punto de entrada del frontend: recupera la sesión, monta la navegación y
 * arranca el router.
 */
import { getSession } from "./api/auth.js";
import { mountNavbar } from "./components/navbar.js";
import { mountSidebar } from "./components/sidebar.js";
import { showToast } from "./components/toast.js";
import { defineRoutes, startRouter } from "./router.js";
import { setUser } from "./state/session.js";
import { homeView } from "./views/home.js";
import { loginView } from "./views/login.js";
import { notFoundView } from "./views/notFound.js";
import { profileView } from "./views/profile.js";
import { registerView } from "./views/register.js";

defineRoutes(
  [
    { path: "/", view: homeView },
    { path: "/login", view: loginView },
    { path: "/registro", view: registerView },
    { path: "/usuarios/:username", view: profileView },
  ],
  notFoundView,
);

async function bootstrap() {
  try {
    // También deja la cookie CSRF en el navegador para los POST posteriores.
    const { user } = await getSession();
    setUser(user);
  } catch (error) {
    showToast(error.message, { type: "error" });
  }

  mountNavbar(document.getElementById("navbar"));
  mountSidebar(document.getElementById("sidebar"), document.getElementById("sidebar-backdrop"));
  await startRouter(document.getElementById("app"));
}

bootstrap();
