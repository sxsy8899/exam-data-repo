/**
 * scripts/scrapers/guokao.js
 * 国家公务员考试 (scs.gov.cn)
 */

const { fetchWithRetry } = require('../lib/fetch')

async function scrape() {
  console.log('[guokao] 抓取国家公务员考试...')
  const results = []
  try {
    const html = await fetchWithRetry('http://www.scs.gov.cn')
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    if (!text.includes('公务员') && !text.includes('录用') && !text.includes('国考')) {
      console.log('[guokao] ⚠ 未找到相关关键词'); return results
    }

    const dates = []; const re = /(\d{4})年(\d{1,2})月(\d{1,2})日/g; let m
    while ((m = re.exec(text)) !== null) dates.push({ y: parseInt(m[1]), m: parseInt(m[2]), d: parseInt(m[3]) })

    const now = new Date()
    const future = dates
      .filter(d => new Date(d.y, d.m - 1, d.d) >= now - 86400000 * 30)
      .sort((a, b) => new Date(a.y, a.m - 1, a.d) - new Date(b.y, b.m - 1, b.d))
      .slice(0, 2)

    for (const d of future) {
      const season = d.m <= 6 ? '上半年' : '下半年'
      results.push({
        id: 'guokao',
        examDate: `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`,
        examDateNote: `${d.y}年${season}`,
        _source: 'guokao'
      })
    }
    console.log(`[guokao] ✓ ${results.length} 条`)
  } catch (err) { console.warn(`[guokao] ✗ ${err.message}`) }
  return results
}

module.exports = { scrape }
