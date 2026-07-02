/**
 * scripts/scrapers/sac-tax.js
 * 证券从业(sac.net.cn) + 税务师(cctaa.cn) + ruankao.org.cn(软考)
 */

const { fetchWithRetry } = require('../lib/fetch')

const SOURCES = [
  { id: 'sec', name: '证券从业', url: 'https://www.sac.net.cn', keywords: ['证券从业', '证券从业资格', '证券'] },
  { id: 'tax', name: '税务师', url: 'https://www.cctaa.cn', keywords: ['税务师', '税务师考试'] },
  { id: 'ruankao', name: '计算机软考', url: 'https://www.ruankao.org.cn', keywords: ['软考', '计算机技术与软件', '计算机专业技术'] }
]

const DATE_RE = /(\d{4})年(\d{1,2})月(\d{1,2})日/g

async function scrape() {
  console.log('[sac-tax] 抓取证券/税务师/软考...'); const results = []
  for (const src of SOURCES) {
    console.log(`[sac-tax]   ${src.name}`)
    try {
      const html = await fetchWithRetry(src.url); const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
      if (!src.keywords.some(kw => text.includes(kw))) { console.log(`[sac-tax]     ⚠ 无关`); continue }
      const dates = []; let m
      while ((m = DATE_RE.exec(text)) !== null) dates.push({ y: parseInt(m[1]), m: parseInt(m[2]), d: parseInt(m[3]) })
      DATE_RE.lastIndex = 0
      const now = new Date()
      const future = dates.filter(d => new Date(d.y, d.m - 1, d.d) >= now - 86400000 * 30)
        .sort((a, b) => new Date(a.y, a.m - 1, a.d) - new Date(b.y, b.m - 1, b.d)).slice(0, 2)
      for (const d of future) results.push({
        id: src.id, examDate: `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`,
        examDateNote: `${d.y}年`, officialSite: src.url, _source: 'sac-tax'
      })
      console.log(`[sac-tax]     ✓ ${future.length} 条`)
    } catch (err) { console.warn(`[sac-tax]     ✗ ${src.id}: ${err.message}`) }
  }
  console.log(`[sac-tax] 完成，共 ${results.length} 条`); return results
}

module.exports = { scrape }
