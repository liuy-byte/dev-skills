---
name: wechat-mp
description: 微信公众号内容生产一条龙：改写 URL/HTML 为公众号文章并去 AI 味，规划和撰写「N 天/DayN」连载，为技术文章规划、生成、编辑和规整正文配图，生成 2.35:1 头条封面图，以及上传封面到素材库获取 media_id。用户提到“写公众号/改写成公众号/去除AI味/爆款”“N 天/DayN/连载/系列”“正文配图/文章插图/配几张图/配图不相关/图片不规整/统一图片尺寸/修改截图”“配封面/批量生成封面”“上传素材/传封面拿 media_id”，或提供 URL 希望写成公众号文章时使用。
license: MIT
metadata:
  author: liuy-byte
  version: "1.1"
---

# 微信公众号一条龙

覆盖公众号内容生产全链：**写正文 → 配正文图 → 配封面 → 传素材**。按用户意图只读需要的 reference。

## 意图路由

| 用户想做 | 读 | 备注 |
|---------|-----|------|
| 单篇爆款（URL/HTML 改写、去 AI 味） | `references/viral-article.md` | 也是全链**写作规范事实源** |
| 连载系列（规划大纲/逐篇生成/补格式） | `references/series-writer.md` | 写作规范沿用 viral-article.md |
| 正文配图（规划、生成、截图编辑、统一尺寸、修复不相关配图） | `references/body-images.md` | 校验脚本在 `scripts/body-images/` |
| 封面图（连载 series / 单篇 single 两版式） | `references/cover.md` | 脚本在 `scripts/cover/` |
| 素材库上传/删除（取 media_id） | `references/media-upload.md` | 脚本在 `scripts/media/` |

判别要点：

- 提到「N 天」「DayN」「连载」「系列」→ series-writer；否则单篇 → viral-article。
- 提到「正文配图」「文章插图」「配 N 张图」「图片不规整」「修改截图」→ body-images。只提封面时不要读取 body-images。
- 只要封面图 → cover；要把封面传进公众号后台 → media-upload。
- 一次请求跨多步（如"写完这篇再配个封面传上去"）按下面的发布闭环顺序串联，每步读对应 reference。

## 完整发布闭环（典型流程）

1. **写正文**（viral-article 或 series-writer）→ 存 `articles/` 子模块
2. **规划并生成正文配图**（body-images）→ 产物进图床仓库，文章写入 raw URL
3. **生成封面**（cover）→ 产物进图床仓库
4. **上传封面取 media_id**（media-upload，封面必须永久素材）
5. **发布前自检 + 子母仓库提交**——见 `references/viral-article.md` 第八/九步（对外 push 需用户确认）

## 依赖安装（首次，按需）

- 封面生成：`cd ~/.claude/skills/wechat-mp/scripts/cover && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --registry=https://registry.npmmirror.com`（需本机 Google Chrome）
- 正文配图校验：Node 18+，无第三方依赖
- 素材上传：Node 18+，**无第三方依赖**（用内置 fetch，无需安装）；AppID/AppSecret 缺失时按 `references/media-upload.md` 的「首次配置」引导用户自助生成，密钥只写 `~/.config/wechat-mp/config.json`，不入库

## 文档自校准

使用本 Skill 时，若发现文档表述与实际行为不符（命令行为、选项效果、版本差异、环境限制等），主动向用户指出差异并附实测证据，建议修正本 SKILL.md；修正后提醒用户同步源仓库与各处已安装副本。
