# dev-skills

符合 [Agent Skills 开放标准](https://agentskills.io/specification) 的 AI Agent 技能包集合。

## 包含的 Skills

- **[wechat-miniprogram-ci](./wechat-miniprogram-ci/)** — 使用微信官方 miniprogram-ci 对 uni-app 微信小程序执行发布前预检、生产构建和代码上传
- **[yunxiao-bug-fix](./yunxiao-bug-fix/)** — 云效（yunxiao / 阿里云 DevOps）缺陷工单的端到端修复 SOP
- **[git-commit](./git-commit/)** — 审查工作区改动，生成规范、原子化的提交信息并安全创建 Git commit
- **[gh-cli](./gh-cli/)** — 使用 GitHub CLI 安全处理仓库、PR、Issue、Actions、Release 和 API 操作

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
cp -R wechat-miniprogram-ci yunxiao-bug-fix git-commit gh-cli ~/.claude/skills/
```

#### Codex

```bash
mkdir -p ~/.agents/skills
cp -R wechat-miniprogram-ci yunxiao-bug-fix git-commit gh-cli ~/.agents/skills/
```

#### OpenCode

```bash
mkdir -p ~/.config/opencode/skills
cp -R wechat-miniprogram-ci yunxiao-bug-fix git-commit gh-cli ~/.config/opencode/skills/
```

如需安装到项目级目录，将目标路径替换为上表中的项目级路径。只安装一个 Skill 时，从 `cp` 命令中删除其余目录名即可。

也可以把仓库链接交给 Agent，让它代为安装：

```text
请从 https://github.com/liuy-byte/dev-skills 的 main 分支安装以下四个 Skill：

- wechat-miniprogram-ci
- yunxiao-bug-fix
- git-commit
- gh-cli

要求：
1. 识别并使用当前工具官方的用户级 Skills 目录，完成后报告实际安装路径。
2. 分别安装仓库根目录下的四个 Skill，不要把整个仓库当作一个 Skill。
3. 如果目标目录已存在，不要直接覆盖；说明现状并建议我选择更新或保留。
4. 在 wechat-miniprogram-ci 的安装目录执行 CI=1 npm ci。
5. 检查微信代码上传密钥环境变量、云效 MCP，以及 gh CLI 的安装和认证状态；如未配置，按各 Skill 的说明引导完成。不要读取或显示密钥、令牌正文，也不要将其写入仓库、日志或命令输出。
6. 确认四个安装目录中都存在 SKILL.md，并检查 Skill 能被当前工具发现；如果需要重新打开会话，请明确提示。
7. 最后汇总已完成项、仍需我处理的配置和验证结果。只有依赖与必要配置均完成后，才说明“安装后可用”。
```

### 完成前置配置

- **wechat-miniprogram-ci**：进入安装后的 Skill 目录执行 `CI=1 npm ci`，并配置微信代码上传密钥。详见 [wechat-miniprogram-ci 使用说明](./wechat-miniprogram-ci/README.md)。
- **yunxiao-bug-fix**：需要配置云效 MCP；首次触发时 Skill 也会引导配置。详见 [yunxiao-bug-fix 使用说明](./yunxiao-bug-fix/README.md)。
- **gh-cli**：需要安装 [GitHub CLI](https://cli.github.com/) 并执行 `gh auth login` 完成认证。

### 验证与触发

确认安装后的目录中存在以下文件：

```text
<Skills 目录>/wechat-miniprogram-ci/SKILL.md
<Skills 目录>/yunxiao-bug-fix/SKILL.md
<Skills 目录>/git-commit/SKILL.md
<Skills 目录>/gh-cli/SKILL.md
```

工具通常会自动发现新增 Skill；如果没有显示，请重新打开会话。随后可直接描述任务，让 Agent 自动匹配：

```text
用 miniprogram-ci 预检当前 uni-app 微信小程序
修复云效工单 ABCD-1234
审查当前改动并创建一个 commit
使用 gh 查看当前仓库中检查失败的 PR
```

也可以显式指定 Skill：Claude Code 使用 `/git-commit`、`/gh-cli`，Codex 输入 `$git-commit`、`$gh-cli` 或通过 `/skills` 选择；OpenCode 可在提示词中直接写明 Skill 名称。

## 规范遵循

本仓库中的 Skills 均遵循 [Agent Skills Specification](https://agentskills.io/specification)：

- 目录结构：`SKILL.md`（必需）、`scripts/`、`references/`、`assets/`（可选）
- `SKILL.md` frontmatter：`name`、`description`（必需），`license`、`compatibility`、`metadata`（可选）
- `name` 字段与父目录名一致，仅含小写字母、数字和连字符
- 渐进式披露：metadata（常驻）→ instructions（激活时加载）→ resources（按需）

## License

各 Skill 有独立的 LICENSE 文件，详见各目录。
