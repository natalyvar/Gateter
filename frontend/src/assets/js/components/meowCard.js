import { h } from "../utils/dom.js";
import { formatFullDate, timeAgo } from "../utils/time.js";

export function meowCard(meow, { isNew = false } = {}) {
  const { username } = meow.author;
  return h(
    "article",
    { class: `meow${isNew ? " meow--new" : ""}` },
    h("header", { class: "meow__header" },
      h("a", { href: `/usuarios/${encodeURIComponent(username)}`, class: "meow__author", dataset: { link: "" } },
        `@${username}`),
      h("time", { class: "meow__time", datetime: meow.created_at, title: formatFullDate(meow.created_at) },
        timeAgo(meow.created_at)),
    ),
    h("p", { class: "meow__content" }, meow.content),
  );
}
