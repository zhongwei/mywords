# 可收缩侧边栏 + 紧凑单词卡片 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把固定左侧菜单栏改成可收缩的图标导航栏（折叠到 64px），并让单词本列表每页 100 条、桌面端每行约 6–8 个紧凑卡片（词源用 G/T 单字母）。

**Architecture:** 侧栏的 `collapsed` 状态提升到 `MainLayout`（本地 `useState` + `localStorage` 持久化），通过 props 传给 `Sidebar`；`<main>` 左边距随状态在 `ml-16`/`ml-64` 间切换。单词列表网格改用 CSS `auto-fill + minmax` 自适应列数，自然落到 6–8 列并随侧栏宽度自适应。

**Tech Stack:** React 19 + TypeScript + Tailwind v4（任意值类）+ lucide-react。无后端改动。

**Spec:** `docs/superpowers/specs/2026-06-15-collapsible-sidebar-compact-cards-design.md`

---

## 关于测试（重要说明）

本项目前端**未配置任何 JS 测试运行器**（`package.json` 里无 vitest/jest，`scripts` 只有 `dev`/`build`/`lint`/`preview`）。引入测试框架属于本任务范围外的无关工作（YAGNI）。

因此本计划的验证方式为：
1. `bun run lint`（eslint）——无错误
2. `bun run build`（`tsc -b && vite build`）——成功，即类型检查 + 产物构建通过
3. 手动可视化核对（每任务给出具体核对项，对照 spec 验收标准）

> 所有 `bun` 命令均在 `web/` 目录下执行。

---

## 文件结构

| 文件 | 职责 | 本次改动 |
|---|---|---|
| `web/src/components/layout/MainLayout.tsx` | 应用外壳：持有 `collapsed` 状态，渲染 Sidebar + `<main>` | 改：加状态、动态边距 |
| `web/src/components/layout/Sidebar.tsx` | 左侧导航栏 UI | 改：接收 props、折叠/展开双态、切换按钮、tooltip |
| `web/src/pages/WordsList.tsx` | 单词本列表页 | 改：每页 100、自适应网格、紧凑卡片、G/T 徽章 |

不新增文件。`WordDetail.tsx` 不改（详情页徽章保留 `word.source` 全称）。

---

## Task 1: 可收缩侧边栏（Sidebar + MainLayout）

**Files:**
- Modify: `web/src/components/layout/Sidebar.tsx`（整体重写双态）
- Modify: `web/src/components/layout/MainLayout.tsx`（加状态 + 联动）

这两个文件紧耦合（Sidebar 新签名需要 MainLayout 传 props），作为一个原子改动一起提交，保证提交点构建通过。

- [ ] **Step 1: 重写 `Sidebar.tsx`**

完整替换 `web/src/components/layout/Sidebar.tsx` 为：

```tsx
import { NavLink } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import {
  LayoutDashboard,
  BookOpen,
  RefreshCw,
  HelpCircle,
  Languages,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const navItems = [
  { path: "/", icon: LayoutDashboard, key: "dashboard" as const },
  { path: "/words", icon: BookOpen, key: "words" as const },
  { path: "/review", icon: RefreshCw, key: "review" as const },
  { path: "/quiz", icon: HelpCircle, key: "quiz" as const },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { t, locale, setLocale } = useI18n();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div
        className={`flex border-b border-white/10 ${
          collapsed
            ? "flex-col items-center gap-2 px-2 py-4"
            : "items-center gap-3 px-6 py-5"
        }`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-bold text-white">
          M
        </div>
        {collapsed ? (
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-white">{t.app.title}</h1>
              <p className="truncate text-xs text-violet-300">{t.app.subtitle}</p>
            </div>
            <button
              onClick={onToggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            title={collapsed ? t.nav[item.key] : undefined}
            aria-label={t.nav[item.key]}
            className={({ isActive }) =>
              `flex items-center rounded-lg text-sm font-medium transition-all duration-200 ${
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5"
              } ${
                isActive
                  ? "bg-violet-500/20 text-violet-200 shadow-lg shadow-violet-500/10"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && t.nav[item.key]}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <button
          onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
          title={collapsed ? (locale === "zh" ? "English" : "中文") : undefined}
          aria-label={locale === "zh" ? "English" : "中文"}
          className={`flex w-full items-center rounded-lg text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white ${
            collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5"
          }`}
        >
          <Languages className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (locale === "zh" ? "English" : "中文")}
        </button>
      </div>
    </aside>
  );
}
```

> 备注：`PanelLeftClose` / `PanelLeftOpen` 是 lucide-react 标准图标。若该版本不可用，用 `ChevronsLeft` / `ChevronsRight` 替代（同 import 路径），`bun run build` 会以 "Module has no exported member" 报错提示。

- [ ] **Step 2: 改 `MainLayout.tsx`，持有状态并联动**

完整替换 `web/src/components/layout/MainLayout.tsx` 为：

```tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import CanvasBackground from "../shared/CanvasBackground";

const STORAGE_KEY = "mywords-sidebar-collapsed";

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === "1"
  );

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className="relative min-h-screen">
      <CanvasBackground />
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main
        className={`min-h-screen p-8 transition-all duration-300 ${
          collapsed ? "ml-16" : "ml-64"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: lint**

Run（在 `web/` 下）: `bun run lint`
Expected: 无错误。（若 eslint 报 React Hooks 规则之类，检查未引入未用 import。）

- [ ] **Step 4: build（含 tsc 类型检查）**

Run（在 `web/` 下）: `bun run build`
Expected: 成功输出到 `web/dist/`，无 TS 报错。确认 `PanelLeftClose`/`PanelLeftOpen` import 正确解析。

- [ ] **Step 5: 手动可视化核对**

启动后端 `cargo run`（:8000）+ 前端 `bun run dev`（:5173），访问 http://localhost:5173 核对：
1. 展开态：侧栏 256px，logo + 标题 + 副标题 + 4 个带文字导航项 + 底部语言切换。
2. 点击 header 右侧 close 按钮 → 侧栏平滑收缩到 64px，`<main>` 左边距同步过渡；只剩图标；logo M 下方出现展开按钮。
3. 折叠态：hover 任一导航项出现原生 tooltip 显示该项名称；语言图标可点击切换中/英。
4. 点击折叠态的展开按钮 → 平滑展开。
5. 刷新页面 → 折叠状态从 `localStorage` 恢复（DevTools Application → Local Storage → `mywords-sidebar-collapsed`）。

- [ ] **Step 6: Commit**

```bash
git add web/src/components/layout/Sidebar.tsx web/src/components/layout/MainLayout.tsx
git commit -m "feat: collapsible sidebar with icon-rail collapsed state"
```

---

## Task 2: 紧凑单词卡片（每页 100 + 自适应网格 + G/T 徽章）

**Files:**
- Modify: `web/src/pages/WordsList.tsx:28`（per_page）
- Modify: `web/src/pages/WordsList.tsx:85`（grid 类）
- Modify: `web/src/pages/WordsList.tsx:90`（卡片内边距）
- Modify: `web/src/pages/WordsList.tsx:94-96`（徽章 → G/T）

- [ ] **Step 1: 改每页为 100 条**

把 `web/src/pages/WordsList.tsx` 中 `useWords({ ... })` 调用里的 `per_page: 50` 改为 `per_page: 100`：

```tsx
  const { data, isLoading } = useWords({
    page,
    per_page: 100,
    q: q || undefined,
    source: source || undefined,
    status: status || undefined,
  });
```

- [ ] **Step 2: 网格改为自适应列**

把第 85 行的 `<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">` 改为：

```tsx
          <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-3">
```

> `grid-cols-[...]` 是 Tailwind v4 任意值类，映射到 `grid-template-columns`。`155px` 可在 150–165px 微调以稳稳落在 6–8 列。

- [ ] **Step 3: 卡片内边距 p-4 → p-3**

把卡片 `<button>` 的 `className` 中 `p-4` 改为 `p-3`（其余 hover/边框类不变）：

```tsx
              <button
                key={word.id}
                onClick={() => navigate(`/words/${word.id}`)}
                className="group rounded-xl border border-white/10 bg-white/5 p-3 text-left backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-violet-500/30 hover:bg-white/10"
              >
```

- [ ] **Step 4: 词源徽章改 G/T**

把卡片内的 `<Badge>` 改为单字母 + `title` 全称（大小写不敏感处理）：

```tsx
                <div className="flex items-start justify-between">
                  <span className="text-lg font-semibold text-white">{word.word}</span>
                  {word.source && (
                    <Badge
                      variant="outline"
                      title={word.source}
                      className="text-xs border-white/20 text-gray-400"
                    >
                      {word.source.toLowerCase() === "toefl" ? "T" : "G"}
                    </Badge>
                  )}
                </div>
```

（卡片其余部分——音标、`line-clamp-2` 释义——保持不变。）

- [ ] **Step 5: lint**

Run（在 `web/` 下）: `bun run lint`
Expected: 无错误。

- [ ] **Step 6: build**

Run（在 `web/` 下）: `bun run build`
Expected: 成功。

- [ ] **Step 7: 手动可视化核对**

http://localhost:5173/words 核对：
1. 网络请求 `per_page=100`（DevTools Network），列表加载 100 条。
2. 1440px 宽窗口、侧栏**展开**下，每行 **6–8** 张卡片；侧栏**折叠**后列数 ≥ 7。
3. 徽章显示 `G`（GRE）或 `T`（TOEFL）；hover 徽章显示全称 tooltip。
4. 卡片内容完整：单词、音标、两行释义（超出截断）；hover 放大效果保留。
5. 进入某词详情页（`/words/:id`），徽章仍为全称（`GRE`/`TOEFL`）——确认未被本次改动影响。

- [ ] **Step 8: Commit**

```bash
git add web/src/pages/WordsList.tsx
git commit -m "feat: compact word cards — 100/page, auto-fill grid, G/T badges"
```

---

## 完成判定（对照 spec 验收标准）

- [ ] Task 1 Step 5 全部核对通过（验收 1–3）
- [ ] Task 2 Step 7 全部核对通过（验收 4–6）
- [ ] `bun run lint` 与 `bun run build` 均通过（验收 7）
- [ ] （可选）`cargo build` 成功嵌入新前端产物
