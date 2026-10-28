import { ApiError } from "../api/client.js";
import { h } from "../utils/dom.js";
import { formField } from "./formField.js";

/**
 * Formulario reutilizable para login y registro.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.subtitle
 * @param {Array<object>} options.fields   Definiciones para formField().
 * @param {string} options.submitLabel
 * @param {(values: Record<string,string>) => (string|Record<string,string>|null)} [options.validate]
 *        Validación local; devuelve errores por campo o null.
 * @param {(values: Record<string,string>) => Promise<void>} options.onSubmit
 * @param {HTMLElement} options.footer
 */
export function authForm({ title, subtitle, fields, submitLabel, validate, onSubmit, footer }) {
  const controls = Object.fromEntries(fields.map((field) => [field.name, formField(field)]));
  const formError = h("p", { class: "form-error", role: "alert" });
  const submit = h("button", { type: "submit", class: "btn btn--primary btn--block" }, submitLabel);

  const values = () => Object.fromEntries(Object.entries(controls).map(([name, c]) => [name, c.input.value]));

  function showErrors(errors) {
    let focused = false;
    for (const [name, message] of Object.entries(errors)) {
      const control = controls[name];
      const text = Array.isArray(message) ? message.join(" ") : message;
      if (!control) {
        formError.textContent = text;
        continue;
      }
      control.setError(text);
      if (!focused) {
        control.input.focus();
        focused = true;
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    formError.textContent = "";
    Object.values(controls).forEach((c) => c.setError());

    const localErrors = validate?.(values());
    if (localErrors && Object.keys(localErrors).length) {
      showErrors(localErrors);
      return;
    }

    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    try {
      await onSubmit(values());
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length) showErrors(error.fields);
      else formError.textContent = error.message;
    } finally {
      submit.disabled = false;
      submit.removeAttribute("aria-busy");
    }
  }

  return h(
    "section",
    { class: "auth card" },
    h("h1", { class: "auth__title" }, title),
    h("p", { class: "auth__subtitle" }, subtitle),
    h("form", { class: "auth__form", onSubmit: handleSubmit, novalidate: true },
      Object.values(controls).map((c) => c.element),
      formError,
      submit,
    ),
    h("p", { class: "auth__footer" }, footer),
  );
}
