// scripts/lib/fetch.js
// HTTP 请求封装，支持重试和超时
// 在 GitHub Actions 环境中使用 Node 18+ 内置 fetch

const DEFAULT_TIMEOUT = 15000
const DEFAULT_RETRIES = 2

async function fetchWithRetry(url, options = {}, retries = DEFAULT_RETRIES) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT)

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'exam-calendar-bot/1.0 (https://github.com/yourname/exam-data-repo)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        ...(options.headers || {})
      }
    })
    clearTimeout(timeout)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
    }

    const buffer = await res.arrayBuffer()
    // 尝试 UTF-8，部分中文网站是 GBK，需要 iconv-lite
    // 这里先用 UTF-8，如果乱码再单独处理
    const text = new TextDecoder('utf-8').decode(buffer)
    return text
  } catch (err) {
    clearTimeout(timeout)
    if (retries > 0) {
      console.warn(`  retry ${retries} for ${url}: ${err.message}`)
      await sleep(2000)
      return fetchWithRetry(url, options, retries - 1)
    }
    throw err
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = { fetchWithRetry, sleep }
