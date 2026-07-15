# 云效 MCP 自助配置

> **何时读本文件**:SKILL.md 阶段 0 判定云效 MCP 未配置 / 加载不到(工具不存在或没有 `YUNXIAO_ACCESS_TOKEN`)时,按下面步骤自助配置,别让用户卡住。

## 配置步骤

1. **引导用户获取个人访问令牌**(云效):
   - 打开 <https://devops.aliyun.com> 并登录
   - 右上角头像 →「个人设置」→「个人访问令牌」
   - 点「新建令牌」:填名称、选有效期;**权限范围**勾选「工作项 / 项目协作」的**读写**(要能改工单状态、加留言)
   - 创建后复制 `pt-` 开头的令牌(**仅显示一次**,关掉页面就看不到了)
   - 用普通对话向用户索取该令牌(别用选项式提问塞密钥)
2. **执行配置**(用户级全局一次即可):

```bash
claude mcp add yunxiao -s user \
  -e YUNXIAO_ACCESS_TOKEN=<用户给的令牌> \
  -- npx -y alibabacloud-devops-mcp-server
```

3. **验证**:`claude mcp get yunxiao` 显示已连接。
4. ⚠️ **通常需要重启会话**:MCP 多在会话启动时加载,当前会话可能还看不到新工具。配好后告知用户重启当前 Claude Code 会话再重新触发本 skill、从阶段 1 继续;不要在当前会话硬试。

## 安全与卸载

- 令牌只存本机安全位置(如 shell profile、系统密钥管理、Claude 用户配置),**勿写进仓库**——用用户级 MCP 配置或 `.claude/settings.local.json`。
- 卸载:`claude mcp remove yunxiao -s user`。
