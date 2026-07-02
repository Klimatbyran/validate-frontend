/**
 * Parse auto-search golden CSV rows (includes optional expectedWebsite for domain eval).
 */
export type AutoSearchGoldenRow = {
  companyName: string
  reportYear: string
  country?: string
  expectedWebsite?: string
  notes?: string
}

export function parseAutoSearchGoldenCsv(text: string): AutoSearchGoldenRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const header = lines[0].split(',').map((h) => h.trim())
  const rows: AutoSearchGoldenRow[] = []

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const values = line.split(',')
    const record: Record<string, string> = {}
    header.forEach((key, i) => {
      record[key] = values[i]?.trim() ?? ''
    })

    rows.push({
      companyName: record.companyName ?? '',
      reportYear: record.reportYear ?? '',
      country: record.country || undefined,
      expectedWebsite: record.expectedWebsite || undefined,
      notes: record.notes || undefined,
    })
  }

  return rows.filter((row) => row.companyName && row.reportYear)
}

export function hostnameMatchesExpectedWebsite(
  resolvedUrl: string | null | undefined,
  expectedWebsite: string
): boolean {
  if (!resolvedUrl?.trim() || !expectedWebsite.trim()) return false
  try {
    const host = new URL(resolvedUrl).hostname.replace(/^www\./, '').toLowerCase()
    const want = expectedWebsite.replace(/^www\./, '').toLowerCase()
    return host === want || host.endsWith(`.${want}`) || want.endsWith(host)
  } catch {
    return false
  }
}
