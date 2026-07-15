# dev-skills

符合 [Agent Skills 开放标准](https://agentskills.io/specification) 的 AI Agent 技能包集合。

## 包含的 Skills

- **[wechat-miniprogram-ci](./wechat-miniprogram-ci/)** — 使用微信官方 miniprogram-ci 对 uni-app 微信小程序执行发布前预检、生产构建和代码上传
- **[yunxiao-bug-fix](./yunxiao-bug-fix/)** — 云效（yunxiao / 阿里云 DevOps）缺陷工单的端到端修复 SOP
- **[git-commit](./git-commit/)** — 审查工作区改动，生成规范、原子化的提交信息并安全创建 Git commit
- **[gh-cli](./gh-cli/)** — 使用 GitHub CLI 安全处理仓库、PR、Issue、Actions、Release 和 API 操作
- **[mysql-cli](./mysql-cli/)** — 使用原生 mysql 客户端安全查询、检查和验证 MySQL 数据库

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

再按使用的工具复制 Skill。以下命令适用于首次安装到用户级目录；如果同名目录已存在，请先比较版本并备份，不要直接覆盖。

#### Claude Code

```bash
mkdir -p ~/.claude/skills
cp -R wechat-miniprogram-ci yunxiao-bug-fix git-commit gh-cli mysql-cli ~/.claude/skills/
```

#### Codex

```bash
mkdir -p ~/.agents/skills
cp -R wechat-miniprogram-ci yunxiao-bug-fix git-commit gh-cli mysql-cli ~/.agents/skills/
```

#### OpenCode

```bash
mkdir -p ~/.config/opencode/skills
cp -R wechat-miniprogram-ci yunxiao-bug-fix git-commit gh-cli mysql-cli ~/.config/opencode/skills/
```

如需安装到项目级目录，将目标路径替换为上表中的项目级路径。只安装一个 Skill 时，从 `cp` 命令中删除其余目录名即可。

也可以把仓库链接交给 Agent，让它代为安装：

```text
请从 https://github.com/liuy-byte/dev-skills 的 main 分支，将以下 Skill 分别安装到当前工具官方的用户级 Skills 目录：

- wechat-miniprogram-ci
- yunxiao-bug-fix
- git-commit
- gh-cli
- mysql-cli

要求：
1. 每个 Skill 独立安装；目标目录已存在时不要覆盖，报告现状并建议更新或保留。
2. 在 wechat-miniprogram-ci 目录执行 CI=1 npm ci。
3. 检查微信密钥环境变量、云效 MCP、gh CLI 及认证状态、mysql 客户端及安全连接配置；缺失时按仓库说明引导配置，不得读取或泄露密钥、令牌。
4. 验证五个目录均包含 SKILL.md 且能被当前工具发现；需要重启会话时明确提示。
5. 最后报告实际安装路径、已完成项、待配置项和验证结果。只有全部依赖及必要配置就绪后，才说明“安装后可用”。
```

### 完成前置配置

| Skill | 前置条件 |
| --- | --- |
| [wechat-miniprogram-ci](./wechat-miniprogram-ci/README.md) | 安装 Node.js `^18.17.0` 或 `>=20.5.0`，在 Skill 目录执行 `CI=1 npm ci`，并配置微信代码上传密钥 |
| [yunxiao-bug-fix](./yunxiao-bug-fix/README.md) | 配置云效 MCP；首次触发时也会引导配置 |
| git-commit | 已安装 Git，并在 Git 仓库中使用 |
| gh-cli | 安装 [GitHub CLI](https://cli.github.com/)，确保 `gh auth status` 检查通过 |
| mysql-cli | 安装 MySQL 命令行客户端，并通过登录路径、受保护配置文件或交互密码提示安全连接 |

### 验证与触发

确认安装后的目录中存在以下文件：

```text
<Skills 目录>/wechat-miniprogram-ci/SKILL.md
<Skills 目录>/yunxiao-bug-fix/SKILL.md
<Skills 目录>/git-commit/SKILL.md
<Skills 目录>/gh-cli/SKILL.md
<Skills 目录>/mysql-cli/SKILL.md
```

工具通常会自动发现新增 Skill；如果没有显示，请重新打开会话。随后可直接描述任务，让 Agent 自动匹配：

```text
用 miniprogram-ci 预检当前 uni-app 微信小程序
修复云效工单 ABCD-1234
审查当前改动并创建一个 commit
使用 gh 查看当前仓库中检查失败的 PR
使用 mysql CLI 查询测试库中最近 20 条订单
```

显式调用时，Claude Code 使用 `/skill-name`，Codex 输入 `$skill-name` 或通过 `/skills` 选择；OpenCode 可在提示词中直接写明 Skill 名称。

## 规范遵循

本仓库中的 Skills 均遵循 [Agent Skills Specification](https://agentskills.io/specification)：

- 每个 Skill 至少包含 `SKILL.md`；可按需包含 `scripts/`、`references/`、`assets/` 等资源
- `SKILL.md` frontmatter 至少包含 `name`、`description`，并可使用规范允许的可选字段
- `name` 字段与父目录名一致，仅含小写字母、数字和连字符
- 渐进式披露：`name` + `description`（发现阶段）→ `SKILL.md` 正文（激活时加载）→ 资源文件（按需）
- `agents/openai.yaml` 是可选的 OpenAI/Codex 界面元数据扩展，不属于开放标准的必需文件

## License

五个 Skill 均采用 MIT 许可证，详见各目录中的 `LICENSE` 文件。
