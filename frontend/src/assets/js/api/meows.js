import { request } from "./client.js";
import { cursorQuery, extractCursor } from "./pagination.js";

/** Feed global paginado por cursor. */
export async function listFeed({ cursor = null, signal } = {}) {
  const page = await request(`/meows/${cursorQuery(cursor)}`, { signal });
  return { results: page.results, next: extractCursor(page.next) };
}

export const createMeow = (content) => request("/meows/", { method: "POST", body: { content } });

export const updateMeow = (id, content) => request(`/meows/${id}/`, { method: "PATCH", body: { content } });

export const deleteMeow = (id) => request(`/meows/${id}/`, { method: "DELETE" });
