import { ApiError } from "../api/client.js";
import { createMeow } from "../api/meows.js";
import { h } from "../utils/dom.js";
import { charCounter } from "./charCounter.js";
import { showToast } from "./toast.js";

let uid = 0;

/**
 * Formulario para publicar un maullido.
 * @param {{onCreated: (meow: object) => void, placeholder?: string}} options
 */
export function meowForm({ onCreated, placeholder = "¿Qué estás maullando hoy?" }) {
  const id = `meow-content-${++uid}`;
  const textarea = h("textarea", {
    id,
    name: "content",
    class: "composer__input",
    rows: 3,
    placeholder,
    required: true,
  });
  const submit = h("button", { type: "submit", class: "btn btn--primary" }, "Maullar");
  const counter = charCounter(textarea, (valid) => (submit.disabled = !valid));
  textarea.setAttribute("aria-describedby", `${id}-counter`);
  counter.element.id = `${id}-counter`;

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
      counter.refresh();
      textarea.focus();
    }
  }

  // Ctrl/Cmd + Enter para publicar rápido.
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) form.requestSubmit();
  });

  const form = h(
    "form",
    { class: "composer card", onSubmit: handleSubmit, novalidate: true },
    h("label", { for: id, class: "visually-hidden" }, "Nuevo maullido"),
    textarea,
    h("div", { class: "composer__footer" }, counter.element, submit),
  );
  return form;
}
