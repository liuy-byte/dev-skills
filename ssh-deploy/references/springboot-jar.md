# Spring Boot jar 部署

适用：Maven/Gradle 构建的可执行 jar，远端以 systemd（推荐）或 nohup 方式常驻。

## 1. 构建与校验

```bash
mvn -B -DskipTests package        # 或配置中的 build 命令
ls -lh target/myapp.jar           # 存在、非空、时间晚于构建开始
```

- `-DskipTests` 是常见默认，但部署生产前问一句是否需要带测试构建。
- 多模块工程确认 `artifact` 指向的是可执行 jar（`spring-boot-maven-plugin` repackage 产物），不是 plain jar。

## 2. 备份并上传

```bash
ssh <host> 'mkdir -p /opt/apps/myapp/backup && \
  [ -f /opt/apps/myapp/myapp.jar ] && \
  cp /opt/apps/myapp/myapp.jar /opt/apps/myapp/backup/myapp-$(date +%Y%m%d-%H%M%S).jar || true'
scp target/myapp.jar <host>:/opt/apps/myapp/myapp.jar
```

清理旧备份只在 `backup/` 目录内做，保留最近 `backupKeep` 份：

```bash
ssh <host> 'cd /opt/apps/myapp/backup && ls -t myapp-*.jar | tail -n +6 | xargs -r rm --'
# tail -n +6 对应 backupKeep=5（从第 6 份开始删）；backupKeep 不同时同步调整该数字
```

## 3. 重启

systemd 服务（推荐，具备开机自启和崩溃拉起）：

```bash
ssh <host> 'sudo systemctl restart myapp && systemctl is-active myapp'
```

服务器还没有 systemd unit 时，给用户展示一份最小模板并让其确认后安装（写 `/etc/systemd/system/` 需要 sudo，属于门禁内操作）：

```ini
[Unit]
Description=myapp
After=network.target

[Service]
User=deploy
WorkingDirectory=/opt/apps/myapp
ExecStart=/usr/bin/java -jar /opt/apps/myapp/myapp.jar
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

用户坚持 nohup 方式时按其现有启动脚本执行，不要发明新的启动方式；先 `pkill -f` 精确匹配旧进程（向用户展示匹配到的进程再杀），再 `nohup java -jar ... >> app.log 2>&1 &`。

## 4. 健康检查

```bash
ssh <host> 'for i in $(seq 1 12); do curl -fsS -m 5 http://127.0.0.1:8080/actuator/health && exit 0; sleep 5; done; exit 1'
```

- 无 actuator 时退化为端口探测：`ss -ltn | grep :8080`，并说明这只证明端口在听、不证明业务正常。
- Spring Boot 启动慢是常态，超时时间跟着应用实际启动时长调，别急着判死。

## 5. 失败取证与回滚

```bash
ssh <host> 'journalctl -u myapp -n 100 --no-pager'   # systemd
ssh <host> 'tail -n 200 /opt/apps/myapp/app.log'      # nohup
```

回滚三步（恢复 → 重启 → 健康检查，缺一不可）：

```bash
ssh <host> 'cp /opt/apps/myapp/backup/<最近一份>.jar /opt/apps/myapp/myapp.jar && sudo systemctl restart myapp'
# 然后重新执行健康检查
```

常见故障：端口被占（旧进程没死干净）、JDK 版本不符（`UnsupportedClassVersionError`）、配置文件/环境变量缺失（启动日志会直说）。把日志里的根因摘出来给用户，不要只报「重启失败」。
