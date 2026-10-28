import { ApiError } from "../api/client.js";
import { deleteMeow, updateMeow } from "../api/meows.js";
import { isOwner } from "../state/session.js";
import { h } from "../utils/dom.js";
import { formatFullDate, timeAgo } from "../utils/time.js";
import { profilePath } from "../views/paths.js";
import { charCounter } from "./charCounter.js";
import { showToast } from "./toast.js";

const errorMessage = (error) =>
  error instanceof ApiError ? error.fields.content?.[0] || error.message : error.message;

/**
 * Tarjeta de un maullido. Si es del usuario actual, permite editarlo en línea
 * y eliminarlo con confirmación. La tarjeta gestiona su propio estado y se
 * reemplaza a sí misma en el DOM, así funciona igual en el feed y en el perfil.
 *
 * @param {object} meow
 * @param {{isNew?: boolean, onDeleted?: (meow: object) => void}} [options]
 */
export function meowCard(meow, { isNew = false, onDeleted } = {}) {
  const { username } = meow.author;
  const own = isOwner(username);

  const content = h("p", { class: "meow__content" }, meow.content);
  const footer = h("div", { class: "meow__footer" });

  const article = h(
    "article",
    { class: `meow${isNew ? " meow--new" : ""}`, dataset: { meowId: meow.id } },
    h("header", { class: "meow__header" },
      h("a", { href: profilePath(username), class: "meow__author", dataset: { link: "" } }, `@${username}`),
      h("span", { class: "meow__when" },
        h("time", { class: "meow__time", datetime: meow.created_at, title: formatFullDate(meow.created_at) },
          timeAgo(meow.created_at)),
        meow.edited_at
          ? h("span", { class: "meow__edited", title: `Editado ${formatFullDate(meow.edited_at)}` }, " · editado")
          : null,
      ),
    ),
    content,
    own ? footer : null,
  );

  if (!own) return article;

  /* ------------------------------ Acciones ------------------------------ */
  function showActions() {
    footer.replaceChildren(
      h("button", { type: "button", class: "meow__action", onClick: startEdit,
        "aria-label": "Editar este maullido" }, "Editar"),
      h("button", { type: "button", class: "meow__action meow__action--danger", onClick: confirmDelete,
        "aria-label": "Eliminar este maullido" }, "Eliminar"),
    );
  }

  /* ------------------------------ Eliminar ------------------------------ */
  function confirmDelete() {
    const cancel = h("button", { type: "button", class: "btn btn--ghost btn--sm", onClick: showActions }, "Cancelar");
    const confirm = h("button", { type: "button", class: "btn btn--danger btn--sm" }, "Sí, eliminar");

    confirm.addEventListener("click", async () => {
      confirm.disabled = cancel.disabled = true;
      confirm.textContent = "Eliminando…";
      try {
        await deleteMeow(meow.id);
        article.classList.add("meow--leaving");
        article.addEventListener("animationend", () => article.remove(), { once: true });
        showToast("Maullido eliminado.");
        onDeleted?.(meow);
      } catch (error) {
        showToast(errorMessage(error), { type: "error" });
        showActions();
      }
    });

    footer.replaceChildren(
      h("span", { class: "meow__confirm-text", role: "alert" }, "¿Eliminar este maullido?"),
      cancel,
      confirm,
    );
    cancel.focus();
  }

  /* ------------------------------- Editar ------------------------------- */
  function startEdit() {
    const textarea = h("textarea", {
      class: "composer__input meow__editor",
      rows: 3,
      "aria-label": "Editar maullido",
    });
    textarea.value = meow.content;

    const save = h("button", { type: "button", class: "btn btn--primary btn--sm" }, "Guardar");
    const cancel = h("button", { type: "button", class: "btn btn--ghost btn--sm" }, "Cancelar");
    const counter = charCounter(textarea, (valid) => (save.disabled = !valid));

    function stopEdit() {
      textarea.replaceWith(content);
      showActions();
    }

    async function commit() {
      if (save.disabled) return;
      save.disabled = cancel.disabled = true;
      save.textContent = "Guardando…";
      try {
        const updated = await updateMeow(meow.id, textarea.value.trim());
        article.replaceWith(meowCard(updated, { onDeleted }));
      } catch (error) {
        showToast(errorMessage(error), { type: "error" });
        save.textContent = "Guardar";
        cancel.disabled = false;
        counter.refresh();
      }
    }

    cancel.addEventListener("click", stopEdit);
    save.addEventListener("click", commit);
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Escape") stopEdit();
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) commit();
    });

    content.replaceWith(textarea);
    footer.replaceChildren(counter.element, cancel, save);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }

  showActions();
  return article;
}
