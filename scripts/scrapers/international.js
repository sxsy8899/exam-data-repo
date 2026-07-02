/**
 * scripts/scrapers/international.js
 * 国际考试（无法可靠抓取官网，基于已知规律推算日期）
 * PMP、CFA、FRM、Cisco、AWS、RHCE、Oracle、阿里云、PTE、GMAT
 *
 * 所有日期均为估算，需人工在 manual-overrides.json 中最终确认
 */

const results = []

/** 生成考试日期基准（基于往年规律 + 当前年份推算） */
function add(id, name, year, month, day, note, site) {
  const d = new Date(year, month - 1, day)
  const now = new Date()
  if (d >= now - 86400000 * 30) {
    results.push({
      id, name,
      examDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      examDateNote: note || `${year}年`,
      officialSite: site,
      _source: 'international-estimate'
    })
  }
}

async function scrape() {
  console.log('[international] 推算国际考试日期（基于往年规律）...')
  const y = 2026

  // PMP：一年4次，大致季度末
  add('pmp', 'PMP项目管理', y, 3, 15, `${y}年第一次`, 'https://www.pmi.org')
  add('pmp', 'PMP项目管理', y, 6, 21, `${y}年第二次`, 'https://www.pmi.org')
  add('pmp', 'PMP项目管理', y, 9, 19, `${y}年第三次`, 'https://www.pmi.org')
  add('pmp', 'PMP项目管理', y, 12, 12, `${y}年第四次`, 'https://www.pmi.org')

  // CFA：Level I 2/5/8/11月，Level II 5/8/11月，Level III 2/8月
  add('cfa', 'CFA特许金融分析师', y, 2, 18, `${y}年Level I/III`, 'https://www.cfainstitute.org')
  add('cfa', 'CFA特许金融分析师', y, 5, 20, `${y}年Level I/II`, 'https://www.cfainstitute.org')
  add('cfa', 'CFA特许金融分析师', y, 8, 19, `${y}年Level I/II/III`, 'https://www.cfainstitute.org')
  add('cfa', 'CFA特许金融分析师', y, 11, 15, `${y}年Level I/II`, 'https://www.cfainstitute.org')

  // FRM：5月和11月
  add('frm', 'FRM金融风险管理师', y, 5, 16, `${y}年第一次`, 'https://www.garp.org')
  add('frm', 'FRM金融风险管理师', y, 11, 21, `${y}年第二次`, 'https://www.garp.org')

  // GMAT：全年可预约
  add('gmat', 'GMAT', y, 1, 1, `${y}年全年可预约`, 'https://www.mba.com')

  // PTE：全年可预约
  add('pte', 'PTE学术英语', y, 1, 1, `${y}年全年可预约`, 'https://www.pearsonpte.com')

  // Cisco/AWS/RHCE/Oracle/阿里云：全年可预约
  for (const cert of [
    { id: 'cisco', name: 'Cisco认证', site: 'https://www.cisco.com' },
    { id: 'aws', name: 'AWS认证', site: 'https://aws.amazon.com/certification' },
    { id: 'rhce', name: 'RHCE红帽', site: 'https://www.redhat.com' },
    { id: 'oracle', name: 'Oracle认证', site: 'https://education.oracle.com' },
    { id: 'alibaba', name: '阿里云认证', site: 'https://edu.alibabacloud.com' },
    { id: 'huawei', name: '华为认证', site: 'https://support.huawei.com' }
  ]) {
    add(cert.id, cert.name, y, 1, 1, `${y}年全年可预约`, cert.site)
  }

  console.log(`[international] 推算完成，共 ${results.length} 条（均为估算，需人工核实）`)
  return results
}

module.exports = { scrape }
