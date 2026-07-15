---
name: mysql-cli
description: 使用原生 mysql 命令行客户端安全连接、查询、检查和验证 MySQL 数据库。用户要求通过 mysql CLI 查看 schema、执行 SELECT、核对业务数据、分析 EXPLAIN、排查慢查询或锁、执行 SQL 文件，或在明确授权后进行 DML/DDL 时使用；默认只读、限制结果集、保护凭据，并在任何写操作前确认目标环境与影响范围。
license: MIT
---

# MySQL CLI

使用原生 `mysql` 客户端完成可审计、可验证的数据库操作。默认只读；不要把“能连接”误认为“可以写入”。

## 1. 检查客户端与目标

1. 运行 `mysql --version`，确认客户端可用并记录实现与版本；缺失时按当前操作系统给出官方安装建议。
2. 从用户明确提供的登录路径、受保护配置文件或项目说明中确定连接方式。找不到时询问连接配置方式，不要扫描或猜测秘密。
3. 明确主机、端口、数据库和环境（本地、开发、测试、预发、生产）。目标不明确时停止，并给出推荐选项让用户选择。
4. 连接后先执行身份探针，并向用户报告非敏感结果：

```sql
SELECT
  @@hostname AS hostname,
  @@port AS port,
  @@version AS version,
  DATABASE() AS database_name,
  CURRENT_USER() AS current_user,
  @@read_only AS read_only,
  @@super_read_only AS super_read_only;
```

若探针结果与预期环境不一致，不要继续执行后续 SQL。

## 2. 保护连接凭据

按以下优先级选择认证方式：

1. 使用 `mysql_config_editor` 创建的登录路径：

```bash
mysql_config_editor set --login-path=<profile> \
  --host=<host> --port=<port> --user=<user> --password
mysql --login-path=<profile> --database=<database>
```

让用户在交互提示中自行输入密码；不要代为读取、记录或回显。

2. 使用仓库外、权限为 `0600` 的 option file，通过放在首个选项位置的 `--defaults-file=<path>` 连接。不要读取或展示其中的密码。
3. 仅在交互终端中使用不带值的 `--password` / `-p`，由用户响应密码提示。

禁止：

- 使用 `-p<password>`、`--password=<password>`、含密码的 DSN 或 `MYSQL_PWD`；
- 把密码写入仓库、脚本、SQL、日志、回复、shell 历史或工具参数；
- 输出 option file、`.mylogin.cnf`、环境变量或秘密管理器返回的正文；
- 因认证失败反复尝试不同凭据。

远程连接优先使用 `--ssl-mode=VERIFY_IDENTITY --ssl-ca=<ca-file>`；环境暂不支持主机名校验时，至少说明降级风险，不要静默改为明文连接。

## 3. 默认只读查询

1. 使用最小权限的只读账号。
2. 探索性查询先看 schema、索引和行数估计，再取样；所有明细查询显式添加合理的 `LIMIT`。
3. 默认附加 `--safe-updates --show-warnings`。该选项不能代替只读账号和人工审查。
4. 多条相关查询放在同一只读事务中，并设置合理的查询超时：

```sql
START TRANSACTION READ ONLY;
SET SESSION max_execution_time = 30000;
-- SELECT / SHOW / DESCRIBE / EXPLAIN
ROLLBACK;
```

5. 只把普通 `SELECT`、`SHOW`、`DESCRIBE` 和不执行写入的 `EXPLAIN` 当作只读。以下语句即使看起来像查询，也按写操作或高风险操作处理：
   - `SELECT ... FOR UPDATE`、`LOCK IN SHARE MODE`；
   - `SELECT ... INTO OUTFILE`、`LOAD DATA`；
   - 调用存储过程、存储函数、UDF 或来源不明的 SQL 文件；
   - `EXPLAIN ANALYZE` 用于任何可能修改数据的语句。

示例：

```bash
mysql --login-path=<profile> --database=<database> \
  --safe-updates --show-warnings --batch \
  --execute='SELECT id, status FROM orders ORDER BY id DESC LIMIT 50'
```

## 4. 选择输出格式

| 目标 | 选项 |
| --- | --- |
| 人工查看小结果集 | `--table` 或 `\\G` |
| Agent 处理稳定 TSV | `--batch` |
| 只需要单列值 | `--batch --skip-column-names` |
| 大结果逐行读取 | `--batch --quick`，仍需 `LIMIT` |
| 保留未经转义的原始值 | 谨慎添加 `--raw`，避免制表符和换行破坏结构 |

只查询解决问题所需的列和行。结果包含密码散列、令牌、身份证号、手机号、邮箱或其他敏感数据时，不要原样回显；最小化展示并脱敏。

## 5. 检查 schema 与性能

- 使用 `SHOW CREATE TABLE`、`SHOW INDEX`、`INFORMATION_SCHEMA` 检查结构，不要从应用模型猜测线上 schema。
- 优先使用 `EXPLAIN FORMAT=JSON` 分析查询计划；说明实际 MySQL 版本，避免套用不兼容建议。
- 排查慢查询或锁时，先读取 `SHOW FULL PROCESSLIST`、`performance_schema` 和当前事务信息；不要自动执行 `KILL`。
- 对生产库执行诊断时限制扫描范围、结果行数和执行时间，不运行无法预估代价的全表查询。

## 6. 写操作门禁

任何 `INSERT`、`UPDATE`、`DELETE`、`REPLACE`、DDL、权限修改、`CALL`、`KILL`、`SET GLOBAL`、`FLUSH`、`RESET` 或 SQL 文件执行，都必须：

1. 确认用户明确授权该语句及目标环境；生产环境再次展示目标、SQL 摘要和风险。
2. 检查表结构、主键、约束、触发器及存储引擎。
3. 对 `UPDATE` / `DELETE` 使用完全相同的 `WHERE` 先执行 `COUNT(*)` 和限量样本查询；缺少 `WHERE` 时拒绝执行。
4. 给出预计影响行数、锁范围、备份或回滚方案，并推荐最安全的执行方式。
5. 得到确认后，在同一个客户端会话中执行事务型 DML，检查 `ROW_COUNT()`，再 `COMMIT`；失败时 `ROLLBACK`。
6. 执行后用独立只读查询验证结果并报告实际影响。

注意：

- DDL 及部分管理语句会隐式提交，不能依赖 `ROLLBACK`；执行前必须有可操作的回退方案。
- 非事务存储引擎、触发器、外部 UDF 和跨系统副作用可能无法回滚。
- 不使用 `--force`、`--skip-safe-updates` 或 `SET sql_safe_updates=0` 绕过保护，除非用户明确要求且已说明原因与风险。

## 7. 失败处理与边界

- 保留原始错误码和错误信息，区分 DNS、网络、TLS、认证、权限、语法、锁等待和查询超时；诊断后再重试。
- 权限不足时建议申请完成任务所需的最小权限，不切换到 root 或高权限账号。
- 不自动创建账号、修改授权、调整全局参数、配置复制、执行备份恢复或操作服务器文件系统。
- 不把本 Skill 扩展到应用驱动代码、ORM 或非 MySQL 数据库。
- 没有真实连接和查询证据时，不声称数据或修复已验证。
