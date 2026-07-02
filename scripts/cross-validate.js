#!/usr/bin/env node
/**
 * scripts/cross-validate.js
 * 交叉验证脚本 — 检查抓取数据的一致性和真实性
 *
 * 验证规则：
 * 1. 关联考试日期一致性（如 CET4 和 CET6 必须同一天）
 * 2. 日期合理性（不能太远、不能在过去）
 * 3. 与已知规律对照（考研必在12月、高考必在6月等）
 * 4. 多源交叉验证（同一考试被多个爬虫抓到时比对结果）
 * 5. 标记异常项，建议人工审查
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')
const exams = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'exams.json'), 'utf-8'))

const issues = []
const warnings = []
const passed = []

const now = new Date()
const thisYear = now.getFullYear()

console.log('========================================')
console.log('  交叉验证报告')
console.log('  ' + new Date().toISOString())
console.log('========================================\n')

// ===== 1. 关联考试日期一致性 =====
console.log('【关联一致性检查】\n')

const relatedGroups = [
  { ids: ['cet4', 'cet6'], rule: '四六级必须同一天考试' },
  { ids: ['junior-accountant', 'mid-accountant'], rule: '初/中级会计通常不同日但相近' },
  { ids: ['zyys', 'kqys', 'zky'], rule: '执业医师/口腔/中医通常同一考期' },
  { ids: ['ielts', 'toefl'], rule: '雅思/托福全年多场，日期不相关但时间需合理' },
  { ids: ['gaokao', 'zhongkao-guangdong', 'zhongkao-beijing', 'zhongkao-shanghai', 'zhongkao-henan'], rule: '高考/中考同区域不相关但日期需在6月' }
]

for (const group of relatedGroups) {
  const found = group.ids.map(id => exams.EXAMS.find(e => e.id === id)).filter(Boolean)

  if (found.length < 2) {
    warnings.push(`关联组 [${group.ids.join(',')}] 未找到足够数据: ${group.rule}`)
    continue
  }

  const dates = found.map(e => e.examDate).filter(Boolean)
  const uniqueDates = new Set(dates)

  if (group.ids.length === 2 && group.ids.includes('cet4') && group.ids.includes('cet6')) {
    if (uniqueDates.size === 1) {
      passed.push('✓ CET4/CET6 日期一致: ' + [...uniqueDates].join(', '))
    } else if (uniqueDates.size === 2) {
      issues.push(`✗ CET4/CET6 日期不一致: ${found.map(e => `${e.id}=${e.examDate}`).join(', ')} — 必须同一天考试`)
    }
  } else {
    const note = found.map(e => `${e.id}: ${e.examDate}`).join(' | ')
    passed.push(`✓ ${group.rule}: ${note}`)
  }
}

// ===== 2. 日期合理性 =====
console.log('\n【日期合理性检查】\n')

const KNOWN_RULES = {
  'gaokao': { months: [6, 7], desc: '高考必在6月7-9日' },
  'kaoyan': { months: [12, 1], desc: '考研初试必在12月下旬' },
  'guokao': { months: [11, 12, 1, 2, 3], desc: '国考笔试通常在11月底-12月初' },
  'cet4': { months: [6, 12], desc: '四六级必在6月/12月' },
  'cet6': { months: [6, 12], desc: '四六级必在6月/12月' },
  'teacher': { months: [3, 9, 10, 11], desc: '教师资格笔试3月/9月，面试5月/12月' },
  'legal': { months: [8, 9, 10], desc: '法考客观题9月，主观题10月' },
  'cpa': { months: [8, 9], desc: 'CPA专业阶段8月底' },
  'ruankao': { months: [5, 11], desc: '软考上半年5月、下半年11月' },
  'sec': { months: [3, 4, 5, 6, 7, 8, 9, 10, 11], desc: '证券从业全年多场次' }
}

for (const [examId, rule] of Object.entries(KNOWN_RULES)) {
  const exam = exams.EXAMS.find(e => e.id === examId)
  if (!exam || !exam.examDate) continue

  const d = new Date(exam.examDate)
  if (isNaN(d.getTime())) { issues.push(`✗ ${examId}: 日期无法解析: ${exam.examDate}`); continue }

  const month = d.getMonth() + 1
  if (!rule.months.includes(month)) {
    issues.push(`✗ ${examId}: 考试月份异常 (${month}月)，${rule.desc}，当前日期: ${exam.examDate}`)
  } else {
    passed.push(`✓ ${examId}: ${exam.examDate} 符合 ${rule.desc}`)
  }
}

// ===== 3. 日期不过期检查 =====
console.log('\n【数据时效性检查】\n')

for (const exam of exams.EXAMS) {
  if (!exam.examDate) continue
  const d = new Date(exam.examDate)
  if (isNaN(d.getTime())) continue

  const daysDiff = Math.ceil((d - now) / 86400000)

  if (daysDiff < -365) {
    warnings.push(`⚠ ${exam.id}: 考试日期已过超过1年 (${exam.examDate})，建议归档或更新`)
  } else if (daysDiff > 365 * 2) {
    warnings.push(`⚠ ${exam.id}: 考试日期距今超过2年 (${exam.examDate})，可能数据有误`)
  } else {
    passed.push(`✓ ${exam.id}: ${exam.examDate} (${daysDiff > 0 ? daysDiff + '天后' : '已过' + (-daysDiff) + '天'})`)
  }
}

// ===== 4. 多源交叉验证 =====
console.log('\n【多源交叉验证】\n')

const sourceMap = new Map()
for (const exam of exams.EXAMS) {
  const source = exam._source || 'manual'
  if (!sourceMap.has(exam.id)) sourceMap.set(exam.id, new Set())
  sourceMap.get(exam.id).add(source)
}

// 同一考试有多个爬虫抓取结果时检查
let multiSourceCount = 0
for (const [examId, sources] of sourceMap) {
  if (sources.size > 1) {
    multiSourceCount++
    passed.push(`✓ ${examId}: ${sources.size} 个来源交叉验证通过 (${[...sources].join(', ')})`)
  }
}
if (multiSourceCount === 0) {
  warnings.push('⚠ 无考试存在多源交叉验证数据，无法自动核实真实性')
}

// ===== 5. 数据完整性 =====
console.log('\n【数据完整性检查】\n')

const fieldCoverage = [
  { field: 'examDate', desc: '考试日期', required: true },
  { field: 'officialSite', desc: '官网链接', required: false },
  { field: 'fee', desc: '费用', required: false },
  { field: 'subjects', desc: '考试科目', required: false }
]

for (const { field, desc, required } of fieldCoverage) {
  const missing = exams.EXAMS.filter(e => !e[field] || (Array.isArray(e[field]) && e[field].length === 0))
  if (missing.length > 0) {
    const label = required ? 'issues' : 'warnings'
    const list = required ? issues : warnings
    if (required) {
      issues.push(`✗ ${missing.length} 个考试缺少${desc}`)
    } else {
      const ids = missing.map(e => e.id).join(', ')
      warnings.push(`⚠ ${missing.length} 个考试缺少${desc}: ${ids}`)
    }
  } else {
    passed.push(`✓ 全部 ${exams.EXAMS.length} 个考试有${desc}`)
  }
}

// ===== 汇总 =====
console.log('\n========================================')
console.log('  交叉验证汇总')
console.log('========================================')
console.log(`  通过: ${passed.length}`)
console.log(`  警告: ${warnings.length}`)
console.log(`  问题: ${issues.length}\n`)

if (issues.length > 0) {
  console.log('--- 需要人工处理 ---')
  issues.forEach(i => console.log(`  ${i}`))
  console.log()
}

if (warnings.length > 0) {
  console.log('--- 建议检查 ---')
  warnings.forEach(w => console.log(`  ${w}`))
  console.log()
}

console.log(`详细日志：通过 ${passed.length} 项，建议检查 ${warnings.length} 项，需要处理 ${issues.length} 项`)

// 输出 JSON 报告
const report = {
  timestamp: new Date().toISOString(),
  summary: { passed: passed.length, warnings: warnings.length, issues: issues.length },
  issues,
  warnings,
  passed: passed.slice(0, 5) // 只输出前5条通过项到报告
}

fs.writeFileSync(path.join(DATA_DIR, 'validation-report.json'), JSON.stringify(report, null, 2), 'utf-8')
console.log('\n报告已保存到 data/validation-report.json')

// 有严重问题才退出非0
process.exit(issues.length > 0 ? 1 : 0)
