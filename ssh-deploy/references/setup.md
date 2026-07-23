# 首次免密配置引导

目标：让 `ssh -o BatchMode=yes <host>` 无密码直连成功。整个过程只有「把公钥放上服务器」这一步需要密码，且必须由用户在交互终端亲自完成——不要试图代替用户输入或缓存密码。

## 1. 检查本地密钥

```bash
ls -l ~/.ssh/id_ed25519.pub ~/.ssh/id_rsa.pub 2>/dev/null
```

- 已有 `id_ed25519` 优先复用；只有旧的 `id_rsa` 也可用，无需强制换新。
- 都没有时生成新密钥（推荐 ed25519，短、快、现代 OpenSSH 全支持）：

```bash
ssh-keygen -t ed25519 -C "<用户邮箱或用途标识>"
```

- passphrase 的取舍向用户说明后由用户敲定：留空则任何拿到私钥文件的人都能登录服务器；设置 passphrase 更安全，配合 macOS 的 `ssh-add --apple-use-keychain` 可以做到「一次解锁、之后免输」。不要替用户做这个决定。
- 生成过程是交互式的，让用户在终端自己执行（Claude Code 中可提示用户用 `! ssh-keygen -t ed25519 -C "..."` 直接运行）。

## 2. 分发公钥到服务器

首选官方工具：

```bash
ssh-copy-id [-i ~/.ssh/id_ed25519.pub] [-p <端口>] <user>@<host>
```

- 这一步会要求输入服务器密码，必须由用户在交互终端执行；提示用户可用 `! ssh-copy-id ...` 在会话中运行。
- 服务器禁用了密码登录、或没有 `ssh-copy-id` 时，让用户通过已有的登录途径（控制台、堡垒机、云厂商 VNC）把公钥内容手动追加到服务器的 `~/.ssh/authorized_keys`。可以展示公钥内容（`.pub` 是公开信息），但绝不读取或展示私钥。

## 3. 配置 ~/.ssh/config 别名

别名让配置文件和命令里不出现裸 IP 与用户名，也让 `deploy.config.json` 里的 `host` 一行搞定：

```
Host myserver-prod
    HostName 203.0.113.10
    User deploy
    Port 22
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 30
```

追加前先读现有 `~/.ssh/config` 确认别名不冲突；文件权限保持 `600`。

## 4. 验证

```bash
ssh -o BatchMode=yes -o ConnectTimeout=8 <别名> 'echo SSH_OK && whoami && hostname'
```

输出 `SSH_OK` 即配置完成，回到 SKILL.md 继续部署流程。

## 5. 免密失败排查

按顺序检查，用 `ssh -v <host>` 的输出定位到哪一步被拒。注意：此时免密尚未打通，本节所有需要登上服务器执行的命令都会要求输入密码，让用户以 `! ssh ...` 的方式在交互终端自己运行：

1. **服务器端权限**（最常见）：`sshd` 对权限过宽的文件直接拒绝，要求家目录不可群写、`.ssh` 为 `700`、`authorized_keys` 为 `600`：

```bash
ssh <user>@<host> 'chmod go-w ~ && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys'
```

2. **公钥没到位**：确认 `authorized_keys` 中确有本机公钥且是完整一行（复制粘贴容易折行）。
3. **sshd 配置**：`/etc/ssh/sshd_config` 中 `PubkeyAuthentication no`、`AuthorizedKeysFile` 非默认路径、`AllowUsers`/`AllowGroups` 未包含该用户，都会导致公钥被忽略。只向用户指出问题所在；修改 `sshd_config` 和重启 `sshd` 属于高风险操作，说明改法后由用户决定并保留当前会话防失联。
4. **SELinux**（CentOS/RHEL）：家目录上下文错误会让 sshd 读不到 `authorized_keys`，可用 `restorecon -R -v ~/.ssh` 修复。
5. **用错密钥**：`ssh -v` 中看实际尝试的 IdentityFile 是否与分发的公钥配对；多密钥机器建议在 `~/.ssh/config` 里显式写 `IdentityFile` 并加 `IdentitiesOnly yes`。

## 6. 边界

- 不建议也不默认关闭服务器的密码登录；用户主动要求时，提醒先在**另一个终端**验证免密可用，再改 `PasswordAuthentication no`，避免把自己锁在门外。
- 不用 `StrictHostKeyChecking=no` 或清空 `known_hosts` 的方式绕过主机指纹校验；指纹变化时让用户核实服务器是否重装或被替换。
- 不把私钥复制到其他机器、仓库或聊天记录；需要多机部署时为每台客户端各生成一对密钥。
