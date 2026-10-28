import { ApiError } from "../api/client.js";
import { createMeow } from "../api/meows.js";
import { h } from "../utils/dom.js";
import { countChars } from "../utils/text.js";
import { showToast } from "./toast.js";

export const MAX_LENGTH = 140;
const WARNING_THRESHOLD = 20;

/**
 * Formulario para publicar un maullido.
 * @param {{onCreated: (meow: object) => void}} options
 */
export function meowForm({ onCreated }) {
  const textarea = h("textarea", {
    id: "meow-content",
    name: "content",
    class: "composer__input",
    rows: 3,
    placeholder: "¿Qué estás maullando hoy?",
    "aria-describedby": "meow-counter",
    required: true,
  });
  const counter = h("span", { id: "meow-counter", class: "composer__counter", "aria-live": "polite" });
  const submit = h("button", { type: "submit", class: "btn btn--primary" }, "Maullar");

  function refresh() {
    const length = countChars(textarea.value);
    const remaining = MAX_LENGTH - length;
    counter.textContent = String(remaining);
    counter.classList.toggle("composer__counter--warn", remaining <= WARNING_THRESHOLD && remaining >= 0);
    counter.classList.toggle("composer__counter--over", remaining < 0);
    submit.disabled = length === 0 || remaining < 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submit.disabled) return;

    submit.disabled = true;
    submit.textContent = "Publicando…";
    try {
      const meow = await createMeow(textarea.value.trim());
      textarea.value = "";
      onCreated(meow);
    } catch (error) {
      const message = error instanceof ApiError ? error.fields.content?.[0] || error.message : error.message;
      showToast(message, { type: "error" });
    } finally {
      submit.textContent = "Maullar";
      refresh();
      textarea.focus();
    }
  }

  // Ctrl/Cmd + Enter para publicar rápido.
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) form.requestSubmit();
  });
  textarea.addEventListener("input", refresh);

  const form = h(
    "form",
    { class: "composer card", onSubmit: handleSubmit, novalidate: true },
    h("label", { for: "meow-content", class: "visually-hidden" }, "Nuevo maullido"),
    textarea,
    h("div", { class: "composer__footer" }, counter, submit),
  );

  refresh();
  return form;
}
