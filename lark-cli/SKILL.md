---
name: lark-cli
description: 使用 lark-cli 命令行工具操作飞书/Lark 资源——云文档、云盘、多维表格、电子表格、日历、消息、群、审批、任务、Wiki、通讯录、妙搭应用等。用户要求用 lark-cli、把本地文件导入为飞书在线文档、创建或读取飞书文档/表格、发消息、查日历、处理审批或任务、管理 Wiki、调用飞书开放平台 API，或提到 feishu/lark/飞书 CLI 时使用；优先走高层 shortcut 和内嵌域文档、先确认身份与权限、保护认证信息，并在写操作与高风险操作前明确确认。
license: MIT
---

# Lark CLI

用 `lark-cli` 完成可追踪、可验证的飞书/Lark 操作。这个工具把飞书开放平台的能力按业务域组织起来，并为每个域自带了一份权威的内嵌文档（skill）。你的核心工作方式不是凭记忆拼命令，而是：**先认证选对身份 → 用工具自带的 help 和 skills read 查到准确用法 → 优先用高层 shortcut → 遵守 JSON 契约和高风险门禁**。

飞书（国内，feishu.cn）和 Lark（海外，larksuite.com）是同一套开放平台的两个品牌，命令完全一致，只是资源域名不同。

## 1. 确认工具与身份

1. 运行 `lark-cli --version`，确认工具可用；缺失时提示用户参照官方渠道安装，不要猜测安装方式。
2. 检查登录态，这一步决定后面所有命令能不能成功：

```bash
LARKSUITE_CLI_NO_UPDATE_NOTIFIER=1 LARKSUITE_CLI_NO_SKILLS_NOTIFIER=1 \
  lark-cli auth status --json --verify
```

关注 `identities.user.status`、`identities.user.tokenStatus`、`identities.user.scope`（已授权的权限）和 `identities.bot.status`。只报告身份是否就绪和缺哪些权限，**不要复述或回显任何 token、scope 明文以外的凭据内容**。

3. 选对身份，这是 lark-cli 最容易踩的坑。通过 `--as user` / `--as bot` 切换：

| 身份 | 适用场景 | 说明 |
| --- | --- | --- |
| `--as user`（用户身份） | 访问用户自己的资源：云盘文档、日历、邮箱、个人任务 | 需要 `lark-cli auth login` 授权 |
| `--as bot`（应用身份） | 应用级操作、访问 bot 自己的资源、自动化场景 | 只需 appId + appSecret，无需 login |

**bot 看不到、也代表不了用户的个人资源**：用 `--as bot` 查日历会返回 bot 自己的空日历，创建的文档归属 bot 而非用户。绝大多数"帮我操作飞书里的某个文档/日程/任务"都应该用 `--as user`。默认身份不确定时，先用 `lark-cli whoami` 看当前实际生效的是谁。

## 2. 找到准确的命令

不要凭记忆拼参数——lark-cli 的命令面很大且随版本演进，工具自身就是最新、最准确的文档来源。按这个顺序自查：

1. **看有哪些业务域**：`lark-cli --help` 顶部列出全部域（见下方导航表）。
2. **看某个域的命令和 shortcut**：`lark-cli <域> --help`，例如 `lark-cli drive --help`。带 `+` 前缀的是 shortcut（高层封装），有 shortcut 就优先用它，别手搓底层 API。
3. **读某个域的权威用法文档**：`lark-cli skills read lark-<域>`，例如 `lark-cli skills read lark-drive`。这份内嵌 skill 讲清楚了这个域的概念、命令选择、token 处理、失败处理和边界，是判断"该用哪个命令、参数怎么给"的依据。
4. **看某个具体 API 方法的参数和 scope**：`lark-cli schema <service>.<resource>.<method>`，例如 `lark-cli schema mail.user_mailbox.messages.list`。
5. **原生 API 兜底**：没有对应 typed 命令时才用 `lark-cli api <METHOD> <path>`。

### 业务域导航

先用这张表定位域，再 `lark-cli <域> --help` 和 `lark-cli skills read lark-<域>` 拿准确用法。不要只靠这张表拼命令。

| 域 | 用途 |
| --- | --- |
| `docs` | 飞书文档内容读写 |
| `drive` | 云盘：文件/文件夹管理、上传下载、本地文件导入为 docx/sheet/bitable/slides、导出、权限、评论、版本 |
| `markdown` | 云盘中原生 `.md` 文件的创建、读取、局部 patch、覆盖、版本 diff（不是导入为在线文档） |
| `sheets` | 电子表格操作 |
| `base` | 多维表格（Bitable）：表、字段、记录、视图、仪表盘、表单、工作流、角色权限 |
| `calendar` | 日历、日程、参与人管理 |
| `im` | 消息发送、群管理 |
| `mail` | 邮件、草稿、文件夹、邮箱联系人 |
| `approval` | 审批实例与任务的查询、处理、发起 |
| `task` | 任务、任务清单、子任务管理 |
| `contact` | 通讯录 |
| `wiki` | 知识库空间与节点管理 |
| `apps` | 妙搭（Spark/Miaoda）应用开发、部署、托管 |
| `calendar` / `vc` / `minutes` / `note` | 日历、视频会议、妙记、会议纪要 |
| `mindnotes` / `whiteboard` / `slides` / `okr` | 思维笔记、白板、幻灯片、OKR |
| `event` | 实时事件消费与管理 |
| `api` | 原生 HTTP 兜底，按路径调任意开放平台接口 |
| `schema` | 查看 API 方法的参数、类型、所需 scope |

命令优先级：**shortcut（`+verb`）> typed 命令（`<resource> <method>`）> `api` 原生调用**。越高层越稳、越少踩字段和预览兼容问题。

## 3. 处理权限不足

遇到 `missing_scope` / `permission denied` 时，根据身份分别处理，不要盲目切身份反复重试：

- **user 身份**：按业务域或具体 scope 增量授权（多次 login 的 scope 会累加）。

```bash
lark-cli auth login --domain docs --domain drive --no-wait --json   # 按域
lark-cli auth login --scope "docs:document:import" --no-wait --json  # 按具体 scope，最小权限
```

- **bot 身份**：不要执行 `auth login`。把错误里的 `console_url` 原样交给用户，引导去开发者后台开通对应 scope。

### 作为 Agent 代发起用户授权（split-flow）

当你需要帮用户完成 user 授权时，用分步流程，避免在同一轮阻塞等待：

1. 本轮执行 `lark-cli auth login --scope "<scope>" --no-wait --json`（必须带 `--no-wait --json`），从输出取 `verification_url` 和 `device_code`。
2. 用 `lark-cli auth qrcode "<verification_url>" --output <相对路径.png>` 生成二维码，把 URL 和二维码一起展示给用户（先 URL、后二维码），并明确告知："授权完成后回来告诉我，我继续后续步骤"。然后结束本轮、交还控制权。
3. 用户回复已授权后，**由你亲自执行** `lark-cli auth login --device-code <device_code>` 完成登录。

关键：不要在展示 URL 的同一轮里就阻塞轮询 `--device-code`（用户会看不到链接）；不要缓存 `verification_url` / `device_code` 复用，每次需要授权都重新发起。

## 4. 遵守 JSON 输出契约

默认 `--format json`。成功与失败的信封结构不同：

- **成功**写入 stdout、退出码 0，形如 `{"ok": true, "identity": "user", "data": {...}}`，**没有顶层 `code` 字段**。
- **失败**写入 stderr、退出码非 0，形如 `{"ok": false, "error": {"type": "...", "message": "...", "hint": "...", "missing_scopes": [...]}}`。

**判断成功用 `ok == true` 或进程退出码 0，绝不要用 `code == 0`**——成功信封里根本没有 `code`，按老式 `{"code":0}` 判断会把所有成功调用误判为失败，对写入类命令（如 `task +create`）尤其危险，会绕过幂等逻辑导致重复创建。

给脚本/机器读取时，用 `--jq <表达式>` 过滤输出，用 `--dry-run` 预览请求而不真正执行。需要稳定 JSON、屏蔽升级提示时前置：

```bash
LARKSUITE_CLI_NO_UPDATE_NOTIFIER=1 LARKSUITE_CLI_NO_SKILLS_NOTIFIER=1 <lark-cli 命令>
```

看到输出里的 `_notice.update` 时，先完成当前任务，不要为了升级提示打断工作；如仍相关，再简短告知可运行 `lark-cli update`（它会同时更新 CLI 和内嵌 skills）。

## 5. 先读取再决策

- 读文档、表格、日历、审批前，先用对应域的读取命令拿到当前状态和真实 token，不要凭 URL 猜测底层资源类型。Wiki 链接尤其如此：`/wiki/<token>` 背后可能是 docx、sheet、bitable 等不同对象，先用 `lark-cli drive +inspect --url '<url>'` 解包拿到真实 `type` 和 `token`，再做后续操作。
- 处理前先读关键字段：文档读标题与内容，审批读状态与节点，任务读清单与负责人。
- 查询命令注意默认数量上限，需要完整集合时显式加 `--limit` 或分页参数。
- 原生命令能满足时不要转 `lark-cli api`，减少字段和兼容性问题。

## 6. 安全执行写操作

飞书写操作会产生外部可见、常常不可撤销的效果（发出去的消息、建好的文档、改动的权限）。执行前：

1. 确认用户明确要求该写操作，并核对目标资源、身份（user/bot 决定归属）、关键参数。
2. 多行正文、大 JSON 优先用 stdin 或 `@file` 传入，避免 shell 转义破坏内容。
3. 路径参数（`--file`、`--output`、`@file` 等）只接受**当前工作目录下的相对路径**，传绝对路径会报 `unsafe file path`；先把文件放到 cwd 或切到文件所在目录。
4. 批量导入到同一位置（同一 `--folder-token` 或根目录）时必须**串行**执行，并发会触发服务端冲突。
5. 命令失败先保留原始错误、诊断原因再重试，避免重复创建文档/消息/任务。
6. 写完用对应的读取命令回读远端状态确认，不只看退出码；报告最终结果和可点击 URL。

## 7. 高风险操作的确认门禁（退出码 10）

lark-cli 对高风险写操作（删除、公开权限变更、owner 转移、版本删除/回滚等，`risk: high-risk-write`）有强制门禁。不带 `--yes` 调用时，会**退出码 10** 并返回 `error.type == "confirmation"` 的结构化信封（含 `action`、`risk`、`hint`）。

遇到退出码 10 时按此处理，不要当普通错误放弃、也不要静默加 `--yes` 重试：

1. **识别**：退出码 = 10 且 `error.subtype == "confirmation_required"`。
2. **向用户确认**：把 `error.action`、`error.risk` 和关键参数展示给用户，明确说明这是高风险操作，等待明确同意。可先用 `--dry-run` 打印完整请求给用户 review（`--dry-run` 不触发门禁）。
3. **用户同意** → 在**原始命令末尾追加 `--yes`** 重试。
4. **用户拒绝** → 终止，不擅自改参数或跳过门禁。

绝不允许：看到退出码 10 就默认加 `--yes` 静默重试（等于禁用门禁）、把 `confirmation_required` 当网络/权限错误处理、在用户没明确同意时追加 `--yes`。

## 操作边界

- 不回显 appSecret、accessToken 等凭据明文；不把凭据放进命令参数、URL、提交、日志或临时共享文件。
- 不通过 `lark-cli api` 绕过 typed 命令里的安全提示或权限限制。
- 不把读取请求擅自扩展成写操作，不把单资源请求扩展成批量删除/移动/权限变更。
- 权限不足时按最小权限申请对应 scope，不擅自扩大授权范围或切换到其他账号身份。
- `auth logout` 只清本机登录态；撤销服务端授权需用户自己在飞书授权管理页处理。
- 没有真实调用和回读证据时，不声称文档已创建、消息已送达或操作已生效。
