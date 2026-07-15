# 云效状态 ID 映射指南

> 本文档是 `SKILL.md` 的配套参考。**状态 ID 一律以 `get_work_item_workflow` 动态查询为准，文中所列的具体 ID 仅为示例值，不可照搬。** 各组织的工作流模板不同，同名状态的 ID 因项目而异，硬编码必然在某些组织上出错。

## 核心原则（务必先读）

**动态查询是唯一可靠的方式，写死状态 ID 一定会出错。**

云效每个组织/项目的工作流模板各自独立，「同一个状态名」在不同工作流里对应的 ID 完全不同。任何把状态 ID 当成「通用真值」来硬编码的做法，迟早会在某个组织上失败。

真实佐证：实测某组织缺陷（Bug）工作流里，「已修复」的 ID 是 **29**（不是下文示例里的 `100020`），「再次打开」是 **30**，「待定」是一长串十六进制（如 `281714eb...`）。这与下文示例表里列的 `100020 / 100021` 之类完全对不上。这正是「绝不能硬编码、必须动态查询」的真实证据。

因此操作任何状态更新前，**先用 `mcp__yunxiao__get_work_item_workflow` 查出该工作项当前工作流的真实状态 ID 和允许的转换**，再据此操作。下文所有 ID 表、转换路径里的数字都只是结构示例，不是查询依据。

## 状态阶段概览

云效使用三阶段状态模型。`statusStage` 是相对稳定的「阶段」抽象，跨工作流可用于粗粒度过滤；而具体的状态 ID 不稳定，必须动态查询。

| statusStage | 名称 | 说明 |
|-------------|------|------|
| 1 | 未开始 | Bug 已报告但工作未开始 |
| 2 | 进行中 | Bug 正在被处理 |
| 3 | 已关闭 | Bug 已解决并关闭 |

## 常见状态 ID（仅示例，禁止照搬）

> ⚠️ 下列 ID 仅为某些项目的示例值，各组织工作流模板不同，实际必须用 `get_work_item_workflow` 动态查询，切勿照搬。例如实测某组织缺陷工作流的「已修复」是 **29** 而非这里的 `100020`。

### 阶段 1：未开始

| 状态名称 | 示例 ID | 说明 |
|---------|--------|------|
| 待确认 | 28 | 新建，等待确认 |
| 待处理 | 100005 | 已确认，等待分配 |
| 已确认 | 32 | 已确认并分配 |

### 阶段 2：进行中

| 状态名称 | 示例 ID | 说明 |
|---------|--------|------|
| 进行中 | 100010 | 正在处理 |
| 开发完成 | 100011 | 代码修复完成，待测试 |
| 测试中 | 100012 | 正在测试 |
| 待发布 | 100013 | 修复已验证，待部署 |

### 阶段 3：已关闭

| 状态名称 | 示例 ID | 说明 |
|---------|--------|------|
| 已修复 | 100020 | Bug 已修复并验证 |
| 已关闭 | 100021 | 已关闭（可能未修复） |
| 已拒绝 | 100022 | 不是 Bug 或不修复 |
| 重复 | 100023 | 与其他 Bug 重复 |

## 动态状态查询

### 方法 1：获取特定工作项的工作流

```javascript
const workflow = await mcp__yunxiao__get_work_item_workflow({
  organizationId: "<org_id>",
  workItemId: "<work_item_id>"
})

// 响应结构（id 为该工作流的真实值，因项目而异）：
{
  statuses: [
    {
      id: "28",
      name: "待确认",
      statusStage: "1",
      description: "等待确认"
    },
    {
      id: "100011",
      name: "开发完成",
      statusStage: "2",
      description: "开发完成"
    },
    // ... 更多状态
  ],
  transitions: [
    {
      from: "28",
      to: "100010",
      name: "开始工作"
    },
    // ... 更多转换
  ]
}
```

### 方法 2：按名称查找状态

```javascript
// 辅助函数：按名称查找状态 ID
function findStatusId(workflow, statusName) {
  const status = workflow.statuses.find(s =>
    s.name === statusName ||
    s.name.toLowerCase().includes(statusName.toLowerCase())
  )
  return status?.id
}

// 使用
const devCompleteId = findStatusId(workflow, "开发完成")
```

### 方法 3：按阶段查找状态

```javascript
// 获取特定阶段的所有状态
function getStatusesByStage(workflow, stage) {
  return workflow.statuses.filter(s => s.statusStage === stage.toString())
}

// 使用
const inProgressStatuses = getStatusesByStage(workflow, 2)
// 返回所有"进行中"阶段的状态
```

## 状态转换规则

### 有效转换

并非所有状态变更都被允许。使用工作流转换来确定有效的移动：

```javascript
// 检查转换是否有效
function canTransition(workflow, fromStatusId, toStatusId) {
  return workflow.transitions.some(t =>
    t.from === fromStatusId && t.to === toStatusId
  )
}

// 获取可用的下一个状态
function getNextStatuses(workflow, currentStatusId) {
  return workflow.transitions
    .filter(t => t.from === currentStatusId)
    .map(t => workflow.statuses.find(s => s.id === t.to))
}
```

> 典型生命周期、快速修复、拒绝等转换路径，见文末「完整状态生命周期」图。具体能不能从 A 转到 B，仍以工作流返回的 `transitions` 为准。

## 容错的状态更新（始终先查询）

唯一可靠的姿势：**先查工作流 → 按名称匹配真实 ID → 校验转换允许 → 再更新**。不要先拿写死的 ID 去试（那种"先猜后回退"的写法依赖假定 ID，在不同组织上不可靠）。

```javascript
async function updateStatusReliably(organizationId, workItemId, targetStatusName) {
  // 始终先查询工作流
  const workflow = await mcp__yunxiao__get_work_item_workflow({
    organizationId,
    workItemId
  })

  // 查找正确的状态 ID
  const statusId = findStatusId(workflow, targetStatusName)
  if (!statusId) {
    throw new Error(`未找到状态"${targetStatusName}"`)
  }

  // 验证转换是否有效
  const currentWorkItem = await mcp__yunxiao__get_work_item({
    organizationId,
    workItemId
  })

  if (!canTransition(workflow, currentWorkItem.status, statusId)) {
    throw new Error(`无法从 ${currentWorkItem.status} 转换到 ${statusId}`)
  }

  // 更新状态
  await mcp__yunxiao__update_work_item({
    organizationId,
    workItemId,
    updateWorkItemFields: {
      status: statusId
    }
  })

  return { success: true }
}
```

## 搜索中的状态过滤

`statusStage` 跨工作流稳定，适合做广泛过滤；按具体 `status` ID 过滤时，ID 须先动态查询确认。

### 按状态阶段过滤

```javascript
// 获取仅未关闭的 Bug
const openBugs = await mcp__yunxiao__search_workitems({
  organizationId,
  category: "Bug",
  statusStage: "1,2" // 未开始 + 进行中
})

// 获取仅已关闭的 Bug
const closedBugs = await mcp__yunxiao__search_workitems({
  organizationId,
  category: "Bug",
  statusStage: "3" // 已关闭
})
```

### 按特定状态 ID 过滤

```javascript
// 获取待确认或待处理的 Bug（ID 为示例，需先动态查询确认）
const pendingBugs = await mcp__yunxiao__search_workitems({
  organizationId,
  category: "Bug",
  status: "28,100005" // 逗号分隔的状态 ID
})
```

### 组合阶段和状态过滤

```javascript
// 获取进行中或测试中的 Bug（ID 为示例，需先动态查询确认）
const activeBugs = await mcp__yunxiao__search_workitems({
  organizationId,
  category: "Bug",
  statusStage: "2", // 进行中阶段
  status: "100010,100012" // 特定的"进行中"或"测试中"
})
```

## 项目特定的自定义

某些云效项目有自定义状态名称（甚至自定义阶段划分），如用「开发中」而非「进行中」、「待测试」而非「测试中」。所以不要按固定名称硬匹配——用上面的 `findStatusId` 传入候选名做部分匹配，或直接把工作流返回的全部状态列给用户选。

## 最佳实践

### 应该做的

1. **始终动态查询工作流**用于生产环境
2. **缓存工作流数据**在单个 Bug 修复会话期间
3. **验证转换**在尝试状态更新前
4. **使用状态阶段过滤**减少搜索结果
5. **优雅处理缺失状态**提供清晰的错误消息

### 不应该做的

1. **不要硬编码状态 ID**在生产代码中（同名状态在不同工作流里 ID 不同，例如「已修复」可能是 29 而非 100020）
2. **不要假设状态名称**在不同项目间一致
3. **不要跳过转换验证** - 无效转换会失败
4. **不要在更新状态前不读取当前状态**
5. **不要忘记在更改状态时添加评论**（留言用纯文本，含 emoji 会触发 400）

## 故障排查

### 问题：状态更新失败

**症状：**
```
错误：无效的状态 ID
```

**解决方案：**
1. 用 `get_work_item_workflow` 查询工作流，获取该项目真实有效的状态 ID
2. 验证状态在项目中存在
3. 检查从当前状态的转换是否被允许

### 问题：找不到状态

**症状：**
```
未找到状态"开发完成"
```

**解决方案：**
1. 检查中文 vs 英文名称不匹配
2. 使用灵活匹配（部分字符串匹配）
3. 列出所有可用状态让用户选择

### 问题：不允许转换

**症状：**
```
无法从状态 A 转换到状态 B
```

**解决方案：**
1. 检查工作流转换
2. 如果不允许直接转换，查找中间状态
3. 如有必要，通过多个步骤更新

## 参考：完整状态生命周期（结构示例，非真实 ID）

```
待确认 → 已确认 → 进行中 → 开发完成 → 测试中 → 已修复 → 已关闭
   ↓        ↓                                    ↑
已拒绝    重复 ←──────────────────────────────────┘
```

（核心要点见开头「核心原则」节，此处不再重述。）
