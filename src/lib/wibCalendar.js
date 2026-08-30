const JAKARTA_TIME_ZONE = "Asia/Jakarta"

export function getWibDateParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).map(part => [part.type, part.value]))
  return {
    year: Number(parts.year),
    monthIndex: Number(parts.month) - 1,
    day: Number(parts.day),
  }
}

export function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

export function monthSerial(year, monthIndex) {
  return year * 12 + monthIndex
}
