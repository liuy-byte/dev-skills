# dev-skills

符合 [Agent Skills 开放标准](https://agentskills.io/specification) 的 AI Agent 技能包集合。

## 包含的 Skills

- **[wechat-miniprogram-ci](./wechat-miniprogram-ci/)** — 使用微信官方 miniprogram-ci 对 uni-app 微信小程序执行发布前预检、生产构建和代码上传
- **[yunxiao-bug-fix](./yunxiao-bug-fix/)** — 云效（yunxiao / 阿里云 DevOps）缺陷工单的端到端修复 SOP

## 安装与使用

### Claude Code

Claude Code 原生支持 Agent Skills。将技能目录放入 Claude Code 的 skills 目录后，重启会话即可被识别：

- **用户级，跨项目可用**：`~/.claude/skills/` 或 `~/.agents/skills/`
- **项目级**：`<项目>/.claude/skills/`

```bash
# clone 后复制
git clone https://github.com/liuy-byte/dev-skills.git
mkdir -p ~/.claude/skills
cp -R dev-skills/wechat-miniprogram-ci ~/.claude/skills/
cp -R dev-skills/yunxiao-bug-fix ~/.claude/skills/
```

也可以直接把仓库链接给 Claude Code，并让它安装：

```text
请从 https://github.com/liuy-byte/dev-skills 安装 wechat-miniprogram-ci 和 yunxiao-bug-fix 到 ~/.claude/skills/，安装后检查每个目录都有 SKILL.md，并提示我重启会话。
```

### Codex

Codex 目前不能假设原生支持 Agent Skills，也不能假设只给 GitHub 链接就会自动安装。推荐 clone 后让 Codex 读取对应 `SKILL.md` / `references/`，把它当作 SOP 和规则上下文使用：

```bash
git clone https://github.com/liuy-byte/dev-skills.git
```

```text
请读取 dev-skills/yunxiao-bug-fix/SKILL.md，并严格按它执行。
```

### OpenCode

OpenCode 可复用本仓库的 Agent Skills 目录结构。若当前 OpenCode 环境没有明确的 GitHub URL 自动安装能力，推荐同样先 clone，再让 OpenCode 读取具体 skill 的 `SKILL.md`：

```bash
git clone https://github.com/liuy-byte/dev-skills.git
```

```text
请读取 dev-skills/wechat-miniprogram-ci/SKILL.md，按里面的流程帮我做小程序 CI 预检/上传。
```

## 规范遵循

本仓库中的 Skills 均遵循 [Agent Skills Specification](https://agentskills.io/specification)：

- 目录结构：`SKILL.md`（必需）、`scripts/`、`references/`、`assets/`（可选）
- `SKILL.md` frontmatter：`name`、`description`（必需），`license`、`compatibility`、`metadata`（可选）
- `name` 字段与父目录名一致，仅含小写字母、数字和连字符
- 渐进式披露：metadata（常驻）→ instructions（激活时加载）→ resources（按需）

## License

各 Skill 有独立的 LICENSE 文件，详见各目录。
