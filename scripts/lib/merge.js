// scripts/lib/merge.js
// 数据合并逻辑
// 优先级：manual-overrides.json > 爬虫结果 > 现有 exams.json

const fs = require('fs')
const path = require('path')

/**
 * 合并三层数据源
 * @param {Array} existingExams  现有 exams.json 中的考试数据
 * @param {Array} scrapedExams   爬虫抓取的考试数据
 * @param {Object} overrides     manual-overrides.json 中的人工覆盖
 * @returns {Array} 合并后的考试数据
 */
function mergeExams(existingExams, scrapedExams, overrides) {
  const result = []
  const scrapedMap = new Map()

  // 爬虫结果建索引
  if (Array.isArray(scrapedExams)) {
    scrapedExams.forEach(e => {
      if (e && e.id) scrapedMap.set(e.id, e)
    })
  }

  // 遍历现有考试，按优先级合并
  existingExams.forEach(existing => {
    const scraped = scrapedMap.get(existing.id)
    const manual = overrides[existing.id]

    let merged = { ...existing }

    // 爬虫结果覆盖（只覆盖爬虫能抓到的字段：日期类）
    if (scraped) {
      const scrapeFields = ['registerStart', 'registerEnd', 'examDate', 'examDateNote', 'officialSite', 'fee']
      scrapeFields.forEach(f => {
        if (scraped[f] !== undefined && scraped[f] !== null && scraped[f] !== '') {
          merged[f] = scraped[f]
        }
      })
      scrapedMap.delete(existing.id)
    }

    // 人工覆盖（最高优先级，覆盖所有字段）
    if (manual) {
      Object.keys(manual).forEach(f => {
        if (f.startsWith('_')) return  // 跳过 _note 等注释字段
        merged[f] = manual[f]
      })
    }

    result.push(merged)
  })

  // 爬虫抓到了新考试（existing 中没有的），追加到末尾
  scrapedMap.forEach(scraped => {
    if (scraped && scraped.id && scraped.name) {
      console.log(`  [new] 爬虫发现新考试: ${scraped.id} - ${scraped.name}`)
      result.push(scraped)
    }
  })

  return result
}

/**
 * 读取 JSON 文件，失败返回默认值
 */
function readJson(filePath, defaultValue) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return defaultValue
  }
}

/**
 * 写入 JSON 文件
 */
function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

module.exports = { mergeExams, readJson, writeJson }
