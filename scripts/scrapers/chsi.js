/**
 * scripts/scrapers/chsi.js
 * 学信网系列 (chsi.com.cn / gaokao.chsi.com.cn)
 * 覆盖：高考(gaokao)、考研(kaoyan)
 */

const { fetchWithRetry } = require('../lib/fetch')

const SOURCES = [
  {
    id: 'gaokao',
    name: '高考',
    url: 'https://gaokao.chsi.com.cn/gkxx/#',
    keywords: ['高考', '统考', '报名']
  },
  {
    id: 'kaoyan',
    name: '全国硕士研究生招生考试',
    url: 'https://yz.chsi.com.cn/kyzx/kstime/',
    keywords: ['考研', '硕士', '初试', '报名']
  }
]

const DATE_RE = /(\d{4})年(\d{1,2})月(\d{1,2})日/g

async function scrape() {
  console.log('[chsi] 开始抓取学信网考试...')
  const results = []

  for (const src of SOURCES) {
    console.log(`[chsi]   ${src.name}`)
    try {
      const html = await fetchWithRetry(src.url)
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

      const isRelevant = src.keywords.some(kw => text.includes(kw))
      if (!isRelevant) { console.log(`[chsi]     ⚠ 无关内容`); continue }

      let dates = []
      let match
      while ((match = DATE_RE.exec(text)) !== null) {
        dates.push({ year: parseInt(match[1]), month: parseInt(match[2]), day: parseInt(match[3]), full: match[0] })
      }
      DATE_RE.lastIndex = 0

      const now = new Date()
      const futureDates = dates
        .filter(d => new Date(d.year, d.month - 1, d.day) >= now - 86400000 * 30)
        .sort((a, b) => new Date(a.year, a.month - 1, a.day) - new Date(b.year, b.month - 1, b.day))
        .slice(0, 2)

      for (const d of futureDates) {
        const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
        const season = d.month <= 6 ? '上半年' : '下半年'

        if (src.id === 'gaokao') {
          results.push({
            id: 'gaokao',
            examDate: dateStr,
            examDateNote: `${d.year}年全国统一高考`,
            officialSite: src.url,
            _source: 'chsi-gaokao'
          })
        } else {
          results.push({
            id: 'kaoyan',
            examDate: dateStr,
            examDateNote: `${d.year}年考研初试`,
            officialSite: src.url,
            _source: 'chsi-kaoyan'
          })
        }
      }
      console.log(`[chsi]     ✓ ${futureDates.length} 条`)
    } catch (err) {
      console.warn(`[chsi]     ✗ ${src.id}: ${err.message}`)
    }
  }

  console.log(`[chsi] 完成，共 ${results.length} 条`)
  return results
}

module.exports = { scrape }
