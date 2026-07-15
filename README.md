# dev-skills

符合 [Agent Skills 开放标准](https://agentskills.io/specification) 的 AI Agent 技能包集合。

## 包含的 Skills

- **[wechat-miniprogram-ci](./wechat-miniprogram-ci/)** — 使用微信官方 miniprogram-ci 对 uni-app 微信小程序执行发布前预检、生产构建和代码上传
- **[yunxiao-bug-fix](./yunxiao-bug-fix/)** — 云效（yunxiao / 阿里云 DevOps）缺陷工单的端到端修复 SOP

## 安装与使用

Claude Code、Codex 和 OpenCode 均支持 Agent Skills。每个 Skill 都是独立目录，可全部安装，也可以只安装需要的一个。

### 选择安装范围

| 工具 | 用户级（所有项目可用） | 项目级（仅当前项目可用） |
| --- | --- | --- |
| [Claude Code](https://code.claude.com/docs/en/skills) | `~/.claude/skills/` | `<项目>/.claude/skills/` |
| [Codex](https://learn.chatgpt.com/docs/build-skills) | `~/.agents/skills/` | `<项目>/.agents/skills/` |
| [OpenCode](https://opencode.ai/docs/skills/) | `~/.config/opencode/skills/` | `<项目>/.opencode/skills/` |

OpenCode 也兼容 `.claude/skills/` 和 `.agents/skills/`，但建议优先使用上表中的原生目录。

### 手动安装

先克隆仓库：

```bash
git clone https://github.com/liuy-byte/dev-skills.git
cd dev-skills
```

再按使用的工具复制 Skill。以下命令安装到用户级目录：

#### Claude Code

```bash
mkdir -p ~/.claude/skills
cp -R wechat-miniprogram-ci yunxiao-bug-fix ~/.claude/skills/
```

#### Codex

```bash
mkdir -p ~/.agents/skills
cp -R wechat-miniprogram-ci yunxiao-bug-fix ~/.agents/skills/
```

#### OpenCode

```bash
mkdir -p ~/.config/opencode/skills
cp -R wechat-miniprogram-ci yunxiao-bug-fix ~/.config/opencode/skills/
```

如需安装到项目级目录，将目标路径替换为上表中的项目级路径。只安装一个 Skill 时，从 `cp` 命令中删除另一个目录名即可。

也可以把仓库链接交给 Agent，让它代为安装：

```text
请从 https://github.com/liuy-byte/dev-skills 安装 wechat-miniprogram-ci 和 yunxiao-bug-fix 到当前工具的用户级 Skills 目录，并确认每个 Skill 目录中都有 SKILL.md。
```

### 完成前置配置

- **wechat-miniprogram-ci**：进入安装后的 Skill 目录执行 `CI=1 npm ci`，并配置微信代码上传密钥。详见 [wechat-miniprogram-ci 使用说明](./wechat-miniprogram-ci/README.md)。
- **yunxiao-bug-fix**：需要配置云效 MCP；首次触发时 Skill 也会引导配置。详见 [yunxiao-bug-fix 使用说明](./yunxiao-bug-fix/README.md)。

### 验证与触发

确认安装后的目录中存在以下文件：

```text
<Skills 目录>/wechat-miniprogram-ci/SKILL.md
<Skills 目录>/yunxiao-bug-fix/SKILL.md
```

工具通常会自动发现新增 Skill；如果没有显示，请重新打开会话。随后可直接描述任务，让 Agent 自动匹配：

```text
用 miniprogram-ci 预检当前 uni-app 微信小程序
修复云效工单 ABCD-1234
```

也可以显式指定 Skill：Claude Code 使用 `/wechat-miniprogram-ci`，Codex 输入 `$wechat-miniprogram-ci` 或通过 `/skills` 选择；OpenCode 可在提示词中直接写明 Skill 名称。

## 规范遵循

本仓库中的 Skills 均遵循 [Agent Skills Specification](https://agentskills.io/specification)：

- 目录结构：`SKILL.md`（必需）、`scripts/`、`references/`、`assets/`（可选）
- `SKILL.md` frontmatter：`name`、`description`（必需），`license`、`compatibility`、`metadata`（可选）
- `name` 字段与父目录名一致，仅含小写字母、数字和连字符
- 渐进式披露：metadata（常驻）→ instructions（激活时加载）→ resources（按需）

## License

各 Skill 有独立的 LICENSE 文件，详见各目录。
