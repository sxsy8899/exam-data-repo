/**
 * scripts/scrapers/medical.js
 * 医学考试系列
 * nmec.org.cn: 执业医师(zyys)、口腔医师(kqys)
 * 21wecan.com: 护士(hs)、卫生职称(wsjs)
 * satcm.gov.cn: 中医(zky)
 */

const { fetchWithRetry } = require('../lib/fetch')

const SOURCES = [
  { id: 'zyys', name: '执业医师', url: 'https://www.nmec.org.cn', keywords: ['执业医师', '医师资格'] },
  { id: 'kqys', name: '口腔执业医师', url: 'https://www.nmec.org.cn', keywords: ['口腔', '口腔执业'] },
  { id: 'hs', name: '护士执业', url: 'https://www.21wecan.com', keywords: ['护士', '护士执业'] },
  { id: 'wsjs', name: '卫生专业技术资格', url: 'https://www.21wecan.com', keywords: ['卫生专业技术', '卫生职称'] },
  { id: 'zky', name: '中医执业医师', url: 'http://www.satcm.gov.cn', keywords: ['中医', '中医执业', '中医类别'] }
]

const DATE_RE = /(\d{4})年(\d{1,2})月(\d{1,2})日/g

async function scrape() {
  console.log('[medical] 抓取医学考试...'); const results = []
  for (const src of SOURCES) {
    console.log(`[medical]   ${src.name}`)
    try {
      const html = await fetchWithRetry(src.url); const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
      if (!src.keywords.some(kw => text.includes(kw))) { console.log(`[medical]     ⚠ 无关`); continue }
      const dates = []; let m
      while ((m = DATE_RE.exec(text)) !== null) dates.push({ y: parseInt(m[1]), m: parseInt(m[2]), d: parseInt(m[3]) })
      DATE_RE.lastIndex = 0
      const now = new Date()
      const future = dates.filter(d => new Date(d.y, d.m - 1, d.d) >= now - 86400000 * 30)
        .sort((a, b) => new Date(a.y, a.m - 1, a.d) - new Date(b.y, b.m - 1, b.d)).slice(0, 2)
      for (const d of future) results.push({
        id: src.id, examDate: `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`,
        examDateNote: `${d.y}年`, officialSite: src.url, _source: 'medical'
      })
      console.log(`[medical]     ✓ ${future.length} 条`)
    } catch (err) { console.warn(`[medical]     ✗ ${src.id}: ${err.message}`) }
  }
  console.log(`[medical] 完成，共 ${results.length} 条`); return results
}

module.exports = { scrape }
