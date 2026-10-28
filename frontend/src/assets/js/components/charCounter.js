import { h } from "../utils/dom.js";
import { countChars } from "../utils/text.js";

export const MAX_LENGTH = 140;
const WARNING_THRESHOLD = 20;

/**
 * Contador de caracteres restantes enlazado a un textarea.
 * Lo comparten el formulario de publicar y la edición en línea.
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {(valid: boolean) => void} [onChange] recibe si el texto es publicable.
 */
export function charCounter(textarea, onChange) {
  const element = h("span", { class: "composer__counter", "aria-live": "polite" });

  function refresh() {
    const length = countChars(textarea.value);
    const remaining = MAX_LENGTH - length;
    element.textContent = String(remaining);
    element.classList.toggle("composer__counter--warn", remaining <= WARNING_THRESHOLD && remaining >= 0);
    element.classList.toggle("composer__counter--over", remaining < 0);
    const valid = length > 0 && remaining >= 0;
    onChange?.(valid);
    return valid;
  }

  textarea.addEventListener("input", refresh);
  refresh();
  return { element, refresh };
}
