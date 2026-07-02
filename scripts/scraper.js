#!/usr/bin/env node
/**
 * scripts/scraper.js
 * 考试数据爬虫主控脚本
 *
 * 用法：
 *   node scripts/scraper.js              # 运行所有爬虫，更新 exams.json
 *   node scripts/scraper.js --dry-run    # 只跑爬虫，不写入文件（测试用）
 *   node scripts/scraper.js --exam cet   # 只跑指定爬虫（cet/teacher/kaoyan）
 *
 * 数据合并优先级：manual-overrides.json > 爬虫结果 > 现有 exams.json
 */

const fs = require('fs')
const path = require('path')
const { mergeExams, readJson, writeJson } = require('./lib/merge')

// 注册所有爬虫（域名分组）
const scrapers = {
  // 教育部教育考试院系列
  neea: require('./scrapers/neea'),
  // 学信网
  chsi: require('./scrapers/chsi'),
  // 中国注册会计师协会
  cicpa: require('./scrapers/cicpa'),
  // 财政部 + 司法部
  'mof-juris': require('./scrapers/mof-juris'),
  // 证券从业 + 税务师 + 软考
  'sac-tax': require('./scrapers/sac-tax'),
  // 医学考试系列
  medical: require('./scrapers/medical'),
  // 国家公务员
  guokao: require('./scrapers/guokao'),
  // 技能人才评价
  osta: require('./scrapers/osta'),
  // 其他考试
  others: require('./scrapers/others'),
  // 国际考试（时间推算）
  international: require('./scrapers/international')
}

const DATA_DIR = path.join(__dirname, '..', 'data')
const EXAMS_PATH = path.join(DATA_DIR, 'exams.json')
const VERSION_PATH = path.join(DATA_DIR, 'version.json')
const OVERRIDES_PATH = path.join(DATA_DIR, 'manual-overrides.json')

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const examFilter = args.includes('--exam') ? args[args.indexOf('--exam') + 1] : null

  console.log('========================================')
  console.log('  考试日历数据爬虫')
  console.log('  ' + new Date().toISOString())
  console.log('========================================\n')

  // 1. 读取现有数据
  const existingData = readJson(EXAMS_PATH, { EXAMS: [], CATEGORIES: [], EXAM_GROUPS: [] })
  const overrides = readJson(OVERRIDES_PATH, {})

  console.log(`现有考试数据：${existingData.EXAMS.length} 条`)
  console.log(`人工覆盖数据：${Object.keys(overrides).filter(k => !k.startsWith('_')).length} 条\n`)

  // 2. 运行爬虫
  let allScraped = []
  const scraperNames = examFilter
    ? [examFilter]
    : Object.keys(scrapers)

  for (const name of scraperNames) {
    const scraper = scrapers[name]
    if (!scraper) {
      console.error(`未知爬虫: ${name}，可选: ${Object.keys(scrapers).join(', ')}`)
      process.exit(1)
    }

    try {
      const scraped = await scraper.scrape()
      allScraped = allScraped.concat(scraped)
    } catch (err) {
      console.error(`[${name}] 爬虫异常: ${err.message}`)
    }
    console.log()
  }

  console.log(`爬虫共抓取：${allScraped.length} 条记录\n`)

  // 3. 合并数据
  const mergedExams = mergeExams(existingData.EXAMS, allScraped, overrides)

  console.log(`合并后考试数据：${mergedExams.length} 条\n`)

  // 4. 计算变更
  let changedCount = 0
  existingData.EXAMS.forEach((old, i) => {
    const neo = mergedExams.find(e => e.id === old.id)
    if (neo && JSON.stringify(old) !== JSON.stringify(neo)) {
      changedCount++
      console.log(`  [updated] ${old.id}: ${diffSummary(old, neo)}`)
    }
  })

  // 5. 写入文件
  if (isDryRun) {
    console.log('\n--dry-run 模式，未写入文件')
    return
  }

  if (changedCount === 0 && mergedExams.length === existingData.EXAMS.length) {
    console.log('\n无数据变更，跳过写入')
    return
  }

  // 更新 exams.json
  const newData = { ...existingData, EXAMS: mergedExams }
  writeJson(EXAMS_PATH, newData)

  // 更新 version.json
  const oldVersion = readJson(VERSION_PATH, {})
  const newVersion = {
    version: generateVersion(),
    updatedAt: new Date().toISOString(),
    count: mergedExams.length,
    changelog: changedCount > 0
      ? `爬虫更新 ${changedCount} 条考试数据`
      : oldVersion.changelog || '数据更新'
  }
  writeJson(VERSION_PATH, newVersion)

  console.log(`\n数据已更新并写入：`)
  console.log(`  ${EXAMS_PATH}`)
  console.log(`  ${VERSION_PATH}`)
  console.log(`  版本号: ${newVersion.version}`)
}

function generateVersion() {
  const now = new Date()
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
}

function diffSummary(oldObj, newObj) {
  const changes = []
  const fields = ['registerStart', 'registerEnd', 'examDate', 'examDateNote', 'officialSite', 'fee']
  fields.forEach(f => {
    if (oldObj[f] !== newObj[f]) {
      changes.push(`${f}: ${oldObj[f] || '空'} -> ${newObj[f] || '空'}`)
    }
  })
  return changes.join(', ') || '内容变更'
}

main().catch(err => {
  console.error('爬虫运行失败:', err)
  process.exit(1)
})
