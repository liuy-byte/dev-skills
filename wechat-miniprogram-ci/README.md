# wechat-miniprogram-ci

使用微信官方 `miniprogram-ci` 安全构建并上传 uni-app 微信小程序的 Agent Skill。

## 这是什么

让 AI Agent（Claude Code 等）能够：

- 对 uni-app 微信小程序执行生产构建；
- 校验构建产物目录、`project.config.json` 和 AppID；
- 使用微信官方 `miniprogram-ci` 执行上传前预检；
- 在用户确认目标 AppID 后上传体验版代码；
- 保护代码上传密钥，避免写入仓库、日志或命令输出。

默认只执行预检；真实上传需要用户明确确认 AppID。本 Skill 只上传代码，不自动提审、不发布正式版。

预检时版本号按命令行参数、`WX_MINIPROGRAM_VERSION`、项目 `package.json.version` 的顺序取值。标准 `x.y.z` 格式的 `package.json.version` 视为上次发布版本，预检会展示版本升级、特性更新、修订补丁三种候选，并要求用户明确选择；默认只建议修订补丁，不会自动采用。真实上传必须显式传入 `--version`，上传成功后将该版本写入项目 `package.json.version`，上传失败时保持原值。

## 目录结构（Agent Skills 标准）

```text
wechat-miniprogram-ci/
├── SKILL.md                    # 核心指令与安全门禁
├── README.md                   # 本文件
├── package.json                # 脚本依赖声明
├── package-lock.json           # 锁定 miniprogram-ci 依赖树
├── agents/
│   └── openai.yaml             # Codex/Agent UI 元数据
├── references/
│   └── setup.md                # 密钥、依赖与 uni-app 配置说明
└── scripts/
    └── upload-weixin.cjs       # 预检、构建、上传脚本
```

三层渐进式披露：`name` + `description`（常驻上下文）→ `SKILL.md` 正文（激活时加载）→ `references/` 和 `scripts/`（对应场景才读/执行），符合 [Agent Skills 规范](https://agentskills.io/specification)。

## 安装

把整个 `wechat-miniprogram-ci/` 文件夹放进对应工具的 Skills 目录。Claude Code、Codex 和 OpenCode 的用户级、项目级路径及完整命令见[仓库安装说明](../README.md#安装与使用)。

以下以 Codex 用户级目录为例：

```bash
mkdir -p ~/.agents/skills
cp -R wechat-miniprogram-ci ~/.agents/skills/
```

安装依赖只在 Skill 目录内执行，不要改业务项目依赖：

```bash
cd ~/.agents/skills/wechat-miniprogram-ci
CI=1 npm ci
```

## 前置条件

1. 使用小程序管理员账号在微信公众平台生成代码上传密钥。
2. 按微信平台要求配置代码上传 IP 白名单。
3. 把密钥保存在仓库外，并设置为仅当前用户可读。
4. 设置环境变量：

```bash
export WX_MINIPROGRAM_PRIVATE_KEY_PATH="$HOME/.config/wechat-miniprogram-ci/upload.key"
```

更多说明见 [`references/setup.md`](references/setup.md)。

## 怎么触发

把小程序上传、体验版、miniprogram-ci、uni-app 微信生产构建相关任务交给 Agent，例如：

```text
帮我构建并上传这个 uni-app 微信小程序体验版
用 miniprogram-ci 预检一下当前项目
上传前帮我确认 AppID 和产物目录
排查小程序 CI 上传失败
```

## 安全边界

- 不读取、不展示、不复制上传密钥正文。
- 不把密钥写进 Skill、源码、`.env*`、命令输出或提交记录。
- 未确认 AppID 时不得执行真实上传。
- 必须让用户明确选择版本升级、特性更新或修订补丁；默认只建议修订补丁。
- 候选版本仅供确认，不根据代码改动猜测版本号。
- 真实上传必须显式传入 `--version`，不使用环境变量或 `package.json.version` 作为默认值。
- 只在真实上传成功后更新 `package.json.version`，上传失败时不修改。
- 只上传代码，不自动提交审核、不发布正式版。
- 上传失败时保留原始错误并定位原因，不做无诊断连续重试。
