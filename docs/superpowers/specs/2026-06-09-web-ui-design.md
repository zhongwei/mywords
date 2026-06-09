# Web UI Design: mywords 前端

## 概述

为 mywords 单词学习工具的 axum HTTP server 添加 Web UI。使用 Bun + React + shadcn + Three.js 构建 SPA 前端，通过 rust-embed 嵌入到 Rust 二进制中，实现单一二进制部署。

## 技术栈

| 类别 | 技术 |
|------|------|
| 运行时/包管理 | Bun |
| UI 框架 | React 19 + TypeScript |
| 构建工具 | Vite |
| 2D 样式 | Tailwind CSS 4 + shadcn/ui |
| 3D 渲染 | Three.js via @react-three/fiber |
| 3D 工具 | @react-three/drei, @react-three/postprocessing |
| 2D 动画 | framer-motion |
| 路由 | React Router |
| 服务端状态 | TanStack Query (React Query) |
| 后端集成 | rust-embed + mime_guess |
| i18n | 轻量 key-value 方案 + localStorage |

## 架构

**方案**: 纯 SPA + rust-embed 嵌入

- 前端在 `web/` 目录独立开发，Vite dev server 代理 API 到后端
- `bun run build` 生成 `web/dist/`
- `rust-embed` 编译时将 `web/dist/` 嵌入 Rust 二进制
- axum 同时服务 API (`/api/*`) 和前端静态文件，未匹配路径返回 `index.html` 支持 SPA 路由

## 3D 效果

| 场景 | 效果 | 实现方式 |
|------|------|----------|
| 全局背景 | 浮动几何粒子 + 渐变雾气 | R3F Canvas + drei Points/Stars |
| 单词卡片 | 3D 翻转动画（正面英文/背面中文） | R3F mesh + spring 动画 |
| 复习卡片 | 3D 翻转 + 滑入滑出 | R3F + framer-motion |
| 测验答题 | 答对粒子爆炸 / 答错震动 | R3F instancedMesh 粒子 + postprocessing |
| 仪表盘 | 3D 柱状图 + 环形进度条 | R3F CylinderGeometry / TorusGeometry |
| 侧边栏 | 玻璃拟态 + 轻微 3D 倾斜 | CSS backdrop-blur + framer-motion |

**性能策略**:
- Dashboard 和 Quiz 使用完整 3D 场景
- WordsList / WordDetail 使用轻量 3D（仅卡片交互）
- Review 页面背景 3D 简化，专注交互
- 页面切换时卸载 R3F Canvas，不常驻
- 使用 Suspense + fallback loading spinner

## 页面

### 1. Dashboard — `/`
- 3D 粒子动态背景（全屏 canvas 层）
- 统计卡片：今日待复习数、已掌握数、总学习天数、正确率
- 3D 柱状图：近 7 天复习量（R3F CylinderGeometry）
- 3D 环形进度条：整体掌握进度（R3F TorusGeometry）
- 快捷入口：开始复习、开始测验

### 2. WordsList — `/words`
- 搜索栏 + 筛选器（source/stage/status 下拉菜单）
- 3D 卡片网格，鼠标悬停浮起并倾斜
- 分页器
- 点击卡片进入详情

### 3. WordDetail — `/words/:id`
- 3D 翻转主卡片：正面 word + phonetic，背面 meaning_cn + meaning_en
- 2D 面板（shadcn Tabs）：例句 / 同义词 / 词根词缀 / 搭配 / 派生词
- 学习状态徽章
- 返回列表按钮

### 4. Review — `/review`
- 3D 卡片式复习：正面单词，点击翻转显示释义
- 底部 5 个评分按钮（SM-2 quality 0-5）：Again / Hard / Good / Easy / Perfect
- 提交后 3D 滑出动画，下一张滑入
- 右上角进度：第 N 张 / 共 M 张

### 5. Quiz — `/quiz`
- 配置面板：选择题数量、来源（GRE/TOEFL）、题型
- 3D 选项卡片：4 选项以 3D 卡片排列
- 答对：粒子爆炸 + 绿色 Bloom；答错：震动 + 红色 Glitch
- 结果页：3D 分数展示 + 详细对错列表

## 项目结构

```
mywords/
├── src/                        # Rust 后端（已有）
│   ├── main.rs                 # 增加 static_files 模块 + fallback handler
│   ├── static_files.rs         # 新增：rust-embed 静态文件服务
│   └── ...
├── web/                        # 前端项目（新建）
│   ├── package.json
│   ├── bun.lock
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── components.json         # shadcn 配置
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── lib/
│   │   │   ├── api.ts          # fetch 封装
│   │   │   └── i18n.ts         # 中英文切换
│   │   ├── components/
│   │   │   ├── ui/             # shadcn 组件
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── MainLayout.tsx
│   │   │   ├── shared/
│   │   │   │   ├── CanvasBackground.tsx
│   │   │   │   ├── Card3D.tsx
│   │   │   │   └── ParticleExplosion.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── StatsCards.tsx
│   │   │   │   ├── Bar3D.tsx
│   │   │   │   └── RingProgress3D.tsx
│   │   │   ├── words/
│   │   │   │   └── WordCard3D.tsx
│   │   │   ├── review/
│   │   │   │   └── ReviewCard3D.tsx
│   │   │   └── quiz/
│   │   │       ├── QuizOption3D.tsx
│   │   │       └── QuizEffect.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── WordsList.tsx
│   │   │   ├── WordDetail.tsx
│   │   │   ├── Review.tsx
│   │   │   └── Quiz.tsx
│   │   ├── hooks/
│   │   │   ├── useWords.ts
│   │   │   ├── useReview.ts
│   │   │   ├── useQuiz.ts
│   │   │   └── useLocale.ts
│   │   └── locales/
│   │       ├── zh.ts
│   │       └── en.ts
│   └── dist/                   # 构建产物（.gitignore）
└── Cargo.toml                  # 增加 rust-embed, mime_guess
```

## Rust 后端变更

### 新增依赖 (Cargo.toml)
- `rust-embed = "8"` — 编译时嵌入静态文件
- `mime_guess = "2"` — Content-Type 推断

### 新增 `src/static_files.rs`
```rust
#[derive(rust_embed::RustEmbed)]
#[folder = "web/dist/"]
struct Asset;

pub async fn static_handler(uri: axum::http::Uri) -> impl axum::response::IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };
    match Asset::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            ([(axum::http::header::CONTENT_TYPE, mime.as_ref())], content.data)
        }
        None => match Asset::get("index.html") {
            Some(content) => (
                [(axum::http::header::CONTENT_TYPE, "text/html")],
                content.data,
            ),
            None => axum::http::StatusCode::NOT_FOUND.into_response(),
        }
    }
}
```

### `main.rs` 变更
- 添加 `mod static_files;`
- Router 末尾添加 `.fallback(static_files::static_handler)`
- 开发模式：`MYWORDS_DEV=1` 环境变量跳过静态文件服务

## 数据流

### API 客户端 (`lib/api.ts`)
- 基于 fetch 的轻量封装，自动加 `/api` 前缀
- 统一错误处理，解析 AppError JSON 格式

### 状态管理
- 使用 TanStack Query 管理服务端状态（缓存、重试、自动刷新）
- 自定义 hooks (`useWords`, `useReview`, `useQuiz`) 封装数据获取
- 页面级状态用 `useState` / `useReducer`

### i18n
- 轻量 key-value 映射，无重型 i18n 库
- `useLocale` hook + `LocaleContext`
- 语言偏好存 localStorage
- UI 文本双语，API 数据原样展示

## 构建与开发

### 开发模式
```bash
# 终端 1：启动后端
cargo run

# 终端 2：启动前端（HMR）
cd web && bun run dev
```
Vite 配置 proxy 将 `/api` 请求转发到 `localhost:3000`。

### 生产构建
```bash
cd web && bun run build && cd .. && cargo build --release
```
生成单一二进制，包含前后端。

### .gitignore 追加
```
web/dist/
web/node_modules/
```
