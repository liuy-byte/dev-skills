---
name: redis-cli
description: 使用原生 redis-cli 客户端安全连接、查询、检查和诊断 Redis。用户要求通过 redis-cli 查看或取样 key、核对缓存数据、排查内存与慢命令、分析大 key、诊断主从或集群状态，或在明确授权后执行写操作时使用；默认只读、用 SCAN 替代阻塞命令、保护凭据，写操作前确认目标环境与影响范围，FLUSHDB/FLUSHALL 一律不代执行。
license: MIT
---

# Redis CLI

使用原生 `redis-cli` 完成可审计、可验证的 Redis 操作。默认只读；Redis 以单线程执行命令，"看似只读"的慢命令同样会阻塞整个实例，不要把"只是查询"误认为"没有风险"。

风险有两类，都要防：一类阻塞服务端，拖垮所有客户端；另一类只挂住当前会话——等待输入或持续输出的命令在非交互 shell 中不会返回。因此一律以 `redis-cli <连接参数> <命令>` 单命令形式执行，不带命令进入交互 REPL 会挂住不返回。

## 1. 检查客户端与目标

1. 运行 `redis-cli --version`，确认客户端可用并记录版本；缺失时按当前操作系统给出官方安装建议。
2. 从用户明确提供的连接信息、受保护配置或项目说明中确定连接方式。找不到时询问连接配置方式，不要扫描或猜测秘密。
3. 明确主机、端口、逻辑库编号、部署形态（单机、主从、Sentinel、Cluster）和环境（本地、开发、测试、预发、生产）。目标不明确时停止，并给出推荐选项让用户选择。非默认逻辑库用 `-n <编号>` 作为连接参数指定——单命令模式下每次调用都是新连接，先执行 `SELECT` 对下一条命令不生效。
4. 连接后先执行身份探针，并向用户报告非敏感结果：

```bash
redis-cli <连接参数> INFO server        # redis_version、redis_mode、run_id、tcp_port
redis-cli <连接参数> INFO replication   # role、connected_slaves
redis-cli <连接参数> INFO keyspace      # 各逻辑库的 key 数量级
```

若探针结果与预期环境不一致（如预期只读从库实际 `role:master`、`redis_mode` 不符、key 数量级明显异常），不要继续执行后续命令。

## 2. 保护连接凭据

按以下优先级选择认证方式：

1. 使用用户 shell 环境中已有的 `REDISCLI_AUTH`（由 profile 或秘密管理器注入），配合 `--user` 指定 ACL 用户：

```bash
redis-cli -h <host> -p <port> --user <user> PING
```

不读取、不打印、不回显该变量的值。

2. `--askpass` 依赖交互终端（TTY）输入密码。在无 TTY 的 shell（agent 执行环境、会话内嵌命令）中它不会挂住，而是读到空密码后静默跳过 `AUTH`，以未认证身份继续执行——返回的 `NOAUTH` 容易被误判成其他问题，若实例恰好无密码则会误以为认证路径正常。这条路径必须由用户在自己的独立终端窗口执行，不要由 agent 直接运行。

优先使用只读 ACL 用户（Redis 6+，如仅授予 `+@read`）；仅有 `requirepass` 的实例没有只读保障，操作时更要克制。

禁止：

- 使用 `-a <password>`、`--pass <password>` 或含密码的 `redis://` / `rediss://` URI；也不要用 `--no-auth-warning` 压掉警告后继续走命令行密码；
- 把密码写入仓库、脚本、日志、回复、shell 历史或工具参数；
- 输出配置文件、环境变量或秘密管理器返回的密码正文；
- 因认证失败反复尝试不同凭据。

远程连接优先使用 `rediss://` 或 `--tls --cacert <ca-file>`（必要时加 `--cert` / `--key`）；不要用 `--insecure` 跳过证书校验。环境暂不支持 TLS 时，至少说明降级风险，不要静默改为明文连接。

## 3. 默认只读

1. Redis 单线程执行命令：一条慢命令会阻塞所有客户端。取数前先评估 key 规模，再决定取样方式。
2. 遍历键空间一律使用 `SCAN`（配 `MATCH` / `COUNT`），禁止 `KEYS <pattern>`；大集合用 `HSCAN` / `SSCAN` / `ZSCAN` 取样，不要 `HGETALL` / `SMEMBERS` / `LRANGE 0 -1` / `ZRANGE 0 -1` 一把全量。
3. 单个 key 的安全读取路径：先 `TYPE`、`TTL`，再看规模（`STRLEN` / `LLEN` / `HLEN` / `SCARD` / `ZCARD`、`MEMORY USAGE`——注意默认是采样估算），规模大时只取样本。
4. 以下命令即使看起来像查询，也按高风险或写操作处理：
   - 大 key 上的全量读取（上一条列出的命令）与无 `BY nosort` 的 `SORT`；
   - `MONITOR`：显著拖慢实例，仅在用户明确要求时短暂使用，并用 `timeout 5 redis-cli <连接参数> MONITOR | head -100` 这类包装限定时长与行数；
   - `BLPOP` / `BRPOP` / `BLMOVE` / `BLMPOP` / `XREAD ... BLOCK` / `WAIT` 等阻塞等待命令：不拖累服务端，但会挂住当前会话直到超时；观察队列或流改用非阻塞形式（`LRANGE` 取样、`XLEN` / `XRANGE`）或极短的超时参数；
   - `DEBUG` 全部子命令（`DEBUG SLEEP` 会直接阻塞实例）；
   - `EVAL` / `EVALSHA` / `FCALL`：脚本内容即使看似只读，也按第 6 节写操作门禁处理；
   - `GETSET`、`GETDEL`、`GETEX`、`SORT ... STORE` 这类"读名写实"命令。
5. Cluster 实例加 `-c` 跟随 `MOVED` / `ASK` 重定向；注意 `--scan` 只覆盖当前连接的节点，需要全量视图时逐主节点执行并汇总，或说明覆盖范围。

示例：

```bash
# 按模式取样 key：限速、限量
redis-cli <连接参数> --scan --pattern 'order:*' -i 0.01 | head -50

# 单个 key 的安全读取
redis-cli <连接参数> TYPE order:1001
redis-cli <连接参数> TTL order:1001
redis-cli <连接参数> MEMORY USAGE order:1001
redis-cli <连接参数> HSCAN order:1001 0 COUNT 100
```

## 4. 选择输出格式

| 目标 | 选项 |
| --- | --- |
| 人工查看小结果集 | 默认交互格式（带类型标注和转义） |
| Agent 处理稳定文本 | 输出到管道或文件时默认即 raw；需保留转义时显式 `--no-raw` |
| 导出为逗号分隔 | `--csv`，仍需限量 |
| 结构化解析 | `--json`（redis-cli 7.0+，自动使用 RESP3；需 RESP2 时加 `-2`） |
| 原始二进制值 | 谨慎使用 `--raw`，换行和制表符可能破坏结构 |

只查询解决问题所需的 key 和字段。缓存里常存放 session、token 和用户资料，一屏 `SCAN` 结果就可能全是敏感数据；结果包含令牌、手机号、邮箱等时不要原样回显，最小化展示并脱敏。

## 5. 检查与诊断

- 用 `INFO memory` / `INFO stats` / `INFO keyspace` 看内存、命中率和 key 分布，不要从应用代码猜测线上 key 形态。
- 慢命令用 `SLOWLOG GET 25` 排查；延迟用 `LATENCY HISTORY` / `LATENCY DOCTOR`（需要实例开启 `latency-monitor-threshold`）。
- 连接问题看 `CLIENT LIST`；不要自动执行 `CLIENT KILL`。
- 大 key 分析用 `--bigkeys` / `--memkeys`，热点 key 用 `--hotkeys`（要求 `maxmemory-policy` 为 LFU 系列）。这些基于 SCAN 的全键空间扫描会给实例增加负载：生产环境执行前先说明代价并得到确认，执行时加 `-i 0.01` 限速；非生产环境可直接使用。
- 诊断生产实例时限制扫描范围、输出行数和执行时长，不运行无法预估代价的全量操作。

## 6. 写操作门禁

任何写命令（`SET` / `DEL` / `UNLINK` / `EXPIRE` / `RENAME`、各数据结构的写入命令、第 3 节列出的"读名写实"命令）、`EVAL` / `EVALSHA` / `FUNCTION`、`CONFIG SET`、`CLIENT KILL`、`SWAPDB`、`BGSAVE` / `BGREWRITEAOF`，都必须：

1. 确认用户明确授权该命令及目标环境；生产环境再次展示目标实例、命令摘要和风险。
2. 写前用 `EXISTS` / `TYPE` / `TTL` 确认目标 key 现状，并把现值或样本展示给用户留作回退依据——Redis 没有回滚，覆盖和删除即时生效。
3. `MULTI` / `EXEC` 只保证打包执行，运行期错误不会回滚已执行的命令；不要把它当作可回滚事务向用户承诺。
4. 删除优先 `UNLINK`（异步释放内存）；批量删除必须 `SCAN` 分批加 `UNLINK`，禁止 `KEYS` 管道接批量 `DEL`。
5. 覆盖类写入先确认是否需要 `NX` / `XX` 语义保护；新写入的 key 确认 TTL 策略，避免缓存变成永不过期的持久数据；实例接近 `maxmemory` 时说明可能触发淘汰或 OOM 报错。
6. 执行后用独立只读命令验证（读回值、TTL、`INFO keyspace` 中 key 数变化）并报告实际影响。

**FLUSHDB / FLUSHALL 一律不代执行。** 任何环境都不由本 Skill 运行清库命令：只展示完整命令、目标实例、`INFO keyspace` 现状和影响说明，由用户自行在终端执行；执行后可协助验证结果。

## 7. 失败处理与边界

- 保留原始错误信息，区分网络/DNS、TLS、`NOAUTH` / `WRONGPASS`（认证）、`NOPERM`（ACL 权限）、`READONLY`（向从库写入）、`MOVED` / `ASK`（集群重定向，改用 `-c` 或直连正确节点）、`LOADING`（启动加载中）、`OOM`（达到 maxmemory）、`BUSY`（脚本执行中）；诊断后再重试。
- 权限不足时建议申请完成任务所需的最小 ACL 权限，不切换到管理员账号。
- 不自动执行 `SHUTDOWN`、`REPLICAOF` / `SLAVEOF`、`CLUSTER FAILOVER` 等拓扑变更，不执行 `CONFIG REWRITE`、`SCRIPT KILL` / `FUNCTION KILL`，不操作 RDB/AOF 文件和备份恢复。
- 不把本 Skill 扩展到应用客户端代码（Jedis、Lettuce、Spring Data Redis）或其他数据库与消息队列。
- 没有真实连接和命令输出证据时，不声称数据或修复已验证。
