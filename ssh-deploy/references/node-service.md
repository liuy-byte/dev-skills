# Node 常驻服务部署

适用：Express/Nest 后端、Nuxt/Next SSR——凡是需要 Node 进程在服务器上常驻的服务。判断标准不是「前端还是后端」，而是**产物要不要 node 进程来跑**：SSR 项目形似前端，部署形态属于本类型；纯静态 dist 走 `frontend-dist`。

## 1. 构建与校验

```bash
pnpm build    # 或 npm run build，按 lockfile 判断包管理器
```

产物位置因框架而异，校验时认准入口文件而不只是目录存在：

| 框架 | 产物 | 远端是否需要装依赖 |
| --- | --- | --- |
| Nest / Express + tsc | `dist/` | 需要 |
| Nuxt 3 | `.output/` | 不需要（依赖已内联） |
| Next（standalone 输出） | `.next/standalone/` | 不需要；未开 standalone 则需要 |

上传集合 = 产物 + `package.json` + lockfile。**不上传本地 `node_modules`**：macOS 上编译的原生依赖（sharp、bcrypt 等）在 Linux 服务器上不能用，依赖必须在远端按 lockfile 重建。

## 2. 备份并上传

备份排除 `node_modules` 和 `backup` 自身——依赖体积大且可由备份内的 lockfile 确定性重建，代码 + lockfile 才是需要留存的状态：

```bash
ssh <host> 'mkdir -p /opt/apps/myapp/backup && [ -f /opt/apps/myapp/package.json ] && \
  tar -czf /opt/apps/myapp/backup/myapp-$(date +%Y%m%d-%H%M%S).tar.gz \
  -C /opt/apps/myapp --exclude=node_modules --exclude=backup . || true'
rsync -avz dist package.json pnpm-lock.yaml <host>:/opt/apps/myapp/
```

远端安装生产依赖（Nuxt/Next standalone 产物可跳过）：

```bash
ssh <host> 'cd /opt/apps/myapp && npm ci --omit=dev'   # 或 pnpm install --prod --frozen-lockfile
```

安装前先确认远端 Node 版本满足 `package.json` 的 `engines`（`ssh <host> 'node -v'`）；不满足时停下报告，不擅自在服务器上升级 Node。

## 3. 重启

先弄清服务现在归谁管：`pm2 ls` 和 `systemctl status myapp` 各看一眼。同一服务同时被 pm2 和 systemd 拉起会互相打架，发现双托管先向用户报告。

pm2 托管（Node 生态最常见）：

```bash
ssh <host> 'pm2 reload myapp && pm2 save'
```

- `reload` 是平滑重启（cluster 模式下逐个换 worker、零停机），日常部署优先于 `restart`。
- `pm2 save` 固化进程列表，漏掉它服务器重启后 pm2 不会拉起服务；`pm2 startup` 未配置过的机器要提示配置，否则 `save` 了也没用。
- 首次部署用 `pm2 start`，建议引导用户写 `ecosystem.config.js` 而不是裸命令行——启动参数进 git，机器换了也能复现。

systemd 托管的与 springboot-jar 一节同理：`sudo systemctl restart myapp`。

## 4. 健康检查

```bash
ssh <host> 'for i in $(seq 1 12); do curl -fsS -m 5 http://127.0.0.1:3000/health && exit 0; sleep 5; done; exit 1'
ssh <host> 'pm2 ls'
```

pm2 下看两个信号：status 为 `online`，且 `↺`（restarts 计数）没有持续上涨——进程反复 crash 再被 pm2 拉起时，瞬间看 status 也是 `online`，restarts 数会出卖它。隔几秒看两次再下结论。

日志：

```bash
ssh <host> 'pm2 logs myapp --nostream --lines 100'   # pm2
ssh <host> 'journalctl -u myapp -n 100 --no-pager'   # systemd
```

## 5. 回滚

先清掉配置声明的产物子目录（只清它，不动 `backup/` 和 `node_modules/`），再解备份、按备份内 lockfile 重装依赖、重启、健康检查：

```bash
ssh <host> 'cd /opt/apps/myapp && rm -rf dist && tar -xzf backup/<最近一份>.tar.gz && \
  npm ci --omit=dev && pm2 reload myapp'
```

常见故障：原生依赖架构不符（`invalid ELF header` 说明 node_modules 是从本地传上去的）、Node 版本过低（`SyntaxError: Unexpected token`）、端口被旧进程占用。把日志根因摘给用户，不要只报「启动失败」。
