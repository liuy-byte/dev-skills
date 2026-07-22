---
name: wechat-miniprogram-ci
description: 使用微信官方 miniprogram-ci 对 uni-app 微信小程序执行发布前预检、生产构建和代码上传，并保护上传密钥、校验构建产物 AppID、要求真实上传前二次确认。用户要求构建或上传微信小程序、配置小程序 CI、上传体验版代码或排查 miniprogram-ci 上传失败时使用；只上传代码，不自动提审或发布。
license: MIT
---

# 微信小程序 CI

使用 `scripts/upload-weixin.cjs` 统一执行预检、构建和代码上传。默认只预检；只有用户确认目标 AppID 后才能真实上传。

## 执行流程

1. 读取目标项目的 `AGENTS.md` 或等价开发说明。
2. 确认目标是 uni-app 微信小程序生产产物，默认使用 `dist/build/mp-weixin`，不得把 H5 或开发产物当作上传目录。
3. 确定版本号：
   - 预检按命令行参数 > `WX_MINIPROGRAM_VERSION` > `package.json.version` 取值。
   - 将 `package.json.version` 视为上次发布版本；若为标准 `x.y.z` 格式，生成三种候选：版本升级 `(x+1).0.0`、特性更新 `x.(y+1).0`、修订补丁 `x.y.(z+1)`。
   - 上传前必须向用户展示三种更新类型并让用户明确选择。默认建议“修订补丁”；不得代替用户选择或自动采用。无法生成候选时要求用户明确指定版本。
   - 真实上传必须显式传入 `--version`，不得回退到环境变量或 `package.json.version`，避免重复使用未更新的版本号。
   - 禁止使用 `0.0.0`，不得根据改动自动猜测版本号。
4. 只生成一次上传描述：
   - 优先使用用户明确给出的描述，其次使用 `WX_MINIPROGRAM_DESC`。
   - 都没有时读取目标仓库的 `git status --short`、`git diff --stat`，必要时查看相关 diff，生成简洁具体的中文描述。
   - 无法从改动判断时才回退到 `package.json.description`。
   - 描述不得包含密钥、路径、Token、个人信息等敏感内容；预检和上传必须复用同一个 `--desc`。
5. 读取仓库外上传密钥路径。优先使用 `WX_MINIPROGRAM_PRIVATE_KEY_PATH`，不得读取或展示密钥正文。
6. 目标项目存在可执行的 `bin/upload-weixin.local.sh` 时优先调用它，并原样传入参数；不得读取、展示或复制 wrapper 中的密钥配置。否则直接调用本 Skill 脚本。
7. 缺少依赖或凭据时读取 [references/setup.md](references/setup.md)。运行依赖只安装在本 Skill 内，使用 `CI=1 npm ci`：避免 `less` 的传递依赖误触发 Playwright 浏览器下载，同时保留必要的生命周期脚本。不得修改业务项目依赖。
8. 先执行不带 `--upload` 的生产构建和预检：

```bash
node scripts/upload-weixin.cjs \
  --project /path/to/uni-app-project \
  --build \
  --desc "<本次上传描述>" \
  --robot 1
```

9. 展示项目、AppID、上次发布版本、三种更新类型及候选版本、描述、机器人、产物目录和依赖版本。建议“修订补丁”，要求用户核对 AppID 并选择更新类型；得到明确选择前暂停，不得上传。不得展示密钥路径或内容。
10. 用户明确确认 AppID 和更新类型后，使用该类型对应的版本并复用预检描述执行上传：

```bash
node scripts/upload-weixin.cjs \
  --project /path/to/uni-app-project \
  --version "<用户确认更新类型后对应的版本>" \
  --desc "<预检使用的同一描述>" \
  --robot 1 \
  --upload \
  --confirm-appid "<预检得到的 AppID>"
```

11. 报告真实上传结果和包体积；上传成功后，将实际上传的显式版本写入项目 `package.json.version`，并由脚本自动 git 提交该文件（`chore(release): 体验版版本号 x.y.z`，pathspec 只含 `package.json` 不夹带其他改动；`--no-commit` 可关闭；非 git 仓库自动跳过；提交失败仅警告并提示手动提交，不影响上传结果；不自动 push）。上传失败时不得修改 `package.json`。若上传成功但写回或自动提交失败，必须分别报告各状态，不得误报为上传失败。不得把“上传成功”表述为“已提审”或“已发布”。

## 安全门禁

- 不得把上传密钥写入 Skill、源码、`.env*`、命令输出或提交记录。
- 不得在业务项目或全局环境安装 `miniprogram-ci`。
- 密钥位于 Git 工作树内时，要求其已被忽略且未被跟踪；优先使用仓库外密钥。
- 不得从 `manifest.json` 推断版本号。
- 候选版本只按 `package.json.version` 和用户选择的更新类型计算；默认建议“修订补丁”，但不得自动选择或根据代码改动猜测版本号。
- 未得到用户对更新类型的明确选择时不得上传。
- 真实上传必须显式传入 `--version`，不得仅依赖 `WX_MINIPROGRAM_VERSION` 或 `package.json.version`。
- 只在真实上传成功后把显式版本写入 `package.json.version`；上传失败时保持原值。
- 不得在未确认 AppID 时增加 `--upload`。
- 上传失败时保留原始错误并定位密钥、IP 白名单、AppID、产物、代理和证书链；不得无诊断连续重试。
- 遇到 `unable to get local issuer certificate` 时优先核对实际 Node 版本并使用系统 CA；不得设置 `NODE_TLS_REJECT_UNAUTHORIZED=0`。

## 参数与环境变量

运行 `node scripts/upload-weixin.cjs --help` 查看完整参数。常用环境变量：

- `WX_MINIPROGRAM_PRIVATE_KEY_PATH`
- `WX_MINIPROGRAM_APPID`
- `WX_MINIPROGRAM_VERSION`
- `WX_MINIPROGRAM_DESC`
- `WX_MINIPROGRAM_ROBOT`
