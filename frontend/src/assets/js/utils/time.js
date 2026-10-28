const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const fullDate = new Intl.DateTimeFormat("es", { dateStyle: "long", timeStyle: "short" });

const UNITS = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "hace 5 minutos", "ayer", "ahora"… */
export function timeAgo(isoDate, now = Date.now()) {
  const seconds = Math.round((new Date(isoDate).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "ahora";
}

export const formatFullDate = (isoDate) => fullDate.format(new Date(isoDate));

export const formatMonthYear = (isoDate) =>
  new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(new Date(isoDate));
