# 考试日历数据仓库 (exam-calendar-data)

> 为「考试伴」微信小程序提供云端考试数据，支持爬虫自动抓取 + 人工维护 + CDN 分发。

## 工作流程

```
┌──────────────┐    GitHub Actions     ┌──────────────┐
│  官方网站     │ ────每周定时爬取────→  │  exams.json  │
│  (考试院等)   │                       │  version.json│
└──────────────┘                       └──────┬───────┘
                                              │
┌──────────────┐     人工编辑                │
│ manual-      │ ──────────────────────────→ │
│ overrides.json│                            │
└──────────────┘                            │
                                    ┌────────┴───────┐
                                    │  jsDelivr CDN   │
                                    │  (免费加速)      │
                                    └────────┬───────┘
                                             │
                                    ┌────────┴───────┐
                                    │  小程序          │
                                    │  wx.request     │
                                    │  版本检查+拉取   │
                                    └────────────────┘
```

## 目录结构

```
exam-data-repo/
├── data/
│   ├── exams.json            ← 完整考试数据（爬虫+人工合并后）
│   ├── version.json          ← 版本号 + 更新时间
│   └── manual-overrides.json ← 人工覆盖（优先级最高）
├── scripts/
│   ├── scraper.js            ← 爬虫主控
│   ├── validate.js           ← 数据校验
│   ├── lib/
│   │   ├── fetch.js          ← HTTP 请求封装
│   │   └── merge.js          ← 三层数据合并
│   └── scrapers/
│       ├── cet.js            ← 四六级
│       ├── teacher.js        ← 教师资格
│       └── kaoyan.js         ← 考研
├── .github/workflows/
│   └── update-data.yml       ← GitHub Actions 配置
└── package.json
```

## 数据合并优先级

```
manual-overrides.json  >  爬虫结果  >  现有 exams.json
     (最高优先级)         (自动抓取)     (上一次的数据)
```

- **人工覆盖**：高考、中考等由人工维护的考试，写在这里
- **爬虫结果**：四六级、教师资格、考研等可自动抓取的
- **现有数据**：兜底，爬虫失败时保留上次的数据

## 本地运行

```bash
# 安装依赖
npm install

# 运行所有爬虫（写入 exams.json）
npm run scrape

# 只运行，不写入文件（测试用）
npm run scrape:dry

# 只跑指定爬虫
npm run scrape:exam -- cet

# 数据校验
npm run validate
```

## 新增爬虫

1. 在 `scripts/scrapers/` 下新建文件，例如 `cpa.js`
2. 实现 `scrape()` 函数，返回考试数据数组
3. 在 `scripts/scraper.js` 中注册：

```js
const scrapers = {
  cet: require('./scrapers/cet'),
  teacher: require('./scrapers/teacher'),
  kaoyan: require('./scrapers/kaoyan'),
  cpa: require('./scrapers/cpa')  // 新增
}
```

爬虫返回的数据格式：

```js
{
  id: 'cet46-june',          // 考试 ID（必须与 exams.json 中一致）
  name: '全国大学英语四六级考试',
  examDate: '2026-06-14',    // YYYY-MM-DD
  examDateNote: '6月14日',
  registerStart: '2026-03-20',
  registerEnd: '2026-03-25',
  officialSite: 'https://...',
  _source: 'cet-scraper'     // 来源标记
}
```

## 小程序接入

小程序通过 jsDelivr CDN 拉取数据：

```js
// 版本检查
const VERSION_URL = 'https://cdn.jsdelivr.net/gh/你的用户名/exam-data-repo@main/data/version.json'

// 数据拉取
const DATA_URL = 'https://cdn.jsdelivr.net/gh/你的用户名/exam-data-repo@main/data/exams.json'
```

## GitHub Actions

- **自动运行**：每周一北京时间 06:00
- **手动触发**：Actions 页面 → "更新考试数据" → Run workflow
- **指定爬虫**：手动触发时可选择只跑某个爬虫
- **自动提交**：有数据变更时自动 commit 并 push

## 许可

MIT
