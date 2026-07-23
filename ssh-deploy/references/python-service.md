# Python 服务部署

适用：FastAPI/uvicorn、Flask/Django + gunicorn 等以 systemd 托管的 Python 常驻服务。与 jar/dist 的本质区别：部署单元是「源码 + 依赖环境」，没有单一产物文件，链路相应变为：同步源码 → 远端重建依赖 → 重启。

## 1. 同步内容与校验

- `artifact` 通常就是项目源码目录；依赖清单（`pyproject.toml` + `uv.lock`，或 `requirements.txt`）必须在同步集合内，远端依赖全靠它精确重建。
- 排除项：`.venv`（本机架构产物，跨机无效）、`__pycache__`、`.git`、`.env`（本地开发配置常含秘密，远端应有自己的 `.env`，与 docker-compose 一节同理）。

```bash
rsync -avz --delete --dry-run \
  --exclude .venv --exclude __pycache__ --exclude .git --exclude .env --exclude backup \
  ./ <host>:/opt/apps/myapp/    # 此处只 dry-run 确认删除项；真实同步在第 2 节备份完成后执行
```

源码同步建议带 `--delete`：已删除的 `.py` 文件留在远端仍会被 import，造成「删掉的代码还在跑」的灵异现象。但 `--delete` 必须搭配上面的 exclude 保护 `.venv`、`.env`、`backup`，且先 dry-run。

## 2. 备份与同步

同步前先 tar 备份远端目录，排除 `.venv` 和 `backup` 自身——备份里有当时的 lockfile，依赖可精确还原，venv 不值得占备份体积：

```bash
ssh <host> 'mkdir -p /opt/apps/myapp/backup && [ -f /opt/apps/myapp/pyproject.toml ] && \
  tar -czf /opt/apps/myapp/backup/myapp-$(date +%Y%m%d-%H%M%S).tar.gz \
  -C /opt/apps/myapp --exclude=.venv --exclude=backup . || true'
```

备份完成后执行真实同步，参数与第 1 节的 dry-run 完全一致，仅去掉 `--dry-run`：

```bash
rsync -avz --delete \
  --exclude .venv --exclude __pycache__ --exclude .git --exclude .env --exclude backup \
  ./ <host>:/opt/apps/myapp/
```

## 3. 远端重建依赖

远端有 uv 时优先（快，且 `--frozen` 保证与 lock 完全一致）：

```bash
ssh <host> 'cd /opt/apps/myapp && uv sync --frozen --no-dev'
```

没有 uv 用 venv + pip：

```bash
ssh <host> 'cd /opt/apps/myapp && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt'
```

- venv 固定放部署目录内的 `.venv`，systemd 的 `ExecStart` 用绝对路径引用，不依赖 shell activate。
- 先确认远端 Python 版本满足 `requires-python`；不满足时停下报告，不在服务器上擅自装 Python。
- 不 `sudo pip`、不装进系统 Python——污染系统环境且无法随服务回滚。

## 4. 重启

systemd unit 模板（uvicorn 示例，注意 ExecStart 的绝对路径）：

```ini
[Unit]
Description=myapp
After=network.target

[Service]
User=deploy
WorkingDirectory=/opt/apps/myapp
ExecStart=/opt/apps/myapp/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
ssh <host> 'sudo systemctl restart myapp'
```

gunicorn 多 worker 可用 `sudo systemctl reload myapp`（HUP 平滑换 worker，不断在途请求）；uvicorn 单进程只能 restart。

**数据库迁移单独确认**：`migrate` / `alembic upgrade` 是 schema 变更，不随代码部署自动执行，也不随代码回滚自动回退。涉及迁移的部署，把迁移命令单独展示给用户、确认后执行，并提醒回滚代码不会回滚 schema。

## 5. 健康检查、日志与回滚

```bash
ssh <host> 'for i in $(seq 1 12); do curl -fsS -m 5 http://127.0.0.1:8000/health && exit 0; sleep 5; done; exit 1'
ssh <host> 'journalctl -u myapp -n 100 --no-pager'
```

没有 health 路由时退化为 `ss -ltn | grep :8000` 端口探测，并说明这只证明端口在听。

回滚 = 恢复代码 + 按备份内的 lock 重建依赖 + 重启 + 健康检查：

```bash
ssh <host> 'cd /opt/apps/myapp && tar -xzf backup/<最近一份>.tar.gz && \
  uv sync --frozen --no-dev && sudo systemctl restart myapp'
```

常见故障：依赖漏进 lock（本地 `pip install` 了但没写进清单，远端 `ModuleNotFoundError`）、Python 小版本差异（本地 3.12 远端 3.9 的语法报错）、`.env` 缺键（启动日志会直说）。把根因摘给用户，不要只报「启动失败」。
