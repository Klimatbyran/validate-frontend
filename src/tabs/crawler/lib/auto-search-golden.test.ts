import { describe, expect, it } from 'vitest'
import {
  hostnameMatchesExpectedWebsite,
  parseAutoSearchGoldenCsv,
} from './auto-search-golden'

describe('auto-search-golden', () => {
  it('parses expectedWebsite column', () => {
    const rows = parseAutoSearchGoldenCsv(`companyName,reportYear,country,expectedWebsite,notes
Acrinova,2025,sweden,acrinova.se,homonym test`)
    expect(rows[0]?.expectedWebsite).toBe('acrinova.se')
  })

  it('matches resolved hostname to expectedWebsite', () => {
    expect(
      hostnameMatchesExpectedWebsite(
        'https://www.acrinova.se/ir',
        'acrinova.se'
      )
    ).toBe(true)
    expect(
      hostnameMatchesExpectedWebsite('https://acrinova.com', 'acrinova.se')
    ).toBe(false)
  })
})
