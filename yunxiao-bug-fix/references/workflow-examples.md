# 工作流示例

本文档是 `SKILL.md` 的配套示例，提供真实场景下使用云效 Bug 修复技能的详细流程。文中所有云效 MCP 工具名一律以 `mcp__yunxiao__*`（双下划线）为准；示例中的 JS 伪代码仅用于说明调用关系，不是可直接运行的代码。

> 关于状态 ID：下文出现的状态 ID 均为示例值（用占位符或注释标注）。各组织工作流模板的状态 ID 各不相同（实测某组织「已修复」是 `29` 而非通用值），实际必须以 `mcp__yunxiao__get_work_item_workflow` 的查询返回为准，切勿写死。

> 关于留言：云效留言中含 emoji 会触发 400 错误，因此所有展示给用户、写入工单的文本一律用纯文本，不带 emoji。

## 示例 1：处理直接 Bug 链接

**用户输入：**
```
请修复这个 bug：https://devops.aliyun.com/projex/project/xxx/bug/TXRP-592
```

**Agent 工作流：**

1. **提取 Bug ID**：从 URL 解析得到 `TXRP-592`

2. **初始化环境**：
   ```javascript
   const { organizationId, userId } = await mcp__yunxiao__get_current_organization_info()
   ```

3. **获取 Bug 详情**：
   ```javascript
   const bug = await mcp__yunxiao__get_work_item({
     organizationId,
     workItemId: "TXRP-592"
   })
   ```

4. **展示供确认**：
   ```markdown
   ## Bug 详情

   **Bug ID:** TXRP-592
   **标题:** 移动端登录按钮无响应
   **状态:** 待处理 | **优先级:** 高

   **问题描述：**
   在移动设备（iOS Safari）上点击登录按钮时，
   没有任何反应。桌面端正常。

   **是否开始修复此 Bug？**
   - 回复"确认"继续
   ```

5. **等待用户确认**：用户回复"确认"

6. **获取完整上下文**：
   - 获取评论
   - 获取附件列表
   - 下载截图

7. **定位代码**：搜索登录按钮组件

8. **修复并展示**：展示修复计划，等待最终确认

9. **更新云效**：用户确认后，更新状态并添加评论

## 示例 2：搜索"我的 Bug"

**用户输入：**
```
显示我的待处理 bug
```

**Agent 工作流：**

1. **初始化环境**：
   ```javascript
   const { organizationId, userId } = await mcp__yunxiao__get_current_organization_info()
   ```

2. **搜索工作项**：
   ```javascript
   const bugs = await mcp__yunxiao__search_workitems({
     organizationId,
     category: "Bug",
     assignedTo: "self",
     statusStage: "1,2", // 排除已关闭
     includeDetails: true,
     orderBy: "priority",
     sort: "desc"
   })
   ```

3. **展示 Bug 列表**：
   ```markdown
   ## 你的待处理 Bug（共 3 个）

   ### TXRP-592 - 登录按钮无响应
   **优先级:** 高 | **状态:** 待处理

   ### TXRP-593 - 头像上传失败
   **优先级:** 中 | **状态:** 进行中

   ### TXRP-594 - 错误提示文案错误
   **优先级:** 低 | **状态:** 待处理

   **请选择要修复的 Bug：**
   回复 Bug 编号（如 "TXRP-592"）
   ```

4. **等待用户选择**：用户回复"修复 TXRP-592"

5. **继续标准流程**：同示例 1，从步骤 6 开始

## 示例 3：搜工单的其它变体（高优先级 / 最近创建 / 关键词）

它们与示例 2 完全同构——都是「初始化环境 → `search_workitems`（只换几个参数）→ 展示列表 → 等用户选」，差异仅在传给 `search_workitems` 的参数。固定骨架同示例 2，按场景替换下表参数即可（完整参数映射见 `SKILL.md` 阶段 0.5）：

| 用户意图 | 在示例 2 基础上改/加的参数 |
|---|---|
| 高优先级 bug | `orderBy: "priority", sort: "desc"`；去掉 `assignedTo`（看全部） |
| 最近创建的 bug | `orderBy: "gmtCreate", sort: "desc"`，再按需 `perPage` 调大；拿到后按日期过滤 |
| 关键词搜索（如"支付"相关） | `subjectDescription: "支付"`（标题+描述模糊匹配） |

其余字段（`category: "Bug"`、`statusStage: "1,2"` 排除已关闭、`includeDetails: true`）保持不变。

## 示例 4：处理附件

**用户输入：**
```
修复 TXRP-595
```

**Agent 工作流（步骤 3 - 获取上下文）：**

1. **获取工作项详情**

2. **获取评论**

3. **获取附件列表**：
   ```javascript
   const attachments = await mcp__yunxiao__list_workitem_attachments({
     organizationId,
     workItemId: "TXRP-595"
   })
   // 返回: [{ id: "123", name: "screenshot.png", ... }]
   ```

4. **下载每个截图**：
   ```javascript
   for (const attachment of attachments) {
     const { downloadUrl } = await mcp__yunxiao__get_workitem_file({
       organizationId,
       workitemId: "TXRP-595",
       id: attachment.id
     })

     // 使用 curl 下载
     await executeBash(`curl -L -o "${attachment.name}" "${downloadUrl}"`)

     // 查看下载的文件
     await readFile(attachment.name)
   }
   ```

5. **分析截图**：检查截图中显示的视觉问题

6. **继续修复**

## 示例 5：容错的状态更新

**用户输入：**
```
将 TXRP-592 更新为"开发完成"
```

**Agent 工作流：**

1. **读取当前工作项**：
   ```javascript
   const workItem = await mcp__yunxiao__get_work_item({
     organizationId,
     workItemId: "TXRP-592"
   })
   ```

2. **尝试状态更新**（状态 ID 为示例值，实际以工作流查询返回为准）：
   ```javascript
   try {
     await mcp__yunxiao__update_work_item({
       organizationId,
       workItemId: "TXRP-592",
       updateWorkItemFields: {
         status: "<开发完成状态ID>" // 示例值，不可写死；以 get_work_item_workflow 查询为准
       }
     })
   } catch (error) {
     // 状态 ID 可能对这个项目不正确，进入下一步动态查询
   }
   ```

3. **如果失败，查询工作流拿正确的状态 ID**：
   ```javascript
   const workflow = await mcp__yunxiao__get_work_item_workflow({
     organizationId,
     workItemId: "TXRP-592"
   })

   // 从工作流返回里按名称匹配"开发完成"的真实状态 ID
   const devCompleteStatus = workflow.statuses.find(
     s => s.name === "开发完成" || s.name.includes("开发完成")
   )
   ```

4. **使用查询到的真实 ID 重试**：
   ```javascript
   await mcp__yunxiao__update_work_item({
     organizationId,
     workItemId: "TXRP-592",
     updateWorkItemFields: {
       status: devCompleteStatus.id
     }
   })
   ```

5. **添加评论**：记录状态变更

> 要点：状态 ID 不要写死。直接拿一个假定的 ID 去更新，在不同组织的工作流模板下很可能失败；正确做法是先 `mcp__yunxiao__get_work_item_workflow` 查询，再按名称匹配出真实 ID 后更新。

## 示例 6：完整的修复流程

**用户输入：**
```
我已经确认 TXRP-592 的修复
```

**Agent 工作流：**

1. **查询工作流拿到"已修复"状态 ID**（不同组织 ID 不同，必须动态查）：
   ```javascript
   const workflow = await mcp__yunxiao__get_work_item_workflow({
     organizationId,
     workItemId: "TXRP-592"
   })
   const fixedStatus = workflow.statuses.find(
     s => s.name === "已修复" || s.name.includes("已修复")
   )
   ```

2. **更新状态为"已修复"**：
   ```javascript
   await mcp__yunxiao__update_work_item({
     organizationId,
     workItemId: "TXRP-592",
     updateWorkItemFields: {
       status: fixedStatus.id // 取自上一步查询结果，切勿写死
     }
   })
   ```

3. **添加结构化评论**（四要素：根因 / 修复方案 / 影响范围 / 回归建议，纯文本无 emoji）：
   ```javascript
   await mcp__yunxiao__create_work_item_comment({
     organizationId,
     workItemId: "TXRP-592",
     content: `## 根因
登录按钮的 CSS z-index 设置过低（为 1），导致点击事件被遮罩层元素拦截，
在移动设备（iOS Safari）上表现为点击无响应；桌面端层级关系不同故正常。

## 修复方案
- 将登录按钮 z-index 从 1 提升到 100，使其位于遮罩层之上。
- 给遮罩层添加 pointer-events: none，避免拦截下层点击事件。

## 影响范围
- 修复：移动端（iOS Safari / Chrome mobile / Android 浏览器）登录按钮点击无响应。
- 保留：桌面端原有交互与样式不变。
- 涉及文件：src/components/LoginButton.vue、src/styles/mobile.css。

## 回归建议
1. 打开移动浏览器（iOS Safari）进入登录页。
2. 点击登录按钮，应出现加载指示器并成功登录。
3. 在 Chrome mobile、Android 浏览器各复测一遍。
4. 桌面端回归一次，确认无样式或交互回退。`
   })
   ```

4. **确认成功**：向用户显示确认信息

> 贯穿各示例的原则（渐进式披露、用户确认、容错、完整上下文、结构化输出）以 `SKILL.md` 的铁律与阶段说明为准，此处不再重述。
