# 前端 dist 部署

适用：Vue/React 等构建出静态产物（`dist/`），远端由 nginx 等直接托管。

## 1. 构建与校验

```bash
pnpm build          # 或 npm run build，按项目 lockfile 判断包管理器
ls dist/index.html  # 产物完整性的最低标准
```

- 确认构建模式与目标环境匹配（`.env.production` 等）；把测试环境 API 地址发上生产是这类部署的头号事故。
- 检查产物体积量级是否正常，构建半途而废的 dist 也会「存在」。

## 2. 备份并同步

先在远端把当前版本整目录打包备份：

```bash
ssh <host> 'mkdir -p /var/www/backup && \
  [ -d /var/www/myapp ] && \
  tar -czf /var/www/backup/myapp-$(date +%Y%m%d-%H%M%S).tar.gz -C /var/www myapp || true'
```

再用 rsync 同步。`--delete` 会删除远端多余文件（清掉旧 hash 文件名的产物），破坏性强，所以必须先 `--dry-run` 展示将删什么、确认目标路径就是配置中的 `remoteDir`：

```bash
rsync -avz --delete --dry-run dist/ <host>:/var/www/myapp/   # 先看
rsync -avz --delete dist/ <host>:/var/www/myapp/             # 再做
```

- 注意 `dist/`（同步内容）与 `dist`（同步目录本身）的区别，写错会多套一层目录。
- 目标路径在两级及以内（如 `/var/www`、`/home/deploy`）时拒绝 `--delete`，几乎可以肯定是配错了。

## 3. 生效与健康检查

- 纯静态文件替换后 nginx 无需 reload；只有改了 nginx 配置才需要 `sudo nginx -t && sudo systemctl reload nginx`（先 `-t` 再 reload，配置错误时 reload 会带崩现有服务）。
- 健康检查：远端 `curl -fsS -m 5 http://127.0.0.1/ | head -c 200`，确认返回的是新版本的 HTML（可对比 dist 里 index.html 引用的 hash 文件名）。
- 用户反馈「没更新」时优先怀疑缓存：CDN、浏览器强缓存、`index.html` 被设置了长缓存头。定位问题即可，不要擅自去清 CDN。

## 4. 回滚

```bash
ssh <host> 'rm -rf /var/www/myapp && tar -xzf /var/www/backup/<最近一份>.tar.gz -C /var/www'
```

这里的 `rm -rf` 目标必须是配置中声明的 `remoteDir` 原文，执行前向用户展示完整命令。解包后重新做健康检查。
