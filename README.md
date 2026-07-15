# dev-skills

符合 [Agent Skills 开放标准](https://agentskills.io/specification) 的 AI Agent 技能包集合。

## 包含的 Skills

- **[wechat-miniprogram-ci](./wechat-miniprogram-ci/)** — 使用微信官方 miniprogram-ci 对 uni-app 微信小程序执行发布前预检、生产构建和代码上传
- **[yunxiao-bug-fix](./yunxiao-bug-fix/)** — 云效（yunxiao / 阿里云 DevOps）缺陷工单的端到端修复 SOP

## 安装与使用

Claude Code、Codex、OpenCode 均支持 Agent Skills。把本仓库中的 skill 目录安装到对应工具的 skills 目录后，即可在相关任务中自动触发或手动引用。

### Claude Code

Claude Code 将技能目录放入 skills 目录后，重启会话即可被识别：

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

在 Codex 中安装本仓库的 Agent Skills：

```text
请从 https://github.com/liuy-byte/dev-skills 安装 wechat-miniprogram-ci 和 yunxiao-bug-fix 两个 Agent Skills，并检查每个 skill 目录都有 SKILL.md。
```

也可以手动 clone 后放入 Codex 的 skills 目录：

```bash
git clone https://github.com/liuy-byte/dev-skills.git
# 将 dev-skills/wechat-miniprogram-ci 和 dev-skills/yunxiao-bug-fix 复制到 Codex 的 skills 目录
```

### OpenCode

在 OpenCode 中安装本仓库的 Agent Skills：

```text
请从 https://github.com/liuy-byte/dev-skills 安装 wechat-miniprogram-ci 和 yunxiao-bug-fix 两个 Agent Skills，并检查每个 skill 目录都有 SKILL.md。
```

也可以手动 clone 后放入 OpenCode 的 skills 目录：

```bash
git clone https://github.com/liuy-byte/dev-skills.git
# 将 dev-skills/wechat-miniprogram-ci 和 dev-skills/yunxiao-bug-fix 复制到 OpenCode 的 skills 目录
```

## 规范遵循

本仓库中的 Skills 均遵循 [Agent Skills Specification](https://agentskills.io/specification)：

- 目录结构：`SKILL.md`（必需）、`scripts/`、`references/`、`assets/`（可选）
- `SKILL.md` frontmatter：`name`、`description`（必需），`license`、`compatibility`、`metadata`（可选）
- `name` 字段与父目录名一致，仅含小写字母、数字和连字符
- 渐进式披露：metadata（常驻）→ instructions（激活时加载）→ resources（按需）

## License

各 Skill 有独立的 LICENSE 文件，详见各目录。
