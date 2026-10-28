import { h } from "../utils/dom.js";

const region = () => document.getElementById("toasts");

/** Notificación efímera y accesible (role="status" en el contenedor). */
export function showToast(message, { type = "info", duration = 4000 } = {}) {
  const toast = h("div", { class: `toast toast--${type}` }, message);
  region().append(toast);
  setTimeout(() => {
    toast.classList.add("toast--leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, duration);
}
