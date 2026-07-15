# git worktree 隔离与改动按工单分拣(参考)

> 本文档是 yunxiao-bug-fix SOP 的 worktree / 多 agent 隔离 / 按工单分拣专题细节,主流程见 SKILL.md 阶段 5 / 阶段 8。以下内容整段从 SKILL.md 原「git worktree 隔离修复」节剪切而来,一字未删。

## git worktree 隔离修复

当用户明确要求「用 worktree」「隔离修复」「基于当前分支隔离修复」时,把整套修复放进独立 git worktree,不污染主工作区。单 agent 单工单时**仅在用户/项目明确要求时用**,否则按常规分支流程。但下列两种情况**强烈建议默认用**:①**多个 subagent 并行修同一批仓库**(见下「⚠️ 多 agent 并行必用 worktree」);②**开工前主工作区就不干净**(见下「开工前工作区体检」)。

### 开工前工作区体检(单 agent 也要做)

**动手写代码前先花 10 秒体检主工作区**——即便你是单 agent,主工作区也可能正躺着**别人/别的 agent 的在途工作**(未提交改动、停在某 feature 分支、stash 栈里有东西)。踩过的坑:主工作区停在同事的 `feature/handover-nebz440-phase3` 且有 5 个未提交文件,直接在上面 `checkout -b` + 改文件,导致自己的改动和同事在途工作在 stash 里缠成一团,分不清、差点误提交别人的活。

- 三条体检命令:`git status --short`(有无未提交改动)、`git branch --show-current`(在哪个分支,是不是 dev/目标基线)、`git worktree list` + `git stash list`(有无别的 worktree / stash)。
- **主工作区不干净**(有未提交改动、或停在别人的 feature 分支)→ **别在上面动手**,直接**基于干净的目标分支(通常 `dev`)另开 worktree**,把自己的修复放进去(见下步骤),让别人的在途工作原样留在主工作区,互不干扰。
- 主工作区干净且就在目标分支 → 按项目常规流程即可(是否用 worktree 看用户/项目要求)。

### 创建与工作

1. **基于哪个分支创建**:分两种——
   - 用户要「基于当前分支隔离」→ 从**当前 HEAD** 派生:`git worktree add <path> -b <fix/工单号> HEAD`。
   - **开工前工作区不干净 / 多 agent 并行 / 就是要干净基线** → 从**目标分支 `dev`** 派生:`git worktree add <path> -b feature/<工单号>-<切面> dev`(不携带主工作区里别人的在途改动)。
   - 若使用 `EnterWorktree`,必须先确认其 baseRef(`head` 还是默认分支),对不上就用上面的 `git worktree add` 显式指定。
2. **软链依赖(关键坑)**:worktree 只签出 git **跟踪**的文件,**没有 `node_modules`**(被 `.gitignore`)。构建前必须先 `ln -s <主仓库绝对路径>/node_modules <worktree>/node_modules`,否则构建必失败。(`dist` 同理不在 worktree,构建会新生成,勿提交。)
3. 之后**定位 / 修复 / 构建 / 提交全在 worktree 内**进行,文件路径一律用 worktree 路径。若运行时提供 worktree 切换工具,确认实际目录后再操作。
4. **收尾:合回目标分支**:在 worktree 分支提交(阶段 8),合回目标分支(如 `dev`)并 push。**合并手法按是否 ff 选**:
   - **纯 fast-forward(feature commit 的 parent == `origin/<目标分支>`)→ 别去 checkout 目标分支、别动主工作区**(主工作区可能正被别人的在途工作占着):直接 `git branch -f <目标分支> <feature 分支>`(本地目标分支未被任何 worktree checkout 时可强制快进,ff 不丢内容)+ `git push origin <目标分支>`。这是主工作区被占用时最干净的上 dev 方式,全程不碰别人的活。核实关系:`git rev-parse <feature>^` 应等于 `git rev-parse origin/<目标分支>`。
   - **非 ff(目标分支已有他人新提交)→** 用普通 `git merge`(产生 merge commit)而非 `--ff-only`;合并后**务必再构建一次**验证整体可编译。

5. **清理 worktree — 什么时候清、什么时候先别清(判定)**:

   **✅ 立即清(三条件齐了就清,别留):**
   - ① worktree 分支的 commit **已合并/推送进目标分支**(第 4 步做完);
   - ② **已核实**改动确进目标分支:`git merge-base --is-ancestor <feature 分支> <目标分支>`(退出码 0 即已并入)或 `git log --oneline <目标分支> | grep <commit>`;
   - ③ (若走了部署)部署 SUCCESS——但**部署不是清理的必要前提**,代码进了 dev 就可以清。
   - 清理命令:`git worktree remove --force <worktree 路径>` + `git branch -D <worktree 分支>`(提交已并入目标分支,删分支不丢内容)。运行时自带退出/清理工具若因 `node_modules` 软链 / `dist` / `target` 残留而拒绝,直接用这两条 git 命令更可靠。
   - **理由:隔离环境使命已尽,默认不保留**——留着占盘、且容易和后续工单的 worktree 混淆。工单即便可能 reopen 复测,也走 dev 复测即可,不必留现场。

   **⏸ 先别清(命中任一就保留):**
   - **分支还没合进目标分支**——内容只在 worktree 里,删了就真丢(这时先合并再清);
   - **不是你开的 worktree**(别人 / 别的 agent 还在用的活)——**绝不清**,连碰都别碰(本次 NEBZ-398 就没动同事的 `-wt-nebz440`);
   - 明确被告知要保留现场调试的(少见,用户显式要求时)。

   **一句话:合并进目标分支并核实后就清,唯二例外=「内容还没进主分支」或「不是你的 worktree」。**

### ⚠️ 多 subagent 并行修同一批仓库 → 必用 worktree(踩坑固化)

**症状**:主 agent 委派多个 subagent 同时修一个/一批仓库,各 subagent 自行 `git checkout -b` / `git stash` / 切分支操作**同一个共享工作区**,彼此不知道对方在动分支 → 分支被反复创建(几个空分支都指向同一 commit)、`stash` 互相踩踏、工作区混入本不属于本工单的改动、`HEAD` 停在意料外的分支。改动本身通常没丢(仍在文件/ stash 里),但**分支与 stash 关系彻底乱掉,无法干净 commit**。

**根因**:worktree 之外,一个仓库只有一个工作区 + 一个 HEAD + 一个 stash 栈,是**全局可变共享状态**;多个 agent 并发写它必然竞态。

**规则**:凡是**一次要委派 ≥2 个 subagent 改动同一个仓库**(哪怕改不同文件),就给**每个 agent 一个独立 worktree**,别让它们共用主工作区。派单 prompt 里写死「你在 worktree `<path>` 内工作,所有 git 命令和文件路径都用这个 worktree 路径,不要切分支、不要 stash 主仓库」。若用 `Agent` 工具,直接传 `isolation: "worktree"` 让运行时给每个 agent 开独立 worktree(最省心)。

- 不同仓库天然隔离(各自独立 git),**不需要** worktree;**同一仓库**多 agent 才需要。
- 每个 worktree 一条 `feature/<工单号>-<切面>` 分支,从**干净的目标分支**(通常 `dev`)派生,不是从别人半成品的工作区派生。
- 收尾按下「阶段 8」的分支合并流程,逐个 worktree 合回 → 构建 → 清理。

### 改动「按工单分拣」——一次 commit 只装一个工单

subagent 常**顺手扩大范围**:让它修 A 工单,它把相关的 B 工单也一起改了(甚至改得对)。**别让 B 的改动搭 A 的车一起 commit**——两工单的验收、回滚、部署会纠缠不清,测试也没法判断哪个现象对应哪个改动。

- 派单时在 prompt 里写死「只改本工单范围,越界改动停下报告,不要自作主张扩大」。
- 收尾发现工作区/stash 混了多工单改动时,**先分拣、再 commit,一份都别丢**。两种分拣手法:
  - **精确取回单个文件(首选,比 patch 直接)**:`git checkout <来源> -- <文件路径>` 从指定来源只取某几个文件到当前工作区/暂存区。`<来源>` 可以是 `stash@{N}`(如 `git checkout 'stash@{0}' -- src/.../NurseServiceImpl.java` 从混合 stash 里只捞出本工单那个文件)、某分支、或某 commit。踩过的坑:本工单文件和别人在途的 5 个文件一起躺在 `stash@{0}`,用这条命令只取自己的那个,其余原样留在 stash 不动。
  - **把不属于本 commit 的文件移出暂存区**:`git restore --staged <别人的文件...>`(内容仍保留在工作区,只是不进这次 commit),然后 `git commit` 就只装本工单文件。
  - **导出 patch 备份(需要落盘留底时)**:`git diff HEAD -- <该工单的文件...> > scratchpad/<工单号>.patch`;若在 stash 里则 `git stash show -p stash@{N} > full.patch` 整份导出再按文件分拣。注意 `git stash show -p stash@{N} -- <path>` **不支持 pathspec**(报 `Too many revisions`),必须整份导出后手工分拣。
- 内容对但越界的改动 → **不丢弃、单独归到它自己的工单**走正规验收,不并进当前 commit;能还原回它原本所在的分支/worktree 就还原(如把别人的在途改动 `git checkout <stash> -- <文件>` 恢复回它的 feature 分支)。
- **收尾核对「别人的工作零丢失」**:若开工时主工作区有别人的在途改动,收尾时务必确认它们仍在(原分支/其 worktree 里改动还在、或已被本人/别的 agent 迁走),`git worktree list` + `git status` 复核一眼;搅动过的 stash 留着别删(除非确认已消费),作为双保险。
