/**
 * scripts/scrapers/cicpa.js
 * 中国注册会计师协会 (cicpa.org.cn) → CPA
 */

const { fetchWithRetry } = require('../lib/fetch')

async function scrape() {
  console.log('[cicpa] 抓取注册会计师考试...')
  const results = []
  try {
    const html = await fetchWithRetry('https://www.cicpa.org.cn')
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    if (!text.includes('注册会计师') && !text.includes('CPA')) {
      console.log('[cicpa] ⚠ 未找到相关关键词')
      return results
    }

    const dates = []
    const re = /(\d{4})年(\d{1,2})月(\d{1,2})日/g
    let m
    while ((m = re.exec(text)) !== null) dates.push({ y: parseInt(m[1]), m: parseInt(m[2]), d: parseInt(m[3]) })

    const now = new Date()
    const exam = dates.filter(d => {
      const c = new Date(d.y, d.m - 1, d.d)
      const ctx = text.substring(Math.max(0, text.indexOf(`${d.y}年${d.m}月${d.d}日`) - 30), text.indexOf(`${d.y}年${d.m}月${d.d}日`) + 50)
      return c >= now - 86400000 * 30 && /考试|专业阶段/.test(ctx)
    }).sort((a, b) => new Date(a.y, a.m - 1, a.d) - new Date(b.y, b.m - 1, b.d))

    for (const d of exam.slice(0, 2)) {
      results.push({
        id: 'cpa',
        examDate: `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`,
        examDateNote: `${d.y}年专业阶段`,
        _source: 'cicpa'
      })
    }
    console.log(`[cicpa] ✓ ${results.length} 条`)
  } catch (err) {
    console.warn(`[cicpa] ✗ ${err.message}`)
  }
  return results
}

module.exports = { scrape }
