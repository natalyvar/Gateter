import { timeAgo } from "./time.js";

// Al cerrar sesión el backend adelanta la marca de actividad para que el
// usuario salga de "en línea" al instante; por eso no mostramos minutos exactos
// para actividad muy reciente.
const RECENT_MS = 5 * 60 * 1000;

/** Texto corto de presencia: "En línea", "Activo hace un momento", "Activo hace 3 horas"… */
export function presenceLabel({ is_online: isOnline, last_seen: lastSeen }, now = Date.now()) {
  if (isOnline) return "En línea";
  if (!lastSeen) return "Sin actividad reciente";
  if (now - new Date(lastSeen).getTime() < RECENT_MS) return "Activo hace un momento";
  return `Activo ${timeAgo(lastSeen, now)}`;
}
