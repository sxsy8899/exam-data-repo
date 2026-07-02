/**
 * scripts/scrapers/mof-juris.js
 * 财政部(kjs.mof.gov.cn) + 司法部(moj.gov.cn)
 * junior-accountant, mid-accountant, legal(法考)
 */

const { fetchWithRetry } = require('../lib/fetch')

const SOURCES = [
  {
    site: 'moj',
    id: 'legal',
    name: '法律职业资格考试',
    url: 'https://www.moj.gov.cn',
    keywords: ['法律职业资格', '法考', '司法考试']
  },
  {
    site: 'kjs',
    id: 'junior-accountant',
    name: '初级会计职称',
    url: 'http://kjs.mof.gov.cn',
    keywords: ['初级会计', '会计专业技术初级']
  },
  {
    site: 'kjs',
    id: 'mid-accountant',
    name: '中级会计职称',
    url: 'http://kjs.mof.gov.cn',
    keywords: ['中级会计', '会计专业技术中级']
  }
]

const DATE_RE = /(\d{4})年(\d{1,2})月(\d{1,2})日/g

async function scrape() {
  console.log('[mof-juris] 抓取财政部/司法部考试...')
  const results = []

  for (const src of SOURCES) {
    console.log(`[mof-juris]   ${src.name}`)
    try {
      const html = await fetchWithRetry(src.url)
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
      if (!src.keywords.some(kw => text.includes(kw))) { console.log(`[mof-juris]     ⚠ 无关`); continue }

      const dates = []; let m
      while ((m = DATE_RE.exec(text)) !== null) dates.push({ y: parseInt(m[1]), m: parseInt(m[2]), d: parseInt(m[3]) })
      DATE_RE.lastIndex = 0

      const now = new Date()
      const future = dates.filter(d => new Date(d.y, d.m - 1, d.d) >= now - 86400000 * 30)
        .sort((a, b) => new Date(a.y, a.m - 1, a.d) - new Date(b.y, b.m - 1, b.d)).slice(0, 2)

      for (const d of future) {
        results.push({
          id: src.id,
          examDate: `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`,
          examDateNote: `${d.y}年`,
          officialSite: src.url,
          _source: src.site
        })
      }
      console.log(`[mof-juris]     ✓ ${future.length} 条`)
    } catch (err) { console.warn(`[mof-juris]     ✗ ${src.id}: ${err.message}`) }
  }
  console.log(`[mof-juris] 完成，共 ${results.length} 条`)
  return results
}

module.exports = { scrape }
