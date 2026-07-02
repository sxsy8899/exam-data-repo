/**
 * scripts/scrapers/osta.js
 * 技能人才评价 (osta.org.cn)
 * hr/人力资源管理师、zg/电工、wxbg/网商运营、wlly/物流员
 * 注：osta.org.cn 主要发布技能等级认定通知，部分已下放到各省人社厅
 */

const { fetchWithRetry } = require('../lib/fetch')

const SOURCES = [
  { id: 'hr', name: '人力资源管理师', keywords: ['人力资源管理', '人力资源'] },
  { id: 'zg', name: '电工等级', keywords: ['电工', '电工等级'] },
  { id: 'wxbg', name: '网商运营', keywords: ['网商', '电子商务'] },
  { id: 'wlly', name: '物流员', keywords: ['物流', '物流服务'] }
]

const DATE_RE = /(\d{4})年(\d{1,2})月(\d{1,2})日/g

async function scrape() {
  console.log('[osta] 抓取技能人才评价考试...'); const results = []

  // osta.org.cn 可能不可达，尝试主域名
  const urls = ['http://www.osta.org.cn', 'https://www.osta.org.cn']

  for (const url of urls) {
    try {
      const html = await fetchWithRetry(url)
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

      for (const src of SOURCES) {
        if (!src.keywords.some(kw => text.includes(kw))) continue
        const dates = []; let m
        while ((m = DATE_RE.exec(text)) !== null) dates.push({ y: parseInt(m[1]), m: parseInt(m[2]), d: parseInt(m[3]) })
        DATE_RE.lastIndex = 0
        const now = new Date()
        const future = dates.filter(d => new Date(d.y, d.m - 1, d.d) >= now - 86400000 * 86400)
          .sort((a, b) => new Date(a.y, a.m - 1, a.d) - new Date(b.y, b.m - 1, b.d)).slice(0, 2)

        for (const d of future) results.push({
          id: src.id, examDate: `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`,
          examDateNote: `${d.y}年`, _source: 'osta'
        })
      }
      if (results.length > 0) break
    } catch (err) { /* try next */ }
  }

  console.log(`[osta] 完成，共 ${results.length} 条 (注：osta.org.cn 可能需各省人社厅数据补充)`)
  return results
}

module.exports = { scrape }
