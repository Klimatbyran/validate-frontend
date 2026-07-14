import { describe, expect, it } from "vitest";
import {
  coverTextYearVerdict,
  pickHeuristicReportCandidate,
  pickMetadataOnlyReportCandidate,
  scoreExtractedReportCandidate,
  urlMatchesCompany,
} from './auto-search-heuristic'

const EXCHANGE_FILING_FEED_DESCRIPTION =
  "Exchange filing feed (regulatory / press-release hosts)";

describe('auto-search-heuristic', () => {
  it('rejects wrong-company filing host without name overlap', () => {
    expect(
      urlMatchesCompany(
        'https://www.home.saxo/-/media/saxo-annual-report-2025.pdf',
        'Arendals Fossekompani ASA',
        'Saxo Annual Report 2025',
      ),
    ).toBe(false)
  })

  it('accepts filing-feed MFN annual report with exchange description', () => {
    expect(
      urlMatchesCompany(
        'https://storage.mfn.se/secure/123456789/123456789-annual-report-2025.pdf',
        'Arjo AB',
        'Annual Report 2025',
        EXCHANGE_FILING_FEED_DESCRIPTION,
      ),
    ).toBe(true)
  })

  it('accepts high-confidence LLM pick on trusted filing host', () => {
    expect(
      urlMatchesCompany(
        'https://storage.mfn.se/secure/123456789/123456789-annual-report-2025.pdf',
        'Arjo AB',
        'Annual Report 2025',
        undefined,
        { llmConfidence: 0.9, reportYear: '2025' },
      ),
    ).toBe(true)
  })

  it('rejects low-confidence LLM pick on trusted filing host without company overlap', () => {
    expect(
      urlMatchesCompany(
        'https://storage.mfn.se/x/attendo-ar25-eng.pdf',
        'Arjo AB',
        'Annual Report 2025',
        undefined,
        { llmConfidence: 0.5, reportYear: '2025' },
      ),
    ).toBe(false)
  })

  it('accepts ticker-named filing-host URL when cover text names the company', () => {
    // Euronext filing URL uses the "AZT" ticker, not the company name — the
    // page-1 cover text carries the identity.
    expect(
      urlMatchesCompany(
        'https://live.euronext.com/sites/default/files/company_press_releases/attachments_oslo/2026/04/30/672021_AZT_2025_ESG_report.pdf',
        'ArcticZymes Technologies ASA',
        '672021 AZT 2025 ESG report',
        'Discovered via OpenAI web search (direct PDF)',
        {
          llmConfidence: 0.9,
          reportYear: '2025',
          text: 'ArcticZymes Sustainability ESG Report 2025 ArcticZymes Technologies ASA · Tromsø, Norway',
        },
      ),
    ).toBe(true)
  })

  it('accepts company-domain annual report from metadata', () => {
    const picked = pickMetadataOnlyReportCandidate(
      [
        {
          url: 'https://www.sagax.se/sites/default/files/pr/sagax-annual-report-2025.pdf',
          title: 'Sagax annual report 2025',
        },
      ],
      'AB Sagax',
      '2025',
    )
    expect(picked?.url).toContain('sagax')
  })

  it('cover text year beats URL year (Alimak case)', () => {
    // URL/filename says 2025 but page-1 cover text says 2024.
    expect(coverTextYearVerdict('Sustainability Report 2024', '2025')).toBe(
      'adjacent',
    )
    expect(coverTextYearVerdict('Annual Report 2025', '2025')).toBe('match')
    expect(coverTextYearVerdict('', '2025')).toBe('unknown')

    const mismatched = {
      url: 'https://alimakgroup.com/media/sustainability-report-2025.pdf',
      title: 'Sustainability Report 2025',
      text: 'Alimak Group Sustainability Report 2024',
      companyName: 'Alimak Group',
      reportYear: '2025',
    }
    const matched = {
      ...mismatched,
      url: 'https://alimakgroup.com/media/annual-report.pdf',
      title: 'Annual Report',
      text: 'Alimak Group Annual Report 2025',
    }
    expect(scoreExtractedReportCandidate(matched)).toBeGreaterThan(
      scoreExtractedReportCandidate(mismatched),
    )
  })

  it('never heuristically rescues a candidate whose cover names another year', () => {
    const picked = pickHeuristicReportCandidate(
      [
        {
          url: 'https://alimakgroup.com/media/sustainability-report-2025.pdf',
          title: 'Sustainability Report 2025',
          text: 'Alimak Group Sustainability Report 2024',
        },
      ],
      'Alimak Group',
      '2025',
    )
    expect(picked).toBeNull()
  })

  it('rejects adjacent-year metadata candidate', () => {
    const picked = pickMetadataOnlyReportCandidate(
      [
        {
          url: 'https://www.aspo.com/Aspo-Annual-Report-2024.pdf',
          title: 'Annual Report 2024',
        },
      ],
      'Aspo',
      '2025',
    )
    expect(picked).toBeNull()
  })
})
