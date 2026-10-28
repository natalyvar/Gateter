import { h } from "../utils/dom.js";
import { meowCard } from "./meowCard.js";
import { showToast } from "./toast.js";

/**
 * Lista de maullidos con paginación "cargar más". La usan el feed de Inicio
 * y el perfil; solo cambia de dónde salen las páginas.
 *
 * @param {object} options
 * @param {(cursor: string|null) => Promise<{results: object[], next: string|null}>} options.fetchPage
 * @param {string} options.emptyText
 * @param {AbortSignal} options.signal
 * @param {(meow: object) => void} [options.onDeleted]
 */
export function timeline({ fetchPage, emptyText, signal, onDeleted }) {
  const list = h("div", { class: "timeline", "aria-live": "polite" });
  const empty = h("p", { class: "timeline__empty", hidden: true }, emptyText);
  const loadMore = h("button", { type: "button", class: "btn btn--ghost btn--block", hidden: true },
    "Cargar más maullidos");
  let nextCursor = null;

  const updateEmpty = () => {
    empty.hidden = list.querySelector(".meow:not(.meow--leaving)") !== null;
  };

  const handleDeleted = (meow) => {
    queueMicrotask(updateEmpty);
    onDeleted?.(meow);
  };

  function render(page) {
    nextCursor = page.next;
    list.append(...page.results.map((meow) => meowCard(meow, { onDeleted: handleDeleted })));
    loadMore.hidden = !nextCursor;
    updateEmpty();
  }

  loadMore.addEventListener("click", async () => {
    loadMore.disabled = true;
    try {
      render(await fetchPage(nextCursor));
    } catch (error) {
      if (!signal.aborted) showToast(error.message, { type: "error" });
    } finally {
      loadMore.disabled = false;
    }
  });

  return {
    element: h("div", { class: "timeline-wrapper" }, empty, list, loadMore),
    /** Pinta la primera página ya obtenida por la vista. */
    render,
    /** Inserta arriba un maullido recién publicado. */
    prepend(meow) {
      list.prepend(meowCard(meow, { isNew: true, onDeleted: handleDeleted }));
      updateEmpty();
    },
  };
}
