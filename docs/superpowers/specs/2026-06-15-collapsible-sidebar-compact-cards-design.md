# 可收缩侧边栏 + 紧凑单词卡片

- **日期**: 2026-06-15
- **范围**: 前端 (`web/`)，仅 UI/样式
- **涉及文件**: `web/src/components/layout/Sidebar.tsx`, `web/src/components/layout/MainLayout.tsx`, `web/src/pages/WordsList.tsx`

## 目标

1. 把固定的左侧菜单栏改为可收缩；折叠后变成 64px 宽的图标导航栏，内容区即时变宽。
2. 单词本列表的词汇卡片更紧凑，桌面端每行显示约 6–8 个；每页从 50 条增加到 100 条。

## 非目标 (YAGNI)

- 不加移动端汉堡菜单 / overlay 抽屉。当前应用面向桌面；列表网格已用单列兜底窄屏。
- 不做列数选择器或密度切换开关。
- 不改后端 API、不改数据模型。
- 不改 `WordDetail.tsx`（详情页空间充足，词源徽章在详情页保留 `GRE`/`TOEFL` 全称）。

## 第一部分 — 可收缩侧边栏

### 当前状态

- `Sidebar.tsx`：`<aside className="... w-64 ...">` 固定 256px。
- `MainLayout.tsx`：`<main className="ml-64 min-h-screen p-8">`，边距硬编码。
- 内容：header（logo `M` + 标题 + 副标题）、4 个 `NavLink`（Dashboard / Words / Review / Quiz，带图标 + 文本）、底部语言切换按钮。

### 设计

**折叠态** (`collapsed === true`)
- 宽度 `w-16`（64px）。
- header：只保留居中的 logo `M`；标题/副标题隐藏。
- 导航项：只显示图标，居中对齐；加 `title={t.nav[...]}`（原生 tooltip）和 `aria-label` 保持可访问性。
- 底部语言切换：只显示 `Languages` 图标；点击行为不变（中 ↔ 英），加 `title` 提示当前目标语言。
- 宽度过渡：`transition-all duration-300`。

**展开态** (`collapsed === false`)
- 与现状一致（`w-64`，完整文本）。

**切换按钮**
- 放在 header 区域：展开时显示 `PanelLeftClose` 图标，折叠时显示 `PanelLeftOpen` 图标（lucide-react，已依赖）。
- 折叠态下按钮仍可点击（header 高度/可点击区域保留）。

**联动**
- `MainLayout.tsx` 的 `<main>`：`collapsed ? "ml-16" : "ml-64"`，加 `transition-all duration-300`。

**状态管理**
- `collapsed` state 提升到 `MainLayout`（本地 `useState`），通过 props 传给 `Sidebar`。
- 初始值惰性读取 `localStorage`：key = `mywords:sidebar-collapsed`，值为 `"1"`/`"0"`，缺失时默认 `false`（展开）。
- 切换时写入 `localStorage`。
- 不引入 context（只有两个组件需要，props 足够）。

### 数据流

```
MainLayout
  ├─ useState(collapsed)  ← lazy init from localStorage
  ├─ <Sidebar collapsed onToggle />
  │     └─ 按钮 onClick → onToggle → MainLayout setState + localStorage write
  └─ <main className={collapsed ? "ml-16" : "ml-64"}>
       └─ <Outlet />
```

## 第二部分 — 紧凑单词卡片

### 当前状态

- `WordsList.tsx:28`：`per_page: 50`。
- `WordsList.tsx:85`：`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`（最多 4 列）。
- 卡片（`WordsList.tsx:87-104`）：`p-4`，单词（`text-lg`）+ 右上角 `Badge`（显示 `word.source` 全称）+ 音标 + `line-clamp-2` 释义。

### 设计

**每页 100 条**
- `WordsList.tsx:28`：`per_page: 50` → `per_page: 100`。

**网格列数（auto-fill 自适应）**
- 替换断点式 grid，改用任意值类：
  `grid-[repeat(auto-fill,minmax(155px,1fr))] gap-3`
- 桌面端自然落到 **7–8 列**；侧栏折叠后内容变宽会自动多出一列；窄屏自动降为更少列，无需手写断点。
- `155px` 是目标值，实现时可在 150–165px 区间微调，确保典型桌面分辨率（1440 / 1920 宽）下稳稳落在 6–8 列区间。验收标准见下。

**卡片内容（方案 A 完整）**
- 保留全部信息：单词（加粗）+ 音标 + 释义（`line-clamp-2`）+ 词源徽章。
- 内边距 `p-4` → `p-3`，整体更紧凑。
- 保留现有 hover 放大效果（`hover:scale-[1.02]`）。

**词源徽章（仅列表页）**
- `word.source` 为 `"GRE"` → 显示 `G`；`"TOEFL"` → 显示 `T`。
- 加 `title={word.source}` 悬停显示全称。
- 保留现有 outline 徽章样式。
- 详情页 `WordDetail.tsx` **不改**，继续显示全称。

## 验收标准

1. 点击侧栏切换按钮，侧栏在 `w-16` ↔ `w-64` 之间平滑切换，`<main>` 左边距同步过渡。
2. 折叠态：仅显示图标，hover 显示原生 tooltip；语言切换仍可工作。
3. 刷新页面后，侧栏折叠状态从 `localStorage` 恢复。
4. 单词本每页加载 100 条（网络请求 `per_page=100`）。
5. 在 1440px 宽窗口、侧栏展开下，卡片网格显示 **6–8 列**；侧栏折叠后列数 ≥ 7。
6. 列表页徽章显示 `G`/`T`；hover 显示全称；详情页徽章仍为全称。
7. `bun run lint` 通过；`bun run build` 成功（进而 `cargo build` 能嵌入新产物）。

## 风险 / 备注

- `auto-fill + minmax` 的实际列数取决于容器宽度，侧栏展开/折叠的过渡期间列数会瞬时变化——已通过 `transition-all` 平滑过渡宽度，可接受。
- 100 条/页 + 较小卡片：DOM 节点数增加，但远低于性能阈值，无需虚拟化。
