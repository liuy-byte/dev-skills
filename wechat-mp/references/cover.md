# 封面图生成

## 技术洋品牌规范（钉死·必读）

**本公众号所有封面统一以下参数，不再按技术栈换色。** 目的是让每张封面一眼可辨识为「技术洋」，杜绝风格漂移。

| 参数 | 固定值 | 说明 |
|------|--------|------|
| 基调 `style` | `dark`（深色科技底） | 统一深色。带小红书贴图的文章可用 `light`（浅蓝），light 主色仍为品牌蓝 |
| 品牌主色 `palette` | 品牌金 `#d99a1f` / `#f6d47c` / `#f1c14b` | 已是脚本 dark 默认（2026-07 起现行风格），**省略 `palette` 即自动品牌金**；不要再填技术栈色 |
| 单篇 kicker `corner` | `AI 编程` | 单篇统一用这个分类标签，不按文章主题换，强化栏目辨识 |
| 品牌名 `brand` | `技术洋` | 已是脚本默认；模板中仍显式写死以防默认值变动 |
| 图标 `iconPath` | 默认菱形 | 省略即菱形，与现有封面一致；不要换叶子等 |

**用法（照这个来就统一）**：单篇复制 `examples/jishuyang-single.config.json`，连载复制 `examples/jishuyang-series.config.json`，**只改标题/副标题文案和 `outDir`**，其余字段保持不动。

> 如个别封面确需换色（极少数），才显式传 `palette` 覆盖；默认场景一律不填，交给品牌金默认值。生成后建议与近期已发布封面（图床各文章目录的 `cover.jpg`）目视比对一次，确认同色系。

---

生成 **2350×1000（2.35:1，公众号头条封面）JPEG**。这是高清母版，平台可按发布端要求缩放；不要再使用旧的 900×500、2:1 规范。默认风格：**深色科技底 + 品牌色光晕 + 细网格**；单篇另有**浅蓝风**（`style:"light"`，与小红书贴图视觉一致，配套出贴图的文章优先用它）。两种版式：

| mode | 版式 | 适用 |
|------|------|------|
| `series`（默认） | 左侧超大 `Day` 编号 + 右侧主题 + 底部「N 天系列」+ `NN/总数` 进度 | 「N 天 / N 讲」连载，批量出一套 |
| `single` | 居中文章主标题 + 副标题 + 底部公众号品牌名（**无编号、无进度**） | 普通单篇文章 |

两种版式共用同一套底色/品牌色/图标，保证同一公众号视觉延续。

```
连载 series                              单篇 single
┌────────────────────────────┐          ┌────────────────────────────┐
│ DAY              ChatClient │          │          构建工具           │
│ 02   吃透 ChatClient        │          │       干翻 Maven           │
│ ▔▔   流式输出               │          │   新一代 Java 构建神器      │
│ 🍃 Spring AI·14天   02 / 14 │          │      🍃 技术洋     │
└────────────────────────────┘          └────────────────────────────┘
```

## 何时用 / 不用

| 需求 | 用哪个 |
|------|--------|
| 给连载**每篇**生成封面 | ✅ 本文档（`mode: series`） |
| 给**单篇文章**生成封面 | ✅ 本文档（`mode: single`） |
| 写连载/文章**正文** | `series-writer.md` / `viral-article.md` |
| 生成或规整**正文配图** | `body-images.md` |
| 把封面**上传到微信素材库**拿 media_id | `media-upload.md` |

## 环境准备（首次）

需要本机已装 **Google Chrome**（skill 用 `channel:'chrome'`，不另下载浏览器）。首次安装 JS 依赖：

```bash
cd ~/.claude/skills/wechat-mp/scripts/cover
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --registry=https://registry.npmmirror.com
```

> 国内网络用阿里云镜像。若 npm 报网络错（exit 1），多半是沙箱拦了网络——需在**关闭沙箱**的环境执行（Claude 用 `dangerouslyDisableSandbox`）。

## 用法

### 单篇快捷模式（推荐，不写 JSON）

固定参数（mode/style/brand/kicker）来自持久配置（见下），命令行只给会变的部分：

```bash
node ~/.claude/skills/wechat-mp/scripts/cover/generate.mjs \
  --out /abs/path/to/images/<文章专属文件夹> \
  --title "主标题 <hl>高亮词</hl>" \
  --sub "一句话卖点"
```

可选：`--corner` 覆盖 kicker（传空串关闭）、`--name` 改文件名（默认 `cover`）。

### 持久配置（一次配好，长期生效）

`~/.config/wechat-mp/config.json`（与素材上传共用，或 `$WECHAT_MP_CONFIG`）的 `cover` 段存放固定参数，运行时 config/CLI 参数优先于它：

```json
{ "cover": { "mode": "single", "style": "dark", "brand": "技术洋", "corner": "AI 编程" } }
```

> `palette` 不用配——脚本 dark 默认即品牌金。`corner` 在这里配一次，单篇封面自动带「AI 编程」kicker。

### config.json 模式（连载/批量仍用它）

1. 写一个 `config.json`（连载参考 `scripts/cover/examples/spring-ai-14days.config.json`，单篇参考 `scripts/cover/examples/single-articles.config.json`，复制改即可）；未写的字段同样回落到持久配置。
2. 运行（**脚本路径用绝对路径**，避免 cwd 漂移找不到脚本）：

```bash
node ~/.claude/skills/wechat-mp/scripts/cover/generate.mjs /abs/path/to/your.config.json
```

### 输出检查

逐张查看输出：脚本会检查配置、标题行数、重复文件名和文件大小，但仍需目视确认标题语义、品牌色、安全边距；连载还要看进度号，单篇看品牌名。

## config.json 字段

### 通用（两种 mode 都用）

| 字段 | 必填 | 说明 |
|------|:--:|------|
| `outDir` | ✓ | 输出目录**绝对路径**（建议指向图床仓库的子目录） |
| `mode` | | `series`(默认) 或 `single` |
| `style` | | `dark`(默认，深色科技底) 或 `light`（**浅蓝风，仅 single**：浅蓝渐变底+网格+叶子，深蓝标题+品牌蓝高亮，与技术洋小红书贴图同视觉；palette 缺省自动用品牌蓝 `#1f7ae0`。示例 `examples/light-single.config.json`） |
| `palette` | | `{ main, light, accent }` 三个 hex，默认 Spring 绿（`style:light` 时默认品牌蓝） |
| `iconPath` | | 底部图标 SVG path 的 `d`，默认菱形；品牌图标见下 |
| `ext` | | `jpg`(默认) 或 `png` |
| `quality` | | JPEG 质量，默认 92 |
| `scale` | | 渲染倍率 1–3，默认 2；默认输出 2350×1000 |
| `maxBytes` | | 单文件大小上限，默认 2MB；超过时脚本报错 |

### 连载模式（`mode: series`）

| 字段 | 必填 | 说明 |
|------|:--:|------|
| `series` | ✓ | 系列名，底部显示，如 `Spring AI` |
| `days` | ✓ | 每篇一项，见下 |
| `total` | | 进度分母，默认 = `days.length` |
| `dayLabel` | | 左上小标签，默认 `DAY` |
| `seriesTagline` | | 底部整条文案，默认 `${series} · ${total} 天系列` |
| `filePrefix` | | 文件名前缀，默认 `day` → `day01.jpg` |

**`days[]` 每项**：`n`（编号字符串，**两位补零** `"01"`…，决定文件名 `day{n}` 和进度号）、`title`（主标题 HTML，`<br>` 分两行、`<hl>术语</hl>` 高亮）、`sub`（副标题）、`corner`（右上角技术标签，可选）。

### 单篇模式（`mode: single`）

| 字段 | 必填 | 说明 |
|------|:--:|------|
| `brand` | | 底部公众号名，默认 `公众号`——**建议显式配置为自己的品牌名**（示例见 `examples/single-articles.config.json`） |
| `items` | ✓ | 每篇一项，见下 |

**`items[]` 每项**：`name`（文件名，无后缀，如 `maven-killer` → `maven-killer.jpg`）、`title`（主标题 HTML，`<br>` 分行、`<hl>` 高亮）、`sub`（副标题/卖点，可选）、`corner`（顶部分类标签如「构建工具」，**可选**；省略时标题上方显示一条品牌色短横）。

## 文案撰写要点

**连载（series）**
- title 控制成**两行**，每行约 6–9 汉字宽；英文长术语（`ChatClient`/`Tool Calling`）尽量**独占一行**，避免单行超过右栏（~580px）而溢出。
- 每篇 `<hl>` **只高亮一个核心术语**。`sub` ≤18 字最稳。`corner` 放技术关键词强化辨识。

**单篇（single）**
- 标题**居中**、可两行，整宽可用（比连载宽，单行约 12–13 汉字），核心词 `<hl>` 高亮。标题太长就 `<br>` 分两行。
- `corner` 当文章分类/工具名（顶部 kicker）；`sub` 一句话卖点；`brand` 是公众号名。

标题只允许 `<br>` 和 `<hl>...</hl>` 两种标记，其他 HTML 会被转义。主标题渲染超过两行时脚本直接报错，不要通过缩小到难以阅读来规避。

## 版式与安全区

- 核心标题、产品名和品牌名放在现有内容区内，不贴近四边。
- 2.35:1 头条图与分享场景的方形裁切不同；发布前需要在公众号后台单独检查 1:1 裁切预览。
- 连载封面的 Day 编号和主题分居两侧，不能假设自动居中裁切后仍完整；方形分享图有强需求时应另做 square 版，不要直接硬裁头条图。
- 文字型封面继续使用本脚本的确定性排版，不用 AI 生图重绘文字。

## 备用色板（默认不用，仅极特殊场景显式覆盖）

> ⚠️ 技术洋封面默认一律品牌金（见顶部「品牌规范」）。下表仅在**极个别**确需与某技术栈强绑定时，才显式传入 `palette` 覆盖；常规文章**不要**用它换色，否则破坏公众号视觉统一。

| 主题 | main | light | accent |
|------|------|-------|--------|
| 技术洋品牌金（默认） | `#d99a1f` | `#f6d47c` | `#f1c14b` |
| 技术洋品牌蓝（旧版，已停用） | `#1f7ae0` | `#5fb8ff` | `#4aa8f5` |
| Spring（绿） | `#6db33f` | `#9be36a` | `#8fdc5a` |
| FastAPI（青绿） | `#05998b` | `#3fd0c0` | `#28c0b0` |
| Docker（蓝） | `#2496ed` | `#5fb8ff` | `#4aa8f5` |
| LangChain（暖橙） | `#d97706` | `#fbbf24` | `#f59e0b` |
| 通用紫 | `#7c5cff` | `#a78bfa` | `#9b87f5` |

**品牌图标 `iconPath`（SVG path d）**：
- Spring 叶子：`M21 3C9 3 3 9 3 18c0 1 0 2 .3 3 .4-6 4-11 11-13-5 3-7 8-7.6 12.5C19 19 22 13 21 3z`
- 默认菱形：`M12 2 L22 12 L12 22 L2 12 Z`

## 三个坑（已规避，勿改回）

1. **不要**用 `chrome --headless --screenshot` 命令行逐张截图：第 2 张起 `execFileSync` 会永久卡死（即便每张独立 `--user-data-dir`）。脚本已改用 **playwright-core 单浏览器实例**顺序截多张，根治。
2. `npm i` 在沙箱下连不上 registry → 关沙箱 + 阿里云镜像（见上）。`git push`/`curl` 等联网命令同理。
3. Bash 工具 **cwd 跨调用持久**：`cd` 进子目录后再 `node generate.mjs` 会找错路径 → 跑脚本一律用绝对路径。

## 输出与推送（图床为 git 仓库时）

产物进图床仓库（连载 `day{n}.jpg`，单篇 `{name}.jpg`）。raw URL **不含** `images/` 层级，例如：
`https://raw.githubusercontent.com/<user>/<images-repo>/main/<子目录>/day01.jpg`

子母仓库一起提交推送：先 `cd images && git add <子目录> && git commit && git push`，再 `cd 父仓库 && git add images && git commit && git push`。

## 输出尺寸

基础画布固定为 1175×500（2.35:1），通过 `scale` 控制清晰度：

- `scale: 1` → 1175×500
- `scale: 2`（默认）→ 2350×1000
- `scale: 3` → 3525×1500

其他比例应新增独立版式，不能修改 viewport 后直接拉伸现有布局。
