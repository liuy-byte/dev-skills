---
name: ssh-deploy
description: 通过 SSH 密钥免密认证把服务安全部署到远程服务器——免密连通检测与首次配置引导（ssh-keygen / ssh-copy-id / ~/.ssh/config）、项目内 deploy.config.json 部署约定、本地构建与产物校验、先备份后覆盖、scp/rsync 传输、远端重启与健康检查、失败回滚，覆盖 Spring Boot jar、前端 dist、Node 常驻服务（pm2 / Nest / Nuxt/Next SSR）、Python 服务（uvicorn / gunicorn）、docker compose 与通用文件部署。用户要求"部署到服务器 / 发布上线 / 更新远程服务"、用 scp 或 rsync 上传产物、重启远端服务、配置 SSH 免密登录、排查免密失败，或提到 ssh-copy-id、authorized_keys、pm2、部署回滚、健康检查时使用；全程只用密钥认证不碰明文密码，部署前确认目标环境，生产环境二次确认，重启后必须健康检查。
license: MIT
---

# SSH Deploy

通过 SSH 密钥免密认证完成可确认、可回滚的服务部署。部署的风险不在「传文件」，而在「覆盖了什么、重启了什么、坏了怎么办」——所以链路上的备份、确认和健康检查一步都不省。

## 1. 检查免密连通

1. 确定目标主机后，先做免密探测（`BatchMode=yes` 禁止密码交互，失败即说明未免密或不可达）：

```bash
ssh -o BatchMode=yes -o ConnectTimeout=8 <host> 'echo SSH_OK && uname -a'
```

2. 按原始错误分类处理，不要盲目重试：
   - `Could not resolve hostname` → 主机名或 `~/.ssh/config` 别名写错；
   - `Connection timed out / refused` → 网络、防火墙或端口问题；
   - `Permission denied (publickey,...)` → 未配置免密或密钥不被接受，读取 [references/setup.md](references/setup.md) 引导用户完成首次免密配置，配好后回到本节重新探测；
   - `Host key verification failed` → 区分两种情况：`known_hosts` 中没有该主机记录（首次连接，属正常），让用户交互执行一次 `ssh <host>` 核对并接受指纹；已有记录但不匹配（指纹变化），让用户核实服务器是否重装或被替换。两种情况都不要用 `StrictHostKeyChecking=no` 绕过。
3. 全程只用密钥认证。禁止 sshpass、`SSH_ASKPASS` 注入、在命令或脚本中出现明文密码，禁止读取或回显私钥内容。探测不通过时不能退回「输密码部署」。

## 2. 读取或创建部署配置

部署参数放在项目根目录的 `deploy.config.json`，一次配置反复使用；文件不含任何秘密（免密的意义正在于此），可安全进 git。两点边界：`host` 用 `~/.ssh/config` 别名时，别名只存在于本机，协作者需在各自机器配置同名别名；公开仓库中避免 `user@内网IP` 这类暴露基础设施信息的写法，改用别名或把该文件加入 `.gitignore`。

```json
{
  "service": "myapp",
  "default": "test",
  "environments": {
    "test": {
      "host": "myserver-test",
      "type": "springboot-jar",
      "build": "mvn -B -DskipTests package",
      "artifact": "target/myapp.jar",
      "remoteDir": "/opt/apps/myapp",
      "restart": "sudo systemctl restart myapp",
      "healthCheck": "http://127.0.0.1:8080/actuator/health"
    },
    "prod": {
      "host": "myserver-prod",
      "production": true,
      "type": "springboot-jar",
      "build": "mvn -B -DskipTests package",
      "artifact": "target/myapp.jar",
      "remoteDir": "/opt/apps/myapp",
      "restart": "sudo systemctl restart myapp",
      "healthCheck": "http://127.0.0.1:8080/actuator/health"
    }
  }
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `host` | 是 | 优先用 `~/.ssh/config` 别名；也接受 `user@host` |
| `type` | 是 | `springboot-jar` / `frontend-dist` / `node-service` / `python-service` / `docker-compose` / `generic` |
| `production` | 否 | `true` 触发生产二次确认；环境名含 `prod` 视同 `true` |
| `build` | 否 | 本地构建命令；省略则直接用现有产物，须先确认产物新鲜度 |
| `artifact` | 视类型 | 本地产物路径，字符串或数组 |
| `remoteDir` | 是 | 远端部署目录，必须是绝对路径 |
| `restart` | 视类型 | 传输后在远端执行的重启/生效命令，字符串或数组 |
| `healthCheck` | 建议 | 以 `http` 开头则在远端 `curl` 该地址；否则作为远端命令执行，退出码 0 即健康 |
| `backupKeep` | 否 | 远端保留的备份份数，默认 5 |

- 环境选择顺序：用户明确指定 → 配置中的 `default` → 停下询问。绝不默认选生产。
- 文件不存在时进入初始化：按项目特征推断类型——`pom.xml` 或 `build.gradle` → `springboot-jar`；`docker-compose.yml` → `docker-compose`；`pyproject.toml` 或 `requirements.txt` → `python-service`；`package.json` 先判断是否为常驻服务（依赖含 express/nest/nuxt/next，或 start 脚本启动 node 进程）→ `node-service`，纯 vite/webpack 静态构建才是 `frontend-dist`。SSR 项目形似前端、实为 Node 服务，是最容易推错的一档，拿不准就问。生成草稿并让用户确认 `host`、`remoteDir`、`restart` 这三个无法推断的字段，再写入文件。
- 配置里出现明文密码、token、`sshpass` 时指出并要求移除，不带着秘密继续部署。

## 3. 部署前门禁

执行任何远端写操作前，向用户展示部署计划并获得确认：

```text
部署计划
- 环境：prod（生产 ⚠）
- 目标：myserver-prod（explorer@10.x.x.x）
- 类型：springboot-jar
- 产物：target/myapp.jar（12.3 MB，2026-07-23 15:02 构建）
- 远端目录：/opt/apps/myapp
- 重启命令：sudo systemctl restart myapp
- 备份策略：覆盖前备份当前版本，保留最近 5 份
```

- `production: true` 或环境名含 `prod`：明确标注生产环境并二次确认，确认内容包含主机与重启命令原文。
- 目标环境、主机与用户口头描述不一致时停止并指出差异，不做「猜对了就赚」的部署。
- 重启或回滚命令含 `sudo` 时，门禁阶段先探测 `ssh <host> 'sudo -n true'`：失败说明该用户的 sudo 需要密码，非交互执行会报 `a terminal is required`——提示用户用 `! ssh -t <host> '<命令>'` 交互执行，或为该命令配置针对性的 NOPASSWD 规则，不要等到重启步骤才暴露。
- 同一次会话内重复部署同一环境，可简化为一次确认，但环境切换后必须重新走门禁。

## 4. 执行部署

通用链路固定为：构建 → 校验产物 → 备份 → 传输 → 重启 → 健康检查。各类型的具体命令、目录布局和回滚方式读对应参考文件，只读命中的那个：

| type | 参考 |
| --- | --- |
| `springboot-jar` | [references/springboot-jar.md](references/springboot-jar.md) |
| `frontend-dist` | [references/frontend-dist.md](references/frontend-dist.md) |
| `node-service` | [references/node-service.md](references/node-service.md) |
| `python-service` | [references/python-service.md](references/python-service.md) |
| `docker-compose` | [references/docker-compose.md](references/docker-compose.md) |
| `generic` | [references/generic.md](references/generic.md) |

所有类型共同遵守：

1. **构建后校验产物**：确认文件存在、非空、修改时间晚于构建开始；构建失败绝不拿旧产物顶上。
2. **覆盖前先备份**：在远端 `<remoteDir>/backup/` 下留带时间戳的副本，清理时只删除该目录内超出 `backupKeep` 的最旧份，路径写死到 `backup/` 内，不用变量拼接的 `rm -rf`。例外：当传输使用指向 `remoteDir` 的 `rsync --delete` 时，必须用 `--exclude=backup` 保护备份目录（python-service 的做法），或把备份放在 `remoteDir` 之外（frontend-dist 的做法）——否则同步会删掉刚做的备份。
3. **传输用显式路径**：scp/rsync 的源和目标都写绝对路径；`rsync --delete` 只允许指向配置中声明的 `remoteDir`，且执行前先跑一次 `--dry-run` 展示将删除的内容。
4. **重启命令原样执行**：只执行配置或用户确认过的命令，不自行追加 `kill -9`、清缓存等「顺手」操作。
5. **重启后必须健康检查**：默认在远端执行，按固定间隔重试直至通过或超时（下方示例 12 次 × 5 秒间隔，最长约两分钟，启动慢的应用按需调大）；探测 `127.0.0.1` 的地址不要改到本机执行。

```bash
# healthCheck 为 URL 时的远端探测（重试直至通过或超时）
ssh <host> 'for i in $(seq 1 12); do curl -fsS -m 5 http://127.0.0.1:8080/actuator/health && exit 0; sleep 5; done; exit 1'
```

## 5. 失败处理与回滚

- 健康检查失败：先取证再动手——拉取服务日志（各参考文件给出对应命令），向用户展示错误摘要，并给出两个选项：修复后重新部署，或回滚到刚才的备份。用户未选择前不自动回滚。
- 回滚 = 恢复备份 + 重新执行重启 + 重新健康检查，三步完整走完才算回滚成功。
- 传输中断：重传即可，产物覆盖具有幂等性；但重启失败后不要反复重启掩盖问题。
- 保留每一步的原始错误输出。区分构建失败、传输失败、重启失败、健康检查失败四类，报告实际卡在哪一步，不笼统说「部署失败」。

## 6. 安全边界

- 不修改远端 `sshd_config`、防火墙、用户与 sudo 配置；发现需要时说明原因并让用户决定。
- 不在远端安装软件、升级系统组件，除非用户明确要求。
- 不触碰 `remoteDir` 之外的远端路径；不部署与当前项目无关的文件。
- 私钥、`known_hosts`、`authorized_keys` 的内容不读取、不回显、不写入日志或回复。
- 没有健康检查通过的证据时，不声称「部署成功」；只报告实际完成到哪一步。

## 文档自校准

使用本 Skill 时，若发现文档表述与实际行为不符（命令行为、选项效果、版本差异、环境限制等），主动向用户指出差异并附实测证据，建议修正本 SKILL.md；修正后提醒用户同步源仓库与各处已安装副本。
