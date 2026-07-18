# wechat-mp

微信公众号内容生产一条龙 Agent Skill：**写正文（单篇爆款 / DayN 连载）→ 配正文图 → 配封面 → 传素材库**。

## 结构

```
wechat-mp/
├── SKILL.md                  # 意图路由 + 发布闭环
├── references/               # 按需加载的分能力文档
│   ├── viral-article.md      # 单篇爆款改写；全链写作规范事实源
│   ├── series-writer.md      # 「N 天/DayN」连载规划与格式
│   ├── body-images.md        # 正文配图规划、生成、编辑与视觉验收
│   ├── cover.md              # 2.35:1 封面图（series/single 两版式）
│   └── media-upload.md       # 素材库上传取 media_id
├── scripts/
│   ├── body-images/          # 正文图尺寸、数量和重复内容校验
│   ├── cover/                # Node + playwright-core，本机 Chrome 渲染
│   └── media/                # Python + uv，微信素材接口
└── evals/                    # 测试用例
```

## 安装

把整个 `wechat-mp/` 放进（或软链到）`~/.claude/skills/`，重启会话即可识别。依赖按需装：

```bash
# 封面生成（需本机 Google Chrome）
cd ~/.claude/skills/wechat-mp/scripts/cover
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --registry=https://registry.npmmirror.com

# 素材上传
cd ~/.claude/skills/wechat-mp/scripts/media && uv sync
```

素材上传所需的公众号 AppID/AppSecret 存放在 `~/.config/wechat-mp/config.json`（仓库外），缺失时 skill 会引导自助配置。

正文配图校验无第三方依赖：

```bash
node scripts/body-images/validate.mjs image-1.png image-2.png --count 2
```

## License

MIT
