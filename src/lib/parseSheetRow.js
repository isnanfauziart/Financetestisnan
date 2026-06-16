import { parseRupiah } from "./sheets"

export function pickAmount(row, netIdx = 8, grossIdx = 4) {
  const net = row[netIdx]
  const gross = row[grossIdx]
  const isNumeric = (v) => v != null && /^-?[\d.,]+$/.test(String(v).trim())
  if (isNumeric(net)) {
    const n = parseRupiah(net)
    if (n > 0) return n
  }
  return parseRupiah(gross) || 0
}
