/**
 * DRF devuelve la URL absoluta de la página siguiente; solo nos interesa el
 * cursor, así no dependemos del host/puerto que vea el backend tras el proxy.
 */
export function extractCursor(nextUrl) {
  if (!nextUrl) return null;
  return new URL(nextUrl, window.location.origin).searchParams.get("cursor");
}

export const cursorQuery = (cursor) => (cursor ? `?cursor=${encodeURIComponent(cursor)}` : "");
