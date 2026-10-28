import { timeAgo } from "./time.js";
const RECENT_MS = 5 * 60 * 1000;

export function presenceLabel({ is_online: isOnline, last_seen: lastSeen }, now = Date.now()) {
  if (isOnline) return "En línea";
  if (!lastSeen) return "Sin actividad reciente";
  if (now - new Date(lastSeen).getTime() < RECENT_MS) return "Activo hace un momento";
  return `Activo ${timeAgo(lastSeen, now)}`;
}
