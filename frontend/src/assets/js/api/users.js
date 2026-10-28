import { request } from "./client.js";
import { cursorQuery, extractCursor } from "./pagination.js";

const encode = (username) => encodeURIComponent(username);

/**
 * Directorio de usuarios: conectados primero, luego alfabético.
 * @returns {Promise<{count: number, results: {username: string, is_online: boolean, last_seen: string|null}[]}>}
 */
export function listUsers({ query = "", signal } = {}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  const suffix = params.size ? `?${params}` : "";
  return request(`/users/${suffix}`, { signal });
}

export const getProfile = (username, { signal } = {}) =>
  request(`/users/${encode(username)}/`, { signal });

/**
 * Lista paginada (por cursor) de maullidos de un usuario.
 * @param {string} username
 * @param {{cursor?: string | null, signal?: AbortSignal}} [options]
 * @returns {Promise<{results: object[], next: string | null}>}
 */
export async function listMeows(username, { cursor = null, signal } = {}) {
  const page = await request(`/users/${encode(username)}/meows/${cursorQuery(cursor)}`, { signal });
  return { results: page.results, next: extractCursor(page.next) };
}
