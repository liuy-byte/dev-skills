# docker compose 部署

适用：远端用 docker compose 编排的服务。先确认镜像的到达方式，两条路线的流程不同：

- **路线 A（推荐）**：镜像在仓库（Docker Hub / ACR / Harbor），远端 `pull`。传的只有 compose 文件。
- **路线 B**：无镜像仓库，本地 `build` 后 `docker save` 传 tar，远端 `docker load`。

## 1. 准备与校验

```bash
docker compose config -q   # 本地先验证 compose 文件语法
```

- compose 文件中 `image:` 必须带明确 tag（版本号或 commit hash）。`latest` 无法回滚——回滚的本质是把 tag 改回上一个版本。
- 检查 compose 引用的 `.env`：远端应有自己的 `.env`，不要把本地开发用的 `.env`（常含本地密码）同步上去。`env_file` 缺失会让 `up` 直接失败，先在远端确认存在。

路线 B 额外——先确认服务器架构（`ssh <host> 'uname -m'`），构建平台必须与之一致：Apple Silicon 上默认构建的是 arm64 镜像，传到 amd64 服务器会 `exec format error`：

```bash
docker build --platform linux/amd64 -t myapp:<版本tag> .   # 按服务器实际架构调整
docker save myapp:<版本tag> | gzip > /tmp/myapp-<版本tag>.tar.gz
```

## 2. 备份并上传

备份远端当前 compose 文件（它记录着当前运行的镜像 tag，是回滚的依据）：

```bash
ssh <host> 'mkdir -p /opt/apps/myapp/backup && \
  [ -f /opt/apps/myapp/docker-compose.yml ] && \
  cp /opt/apps/myapp/docker-compose.yml /opt/apps/myapp/backup/docker-compose-$(date +%Y%m%d-%H%M%S).yml || true'
scp docker-compose.yml <host>:/opt/apps/myapp/docker-compose.yml
```

路线 B 追加：

```bash
scp /tmp/myapp-<版本tag>.tar.gz <host>:/tmp/
ssh <host> 'gunzip -c /tmp/myapp-<版本tag>.tar.gz | docker load && rm /tmp/myapp-<版本tag>.tar.gz'
```

## 3. 生效

```bash
ssh <host> 'cd /opt/apps/myapp && docker compose pull && docker compose up -d'   # 路线 A
ssh <host> 'cd /opt/apps/myapp && docker compose up -d'                          # 路线 B
```

`up -d` 只重建镜像或配置变化的容器，未变的服务不受影响——这正是希望的行为，不要加 `--force-recreate` 扩大波及面。

## 4. 健康检查

```bash
ssh <host> 'cd /opt/apps/myapp && docker compose ps'
ssh <host> 'for i in $(seq 1 12); do curl -fsS -m 5 http://127.0.0.1:<端口>/<健康路径> && exit 0; sleep 5; done; exit 1'
```

`ps` 里出现 `Restarting` 或 `Exited` 即失败，取日志：

```bash
ssh <host> 'cd /opt/apps/myapp && docker compose logs --tail 100 <服务名>'
```

## 5. 回滚

恢复备份的 compose 文件（内含旧镜像 tag）并重新 `up`：

```bash
ssh <host> 'cd /opt/apps/myapp && cp backup/<最近一份>.yml docker-compose.yml && docker compose up -d'
```

旧镜像仍在远端本地缓存中，回滚不依赖网络。之后重新健康检查。

## 6. 边界

- 不执行 `docker system prune`、`docker volume rm` 等清理命令；磁盘不足时报告并让用户决定清什么。
- volume 里是数据，回滚镜像不等于回滚数据；涉及数据库 schema 变更的部署，提醒用户镜像回滚后 schema 不会自动回退。
