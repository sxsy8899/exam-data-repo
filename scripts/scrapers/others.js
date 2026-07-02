/**
 * scripts/scrapers/others.js
 * 其他爬虫：心理学(psychology/cpsbeijing)、消防(fire/mem)、建造师(builder/coc)、IELTS、JLPT、NISP
 * 以及自考/成考/中考各省
 */

const { fetchWithRetry } = require('../lib/fetch')

const DATE_RE = /(\d{4})年(\d{1,2})月(\d{1,2})日/g

const SOURCES = [
  // 心理咨询师
  { id: 'psychology', name: '心理咨询师', url: 'https://www.cpsbeijing.org', keywords: ['心理咨询', '心理'] },
  // 消防
  { id: 'fire', name: '消防工程师', url: 'https://www.mem.gov.cn', keywords: ['消防', '注册消防', '消防工程'] },
  // 建造师
  { id: 'builder', name: '建造师', url: 'http://www.coc.gov.cn', keywords: ['建造师', '一级建造师', '二级建造师'] },
  // 雅思
  { id: 'ielts', name: '雅思', url: 'https://www.chinaielts.org', keywords: ['雅思', 'IELTS'] },
  // 日语
  { id: 'jlpt', name: '日语能力考', url: 'https://www.jlpt.cn', keywords: ['日本语', '日语能力', 'JLPT'] },
  // 信息安全
  { id: 'nisp', name: '信息安全', url: 'http://www.itsec.gov.cn', keywords: ['信息安全', 'NISP', '网络安全'] },
  // 自考
  { id: 'zikao', name: '自学考试', url: 'https://www.eeagd.edu.cn', keywords: ['自学考试', '自考'] },
  // 成考
  { id: 'chengkao', name: '成人高考', url: 'https://www.eeagd.edu.cn', keywords: ['成人高考', '成考'] },
  // 中考各省（有官网的）
  { id: 'zhongkao-guangdong', name: '中考（广东）', url: 'https://gzzk.gz.gov.cn', keywords: ['中考', '初中', '学业水平'] },
  { id: 'zhongkao-beijing', name: '中考（北京）', url: 'https://www.bjeea.cn', keywords: ['中考', '初中', '学业水平'] },
  { id: 'zhongkao-henan', name: '中考（河南）', url: 'https://jyt.henan.gov.cn', keywords: ['中考', '初中', '学业水平'] },
  { id: 'zhongkao-shanghai', name: '中考（上海）', url: 'https://www.shmeea.edu.cn', keywords: ['中考', '初中', '学业水平'] },
  // 华为认证
  { id: 'huawei', name: '华为认证', url: 'https://support.huawei.com', keywords: ['华为认证', 'HCIE', 'HCIP', 'HCIA'] }
]

async function scrape() {
  console.log('[others] 抓取其他考试...'); const results = []
  for (const src of SOURCES) {
    console.log(`[others]   ${src.name}`)
    try {
      const html = await fetchWithRetry(src.url); const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
      if (!src.keywords.some(kw => text.includes(kw))) { console.log(`[others]     ⚠ 无关`); continue }
      const dates = []; let m
      while ((m = DATE_RE.exec(text)) !== null) dates.push({ y: parseInt(m[1]), m: parseInt(m[2]), d: parseInt(m[3]) })
      DATE_RE.lastIndex = 0
      const now = new Date()
      const future = dates.filter(d => new Date(d.y, d.m - 1, d.d) >= now - 86400000 * 30)
        .sort((a, b) => new Date(a.y, a.m - 1, a.d) - new Date(b.y, b.m - 1, b.d)).slice(0, 2)
      for (const d of future) results.push({
        id: src.id, examDate: `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`,
        examDateNote: `${d.y}年`, officialSite: src.url, _source: 'others'
      })
      console.log(`[others]     ✓ ${future.length} 条`)
    } catch (err) { console.warn(`[others]     ✗ ${src.id}: ${err.message}`) }
  }
  console.log(`[others] 完成，共 ${results.length} 条`)
  return results
}

module.exports = { scrape }
