---
name: gh-cli
description: 使用 GitHub CLI（gh）查询和操作 GitHub 仓库、Pull Request、Issue、Actions、Release、Project 及 API。用户要求使用 gh、查看或创建 PR/Issue、检查 CI、运行工作流、管理 Release、调用 GitHub REST/GraphQL API 时使用；优先结构化读取、明确目标仓库、保护认证信息，并在写操作后回读验证。
license: MIT
---

# GitHub CLI

使用 `gh` 完成可追踪、可验证的 GitHub 操作。优先使用原生命令，只在原生命令不支持所需字段或动作时调用 `gh api`。

## 工作流

### 1. 检查环境与目标

1. 运行 `gh --version`，确认 CLI 可用；不可用时按当前操作系统给出官方安装建议。
2. 运行 `gh auth status` 检查目标主机和当前账号。未登录时引导用户执行 `gh auth login`，不要索取或输出访问令牌。
3. 确认目标仓库、主机和账号：
   - 用户已给出 `OWNER/REPO` 时，优先在命令中显式传入 `--repo OWNER/REPO`；
   - 在本地仓库中工作时，检查 `git remote -v`，再用 `gh repo view --json nameWithOwner,url,defaultBranchRef` 核验；
   - GitHub Enterprise 场景同时确认主机，使用 `--hostname` 或对应的 `GH_HOST` 配置。
4. 目标、账号或作用范围不明确时先说明现状，给出推荐选项并请用户选择，不要猜测后执行写操作。

`gh auth status` 可能显示认证方式和权限范围；只报告是否可用及缺失权限，不复述任何令牌内容。

### 2. 选择原生命令

| 任务 | 优先命令 |
| --- | --- |
| 仓库信息、克隆、Fork | `gh repo view/list/clone/fork` |
| PR 查询、创建、审查、合并 | `gh pr list/view/status/checks/diff/create/edit/review/merge` |
| Issue 查询与管理 | `gh issue list/view/create/edit/close/reopen` |
| Actions 运行与日志 | `gh run list/view/watch/rerun/cancel` |
| Workflow 管理与触发 | `gh workflow list/view/run/enable/disable` |
| Release 查询与管理 | `gh release list/view/create/upload/edit/delete` |
| 搜索 | `gh search repos/issues/prs/commits/code` |
| Projects | `gh project list/view/item-create/item-edit` |
| 原生命令未覆盖的能力 | `gh api` 或 `gh api graphql` |

不确定参数或可用字段时先运行 `gh <command> <subcommand> --help`，不要凭记忆拼接命令。

### 3. 先读取再决策

- 查询命令优先使用 `--json <fields>`，再用 `--jq` 或 `--template` 生成稳定、精简的结果。
- 注意默认数量限制；需要完整集合时显式使用 `--limit`，调用 API 时按需使用 `--paginate` 或 GraphQL 分页。
- 处理 PR 前至少读取标题、正文、分支、合并状态、审查状态、检查结果和差异；处理 Issue 前读取正文、标签、负责人和现有评论。
- 排查 Actions 时先查看 run、job 和失败 step，再读取相关日志；不要仅凭最终状态猜测原因。
- 原生命令可以满足需求时不要转用 `gh api`，以减少字段、预览和兼容性错误。

示例：

```bash
gh pr view 123 --repo OWNER/REPO \
  --json number,title,state,url,headRefName,baseRefName,mergeable,reviewDecision,statusCheckRollup

gh run view RUN_ID --repo OWNER/REPO --log-failed
```

### 4. 安全执行写操作

1. 确保用户已明确要求该写操作，并在执行前核对仓库、对象编号、分支及关键参数。
2. 使用非交互参数明确传入标题、正文、标签、分支等内容；多行正文优先使用受控文件或 `--body-file`，避免 shell 转义破坏内容。
3. 写入 secret 时使用 `gh secret set` 的安全输入方式，不在命令、日志或回复中展示值，也不将秘密保存到仓库。
4. 权限不足时报告缺失的 scope 或仓库权限，建议最小化授权；不要擅自扩大令牌权限或切换账号。
5. 命令失败时保留原始错误和目标信息，先诊断再重试，避免重复创建 PR、Issue、Release 或评论。

以下动作必须有用户对该动作和目标的明确授权：

- 合并或关闭 PR、关闭 Issue；
- 发布、覆盖或删除 Release；
- 触发、重跑、取消、启用或禁用 Workflow；
- 修改 secret、variable、规则、权限或组织资源；
- 删除仓库、缓存、部署或其他远端资源。

若当前请求已明确指定动作与目标，可以直接执行正常的范围内操作；若目标或影响仍有歧义，先给出推荐方案并确认。

### 5. 回读验证并报告

1. 写操作完成后使用对应的 `view`、`list` 或 `gh api` 回读远端状态，不只依赖命令退出码。
2. 报告仓库、对象编号、最终状态和可点击 URL；Actions 操作同时报告 run ID 与当前结论。
3. 清楚区分“命令已接受”“后台处理中”和“最终成功”。需要等待时使用 `gh run watch` 或有限次数轮询，避免无限等待。
4. 若操作仅部分成功，列出已完成项、失败项和安全的后续建议。

## 操作边界

- 不运行 `gh auth token`，不读取或输出 `GH_TOKEN`、`GITHUB_TOKEN` 等认证值。
- 不把认证信息放入参数、URL、提交、Issue、PR、日志或临时共享文件。
- `gh pr checkout`、`gh repo clone` 等会修改本地文件系统；执行前检查目标目录和工作区状态，保护用户现有改动。
- 不通过 `gh api` 绕过原生命令中的安全提示或权限限制。
- 不把读取请求扩展成远端写操作，也不把单仓库请求扩展到组织或多仓库批量操作。
- 不自动执行 push、force push、merge、发布或删除；仅在用户明确要求相应动作时执行。
