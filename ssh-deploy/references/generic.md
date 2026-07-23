# 通用文件 + 自定义命令部署

适用：不属于其他五种类型的部署——二进制、脚本、配置文件分发等。这是约束最弱的模式，所以「只做配置里写明的事」在这里执行得最严格。

## 1. 配置形态

```json
{
  "host": "myserver",
  "type": "generic",
  "build": "make build",
  "artifact": ["bin/mytool", "conf/mytool.toml"],
  "remoteDir": "/opt/tools/mytool",
  "restart": [
    "sudo systemctl restart mytool"
  ],
  "healthCheck": "systemctl is-active mytool"
}
```

- `artifact` 数组中的每个路径逐一校验存在后再传，缺一个就停下问，不跳过。
- `restart` 数组按序执行，任何一条非零退出即中止后续命令并报告，不继续「碰运气」。

## 2. 执行原则

1. **命令只来自配置或用户明示**。generic 类型没有类型知识兜底，绝不推测「这种服务通常还要 …」然后自作主张追加命令。
2. **备份策略按产物形态选**：单文件 → 同名加时间戳复制到 `backup/`；目录 → `tar -czf` 打包。与其他类型一样保留 `backupKeep` 份。
3. **传输**：多文件用一次 `scp` 传完（`scp file1 file2 <host>:<dir>/`）或 rsync；目录同步默认**不带** `--delete`，除非用户明确要求且经过 `--dry-run` 确认。
4. **权限位**：脚本和二进制传输后确认可执行位还在（`scp` 会保留，经由中转或压缩包解出时未必）；必要时 `chmod +x` 只作用于刚传的文件。

## 3. 健康检查

`healthCheck` 是远端命令时直接执行，退出码 0 即健康：

```bash
ssh <host> 'systemctl is-active mytool'
ssh <host> 'pgrep -f "mytool --serve" > /dev/null'
```

配置没写 `healthCheck` 时提醒用户补上——generic 服务没有约定俗成的探测方式，缺了它「部署成功」就只是「文件传上去了」。

## 4. 回滚

恢复备份 → 重跑 `restart` 序列 → 重跑健康检查。备份是目录 tar 包时，解包目标必须是配置声明的 `remoteDir` 原文，命令展示给用户后执行。
