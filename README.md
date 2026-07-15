# dev-skills

符合 [Agent Skills 开放标准](https://agentskills.io/specification) 的 AI Agent 技能包集合。

## 包含的 Skills

- **[wechat-miniprogram-ci](./wechat-miniprogram-ci/)** — 使用微信官方 miniprogram-ci 对 uni-app 微信小程序执行发布前预检、生产构建和代码上传
- **[yunxiao-bug-fix](./yunxiao-bug-fix/)** — 云效（yunxiao / 阿里云 DevOps）缺陷工单的端到端修复 SOP

## 安装

将技能目录放入你的技能目录：

- **Claude Code（用户级，跨项目可用）**：`~/.claude/skills/` 或 `~/.agents/skills/`
- **Claude Code（项目级）**：`<项目>/.claude/skills/`

```bash
# 方式一：clone 后复制
git clone https://github.com/liuy-byte/dev-skills.git
cp -R dev-skills/wechat-miniprogram-ci ~/.agents/skills/
cp -R dev-skills/yunxiao-bug-fix ~/.agents/skills/

# 方式二：直接复制目录
cp -R /path/to/wechat-miniprogram-ci ~/.agents/skills/
cp -R /path/to/yunxiao-bug-fix ~/.agents/skills/
```

放好后重启 Agent 会话即可被识别。

## 规范遵循

本仓库中的 Skills 均遵循 [Agent Skills Specification](https://agentskills.io/specification)：

- 目录结构：`SKILL.md`（必需）、`scripts/`、`references/`、`assets/`（可选）
- `SKILL.md` frontmatter：`name`、`description`（必需），`license`、`compatibility`、`metadata`（可选）
- `name` 字段与父目录名一致，仅含小写字母、数字和连字符
- 渐进式披露：metadata（常驻）→ instructions（激活时加载）→ resources（按需）

## License

各 Skill 有独立的 LICENSE 文件，详见各目录。
