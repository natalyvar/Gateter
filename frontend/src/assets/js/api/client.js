/**
 * Cliente HTTP mínimo para la API de Gateter.
 *
 * - Envía y recibe JSON.
 * - Adjunta el token CSRF de Django en los métodos que modifican estado.
 * - Normaliza los errores a ApiError (la API siempre responde {error: {...}}).
 */

const API_BASE = "/api";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export class ApiError extends Error {
  /**
   * @param {number} status Código HTTP.
   * @param {{code?: string, message?: string, fields?: Record<string, string[]>}} payload
   */
  constructor(status, payload = {}) {
    super(payload.message || "Algo salió mal. Inténtalo de nuevo.");
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code || "error";
    this.fields = payload.fields || {};
  }

  get isNotFound() {
    return this.status === 404;
  }
}

function readCookie(name) {
  const prefix = `${name}=`;
  const match = document.cookie.split("; ").find((row) => row.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const type = response.headers.get("Content-Type") || "";
  if (!type.includes("application/json")) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * @param {string} path Ruta relativa a /api, p. ej. "/auth/login/".
 * @param {{method?: string, body?: unknown, signal?: AbortSignal}} [options]
 */
export async function request(path, { method = "GET", body, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!SAFE_METHODS.has(method)) {
    const token = readCookie("csrftoken");
    if (token) headers["X-CSRFToken"] = token;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, { code: "network", message: "No hay conexión con el servidor." });
  }

  const data = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, data?.error);
  }
  return data;
}
