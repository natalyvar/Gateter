import { h } from "../utils/dom.js";

let uid = 0;

/**
 * Campo de formulario con label, ayuda y mensaje de error accesibles.
 * @returns {{element: HTMLElement, input: HTMLInputElement, setError: (msg?: string) => void}}
 */
export function formField({ label, name, type = "text", hint, ...inputAttrs }) {
  const id = `field-${name}-${++uid}`;
  const hintId = hint ? `${id}-hint` : null;
  const errorId = `${id}-error`;

  const input = h("input", {
    id,
    name,
    type,
    class: "field__input",
    "aria-describedby": [hintId, errorId].filter(Boolean).join(" "),
    ...inputAttrs,
  });
  const error = h("p", { id: errorId, class: "field__error", "aria-live": "polite" });

  const element = h(
    "div",
    { class: "field" },
    h("label", { for: id, class: "field__label" }, label),
    input,
    hint ? h("p", { id: hintId, class: "field__hint" }, hint) : null,
    error,
  );

  function setError(message = "") {
    error.textContent = message;
    input.toggleAttribute("aria-invalid", Boolean(message));
  }

  input.addEventListener("input", () => setError());
  return { element, input, setError };
}
