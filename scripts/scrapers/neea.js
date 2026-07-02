/**
 * scripts/scrapers/neea.js
 * 教育部教育考试院系列 (neea.edu.cn / cet.neea.edu.cn)
 * 覆盖考试：教师资格(teacher)、四六级(cet4/cet6)、托福(toefl)、GRE(gre)
 *
 * 抓取策略：每个考试的公告列表页 → 按标题关键词匹配 → 提取日期
 */

const { fetchWithRetry } = require('../lib/fetch')

// ===== 各考试配置 =====
const SOURCES = [
  {
    id: 'teacher',
    name: '中小学教师资格考试',
    url: 'https://ntce.neea.edu.cn/html1/folder/1508/207-1.htm',
    keywords: ['教师资格', '教师', 'NTCE'],
    dateKeywords: ['笔试', '面试', '报名']
  },
  {
    id: 'cet46',
    name: '全国大学英语四六级',
    url: 'https://cet.neea.edu.cn/html1/folder/21089/4472-1.htm',
    keywords: ['四六级', '大学英语', 'CET'],
    dateKeywords: ['考试', '报名', '成绩']
  },
  {
    id: 'toefl',
    name: '托福',
    url: 'https://toefl.neea.cn/',
    keywords: ['托福', 'TOEFL'],
    dateKeywords: ['考试日期', '报名', '考位']
  },
  {
    id: 'gre',
    name: 'GRE',
    url: 'https://gre.neea.cn/',
    keywords: ['GRE'],
    dateKeywords: ['考试日期', '报名', '考位']
  }
]

// ===== 日期提取辅助 =====
const DATE_PATTERNS = [
  // "2026年X月X日" 或 "2026年X月"
  /(\d{4})年(\d{1,2})月(\d{1,2})日/g,
  /(\d{4})年(\d{1,2})月/g,
  // "2026-X-X" 或 "2026-XX-XX"
  /(\d{4})-(\d{1,2})-(\d{1,2})/g,
  // "X月X日"
  /(\d{1,2})月(\d{1,2})日/g
]

function extractDates(text) {
  const results = []
  for (const pattern of DATE_PATTERNS) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      if (match.length === 4) {
        results.push({
          year: parseInt(match[1]),
          month: parseInt(match[2]),
          day: parseInt(match[3]),
          full: match[0]
        })
      } else if (match.length === 3) {
        results.push({
          year: new Date().getFullYear(),
          month: parseInt(match[1]),
          day: parseInt(match[2]),
          full: match[0]
        })
      }
    }
  }
  return results
}

function formatDateStr(y, m, d) {
  if (!y || !m) return null
  const dd = d ? String(d).padStart(2, '0') : '01'
  return `${y}-${String(m).padStart(2, '0')}-${dd}`
}

async function scrape() {
  console.log('[neea] 开始抓取 NEEA 系列考试...')
  const allResults = []

  for (const source of SOURCES) {
    console.log(`[neea]   ${source.name} (${source.id})`)
    try {
      const html = await fetchWithRetry(source.url)
      // 提取整个页面文本（去除标签）
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

      // 检查是否包含考试关键词
      const isRelevant = source.keywords.some(kw => text.includes(kw))
      if (!isRelevant) {
        console.log(`[neea]     ⚠ 未找到相关关键词，跳过`)
        continue
      }

      // 提取所有日期
      const dates = extractDates(text)

      // 按考试类型分类日期
      let examDates = []
      let regDates = []

      for (const d of dates) {
        const context = text.substring(Math.max(0, text.indexOf(d.full) - 20), text.indexOf(d.full) + 50)

        const isExam = /考试|笔试|机考|面试/.test(context)
        const isReg = /报名|报考/.test(context)

        if (isExam) {
          examDates.push(d)
        }
        if (isReg) {
          regDates.push(d)
        }
      }

      // 找到最可能的考试日期（往后最近的）
      const now = new Date()
      examDates.sort((a, b) => {
        const da = new Date(a.year, a.month - 1, a.day || 1)
        const db = new Date(b.year, b.month - 1, b.day || 1)
        return (da >= now ? 0 : 1) - (db >= now ? 0 : 1) || da - db
      })

      regDates.sort((a, b) => {
        const da = new Date(a.year, a.month - 1, a.day || 1)
        const db = new Date(b.year, b.month - 1, b.day || 1)
        return (da >= now ? 0 : 1) - (db >= now ? 0 : 1) || da - db
      })

      // 生成结果（每种考试可能有多个日期，如上半年/下半年）
      const futureExamDates = examDates.filter(d => {
        const date = new Date(d.year, d.month - 1, d.day || 1)
        return date >= now.getTime() - 86400000 * 30
      }).slice(0, 3)

      for (const ed of futureExamDates) {
        // 判断是上半年还是下半年
        const season = ed.month <= 6 ? '上半年' : '下半年'
        const examId = ed.month <= 6
          ? source.id === 'cet46' ? 'cet4' : source.id
          : source.id === 'cet46' ? 'cet6' : source.id

        allResults.push({
          id: examId,
          examDate: formatDateStr(ed.year, ed.month, ed.day),
          examDateNote: `${ed.year}年${season}`,
          officialSite: source.url,
          _source: `neea-${source.id}`
        })

        // 匹配报名日期
        const regDate = regDates.find(d => {
          const rd = new Date(d.year, d.month - 1, d.day || 1)
          const examD = new Date(ed.year, ed.month - 1, ed.day || 1)
          return rd < examD && rd > new Date(examD.getTime() - 86400000 * 120)
        })
        if (regDate) {
          // 报名日期记录在已有结果上（merge.js 会分别处理 registerStart/registerEnd）
        }
      }

      console.log(`[neea]     ✓ 提取到 ${futureExamDates.length} 个考试日期`)
    } catch (err) {
      console.warn(`[neea]     ✗ ${source.id} 抓取失败: ${err.message}`)
    }
  }

  console.log(`[neea] 完成，共 ${allResults.length} 条记录`)
  return allResults
}

module.exports = { scrape, sources: SOURCES.map(s => s.id) }
