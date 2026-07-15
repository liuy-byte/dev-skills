# yunxiao-bug-fix

云效（yunxiao / 阿里云 DevOps）缺陷工单的端到端修复技能。一个符合 [Agent Skills 开放标准](https://platform.claude.com/docs/en/agents-and-tools/agent-skills) 的 AI Agent 技能包，覆盖从「拉取工单」到「修复、构建验证、工单流转留言、代码提交」的全流程闭环。

## 这是什么

让 AI Agent（Claude Code 等）能够：

- 按工单号 / 链接拉取工单，或对「我的 bug / 高优先级 / 最近报的那个」这类模糊请求先搜工单列给用户选；
- 读懂工单四要素（账号 / 复现步骤 / 实际结果 / 预期结果），下载内嵌截图查看；
- 做能解释「全部现象」的根因定位，先对齐目标态再动手（视觉/交互类 + 业务口径/规则类）；
- 最小且零副作用地修复，构建验证；
- 把工单流转为「已修复」并留结构化评论（根因 / 修复方案 / 影响范围 / 回归建议）；
- 在特性分支提交代码，push 由用户确认。

内置若干实战铁律（根因要解释全部现象、多页共用机制优先组件级根治、预期与既有设计冲突时先请产品确认、对外动作先确认），来自真实缺陷修复中踩过的坑。

## 目录结构（Agent Skills 标准）

```
yunxiao-bug-fix/
├── SKILL.md                                  # 核心指令与工作流（Agent 激活时加载）
│                                             #   frontmatter: name / description / license / compatibility / metadata
├── README.md                                 # 本文件（给人看）
├── LICENSE                                   # MIT
└── references/                               # 渐进式披露，Agent 按需查阅
    ├── workflow-examples.md                  # 8 个端到端场景示例
    ├── status-mapping-guide.md               # 状态机模型 + 动态查询 + 容错更新
    ├── deployment-and-refactoring.md         # 流水线部署实操 + 大重构分阶段范式
    ├── worktree-and-sorting.md               # worktree 隔离 + 改动按工单分拣
    ├── db-verification-and-pitfalls.md       # 连库验证强制门禁 + 安全红线 + 案例
    ├── batch-dispatch.md                     # 批量派 subagent 模式操作规程
    └── mcp-setup.md                          # 云效 MCP 自助配置步骤
```

三层渐进式披露：`name`+`description`（常驻上下文）→ SKILL.md 正文（激活时加载）→ `references/`（对应场景才读），符合 [Agent Skills 规范](https://agentskills.io/specification)。

## 安装

把整个 `yunxiao-bug-fix/` 文件夹放进你的技能目录：

- **Claude Code（项目级）**：`<项目>/.claude/skills/`
- **Claude Code（用户级，跨项目可用）**：`~/.claude/skills/` 或 `~/.agents/skills/`

```bash
# 方式一：clone
git clone https://github.com/liuy-byte/agent-skills.git
cp -R agent-skills/yunxiao-bug-fix ~/.agents/skills/

# 方式二：已有副本，直接拷目录
cp -R /path/to/yunxiao-bug-fix ~/.agents/skills/
```

放好后重启 Agent 会话即可被识别。

## 前置依赖：云效 MCP

本技能全程依赖云效 MCP（`alibabacloud-devops-mcp-server`）读写工单。**无需手动事先配置**——首次触发时 SKILL.md 的「阶段 0」会引导你用自己的云效个人访问令牌自助配置。也可手动配置（用户级一次即可）：

```bash
claude mcp add yunxiao -s user \
  -e YUNXIAO_ACCESS_TOKEN=<你的云效令牌> \
  -- npx -y alibabacloud-devops-mcp-server
```

令牌在 <https://devops.aliyun.com> →「个人设置」→「个人访问令牌」获取，权限勾「工作项 / 项目协作」读写。**令牌只存本机安全位置，切勿写进仓库。**

## 怎么触发

把工单链接或编号丢给 Agent，或用自然语言描述：

```
修复这个 bug：https://devops.aliyun.com/projex/bug/ABCD-1234
按工单 ABCD-1234 改一下
处理我的待办 bug
看看有哪些高优先级缺陷
```

更多场景见 [`references/workflow-examples.md`](references/workflow-examples.md)。

## 设计原则

- **不绑定具体项目**：organizationId、状态 ID、构建命令等一律按当前项目/组织动态获取，不写死。各组织工作流的状态 ID 不同，一律以 `get_work_item_workflow` 查询为准（详见 [`references/status-mapping-guide.md`](references/status-mapping-guide.md)）。
- **对外/难撤销动作先确认**：工单流转、留言、`git push` 默认先经用户确认。
- **云效留言用纯文本**：含 emoji 会触发接口 400。

## License

[MIT](LICENSE)
