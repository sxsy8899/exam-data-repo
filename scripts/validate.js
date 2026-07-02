#!/usr/bin/env node
/**
 * scripts/validate.js
 * 数据校验脚本
 * 检查 exams.json 数据完整性，在 GitHub Actions 中 PR 前运行
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')
const exams = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'exams.json'), 'utf-8'))

let errors = 0
let warnings = 0

console.log('数据校验开始\n')

// 检查必需字段
const REQUIRED_FIELDS = ['id', 'name', 'category', 'examDate']
exams.EXAMS.forEach(exam => {
  REQUIRED_FIELDS.forEach(f => {
    if (!exam[f]) {
      console.error(`  [ERROR] ${exam.id || '未知'}: 缺少必需字段 ${f}`)
      errors++
    }
  })
})

// 检查 ID 唯一性
const ids = new Set()
exams.EXAMS.forEach(exam => {
  if (ids.has(exam.id)) {
    console.error(`  [ERROR] 重复 ID: ${exam.id}`)
    errors++
  }
  ids.add(exam.id)
})

// 检查日期格式
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
exams.EXAMS.forEach(exam => {
  if (exam.examDate && !DATE_RE.test(exam.examDate)) {
    console.warn(`  [WARN] ${exam.id}: examDate 格式不标准: ${exam.examDate}`)
    warnings++
  }
  if (exam.registerStart && !DATE_RE.test(exam.registerStart)) {
    console.warn(`  [WARN] ${exam.id}: registerStart 格式不标准: ${exam.registerStart}`)
    warnings++
  }
})

// 检查 category 合法性
const validCats = new Set(exams.CATEGORIES.map(c => c.id))
exams.EXAMS.forEach(exam => {
  if (exam.category && !validCats.has(exam.category)) {
    console.error(`  [ERROR] ${exam.id}: 未知 category: ${exam.category}`)
    errors++
  }
})

console.log(`\n校验完成: ${errors} 个错误, ${warnings} 个警告`)
if (errors > 0) {
  process.exit(1)
}
