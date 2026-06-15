# Auto Frontend Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `cargo build` automatically produce `web/dist/` via `bun install && bun run build` whenever it is missing or stale, so a fresh clone compiles without manual frontend steps.

**Architecture:** Add a single `build.rs` at the repo root that runs before rust-embed's derive macro expands. It probes for `bun`, compares mtimes of `web/src` (+ config files) against `web/dist/index.html`, and re-runs `bun install` / `bun run build` as needed. Emit precise `cargo:rerun-if-changed` directives so pure-Rust edits do not re-invoke it. No new Rust dependencies, no `#[cfg]` feature flags, no automated tests (per spec — manual verification checklist only).

**Tech Stack:** Rust `build.rs` using `std::process::Command` and `std::fs`; bun (existing frontend toolchain).

**Spec:** `docs/superpowers/specs/2026-06-15-auto-frontend-build-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `build.rs` | **Create** | Probe bun; check staleness; run install/build; emit rerun-if-changed. Self-contained, no helpers module. |
| `AGENTS.md` | **Modify** | Correct the false "后端仍能编译/运行" claim; add bun-as-prereq note; document dev-workflow side effect. |

No other files are touched. `src/static_files.rs`, `Cargo.toml`, and `web/*` are unchanged.

---

## Task 1: Create `build.rs` with full implementation

**Files:**
- Create: `build.rs`

- [ ] **Step 1: Write the complete `build.rs`**

Create `build.rs` at the repository root with exactly this content:

```rust
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::SystemTime;

fn main() {
    // Run before rust-embed's #[derive] expands on src/static_files.rs.
    // Guarantee web/dist/ exists and is up to date, or fail loudly.

    probe_bun();

    // Tell cargo exactly when to re-invoke us. Without these, cargo's
    // default is "rerun if build.rs or Cargo.toml changed", which would
    // miss frontend edits. Note: web/dist is intentionally NOT listed
    // (it is our own output; listing it would cause loops).
    println!("cargo:rerun-if-changed=web/src");
    println!("cargo:rerun-if-changed=web/index.html");
    println!("cargo:rerun-if-changed=web/package.json");
    println!("cargo:rerun-if-changed=web/bun.lock");
    println!("cargo:rerun-if-changed=web/vite.config.ts");
    println!("cargo:rerun-if-changed=web/tsconfig.json");
    println!("cargo:rerun-if-changed=web/tsconfig.app.json");
    println!("cargo:rerun-if-changed=web/tsconfig.node.json");

    let web = Path::new("web");
    let dist_index = web.join("dist").join("index.html");

    let src_mtime = max_src_mtime(web);
    let dist_mtime = mtime_or_epoch(&dist_index);

    if src_mtime <= dist_mtime {
        return; // web/dist/ is up to date; nothing to do
    }

    println!("[mywords] building frontend (web/src is newer than web/dist)...");
    maybe_bun_install(web);
    run_bun_build(web);
}

/// Fail the build with a clear message if `bun` is not on PATH.
fn probe_bun() {
    let result = Command::new("bun").arg("--version").output();
    let ok = matches!(
        result,
        Ok(out) if out.status.success()
    );
    if !ok {
        panic!(
            "frontend build requires `bun` but it was not found on PATH.\n\
             Install it from https://bun.sh/ and retry.\n\
             If you cannot install bun right now, produce web/dist/ manually:\n\
                 cd web && bun install && bun run build"
        );
    }
}

/// Run `bun install` only when node_modules is missing or out of date.
fn maybe_bun_install(web: &Path) {
    let node_modules = web.join("node_modules");
    let modules_yaml = node_modules.join(".modules.yaml");
    let bun_lock = web.join("bun.lock");

    let need_install = !node_modules.exists()
        || !modules_yaml.exists()
        || mtime_or_epoch(&bun_lock) > mtime_or_epoch(&modules_yaml);

    if !need_install {
        return;
    }

    println!("[mywords] running `bun install` (node_modules missing or out of date)...");
    let output = Command::new("bun")
        .arg("install")
        .current_dir(web)
        .output()
        .expect("failed to spawn `bun install`");

    if !output.status.success() {
        panic!(
            "`bun install` failed in web/.\n--- stderr ---\n{}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

/// Run `bun run build`. Panic with captured stdout/stderr on failure.
fn run_bun_build(web: &Path) {
    let output = Command::new("bun")
        .arg("run")
        .arg("build")
        .current_dir(web)
        .output()
        .expect("failed to spawn `bun run build`");

    if !output.status.success() {
        panic!(
            "`bun run build` failed in web/.\n--- stdout ---\n{}\n--- stderr ---\n{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

/// Maximum mtime across the watched source set:
/// - the 7 top-level config/entry files
/// - everything under web/src/ (recursive)
fn max_src_mtime(web: &Path) -> SystemTime {
    let top_level: [PathBuf; 7] = [
        web.join("index.html"),
        web.join("package.json"),
        web.join("bun.lock"),
        web.join("vite.config.ts"),
        web.join("tsconfig.json"),
        web.join("tsconfig.app.json"),
        web.join("tsconfig.node.json"),
    ];

    let mut max = SystemTime::UNIX_EPOCH;
    for p in top_level.iter() {
        if let Some(t) = mtime_opt(p) {
            if t > max {
                max = t;
            }
        }
    }
    if let Some(t) = max_mtime_recursive(&web.join("src")) {
        if t > max {
            max = t;
        }
    }
    max
}

/// Recursive max mtime over a directory tree. Returns None if the path
/// does not exist or cannot be read. Errors on individual entries are
/// silently skipped (a missing/unreadable file cannot make us stale).
fn max_mtime_recursive(path: &Path) -> Option<SystemTime> {
    let meta = fs::metadata(path).ok()?;
    if meta.is_file() {
        return meta.modified().ok();
    }
    let mut max: Option<SystemTime> = None;
    for entry in fs::read_dir(path).ok()?.flatten() {
        if let Some(t) = max_mtime_recursive(&entry.path()) {
            max = Some(match max {
                Some(cur) if cur > t => cur,
                _ => t,
            });
        }
    }
    max
}

fn mtime_opt(path: &Path) -> Option<SystemTime> {
    fs::metadata(path).ok()?.modified().ok()
}

fn mtime_or_epoch(path: &Path) -> SystemTime {
    mtime_opt(path).unwrap_or(SystemTime::UNIX_EPOCH)
}
```

- [ ] **Step 2: Confirm it compiles**

Run: `cargo build`
Expected: succeeds. On a fresh clone (no `web/dist/`, no `web/node_modules/`), the first build will trigger `bun install` then `bun run build`; you should see the `[mywords] building frontend...` and `[mywords] running \`bun install\`...` lines, then `Compiling mywords...`, then success.

If `web/dist/` already exists and is current, you should see no `[mywords]` lines at all — build.rs is a no-op.

- [ ] **Step 3: Commit**

```bash
git add build.rs
git commit -m "build: auto-build web/dist via build.rs when missing or stale"
```

---

## Task 2: Correct and extend `AGENTS.md`

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Read the current Build & Run section**

Run: read `AGENTS.md` and locate the paragraph starting `**重要：前端必须先构建，否则后端没有 UI 可服务。**` and the section titled `## 开发工作流`.

- [ ] **Step 2: Fix the false "backend still compiles" claim**

In `AGENTS.md`, replace this paragraph:

```markdown
**重要：前端必须先构建，否则后端没有 UI 可服务。** `rust-embed` 在编译期把 `web/dist/` 嵌入二进制（见 `src/static_files.rs`）。`web/dist/` 被 gitignore，新检出时不存在；后端仍能编译/运行，但所有非 `/api/*` 请求会回退到 `index.html`（也不存在时返回 404）。
```

with:

```markdown
**重要：克隆环境必须装 bun。** `rust-embed` 在编译期把 `web/dist/` 嵌入二进制（见 `src/static_files.rs`）。`web/dist/` 被 gitignore，新检出时不存在；根目录的 `build.rs` 会在编译期检测到缺失或过期，自动执行 `bun install && bun run build`。因此 `cargo build` 在没有 bun 的环境下会失败并提示安装。开发者也可以手动 `cd web && bun run build`，build.rs 检测到产物已最新便不会再跑。
```

- [ ] **Step 3: Annotate the dev workflow with the side effect**

In `AGENTS.md`, under `## 开发工作流`, append this sentence to the end of the section (after the line about production deployment):

```markdown
> 注意：dev 流程下编辑前端不会触发 cargo 重建；但如果同时改了 Rust 触发 `cargo build`，且 `web/src` 比 `web/dist` 新，build.rs 会顺带重跑一次 `bun run build`（无副作用，仅多花几秒）。生产部署则只跑后端二进制（已内嵌 `web/dist/`）。
```

If the existing "生产部署则只跑后端二进制（已内嵌 `web/dist/`）。" sentence is the last line, place the new note above it and keep the production-deploy sentence as the closing line.

- [ ] **Step 4: Add bun to the Tech Stack prereq note**

Under the `前端 (`web/`, 使用 bun):` bullet list in `## Tech Stack`, append one line:

```markdown
- **bun 是后端编译的硬依赖**（不只是前端 dev 工具）：`build.rs` 在 `cargo build` 时调用它生成 `web/dist/`
```

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "docs: correct AGENTS.md — bun is required for cargo build"
```

---

## Task 3: Run the full verification checklist

**Files:** none (manual verification only)

This task walks through every scenario in the spec's verification checklist. Each step either sets up a scenario or confirms an outcome. Do **not** commit between these steps — they share state.

- [ ] **Step 1: Scenario 1 — full clean build**

```bash
rm -rf web/dist web/node_modules
cargo build
```

Expected:
- Output contains `[mywords] building frontend...` and `[mywords] running \`bun install\`...`
- `bun install` and `bun run build` both succeed
- Final line: `Finished \`debug\` profile ...`
- `web/dist/index.html` now exists

If this fails, stop and debug — the rest of the checklist is meaningless.

- [ ] **Step 2: Scenario 2 — build with node_modules present, dist missing**

```bash
rm -rf web/dist
cargo build
```

Expected:
- Output contains `[mywords] building frontend...`
- Output does **NOT** contain `[mywords] running \`bun install\`...` (node_modules already current)
- Build succeeds; `web/dist/index.html` exists again

- [ ] **Step 3: Scenario 3 — no-op when up to date**

```bash
cargo build
```

Expected: output contains **no** `[mywords]` lines (build.rs short-circuits at the staleness check). Build finishes fast.

- [ ] **Step 4: Scenario 4 — touching a frontend source triggers rebuild**

```bash
touch web/src/main.tsx
cargo build
```

Expected:
- Output contains `[mywords] building frontend...`
- `bun run build` runs and succeeds
- Build finishes

- [ ] **Step 5: Scenario 5 — package.json change triggers install**

```bash
touch web/package.json
cargo build
```

Expected:
- Output contains `[mywords] building frontend...` and `[mywords] running \`bun install\`...`
- Both succeed

Note: `touch` only updates mtime; it doesn't actually change deps. The point is to verify the install-trigger fires when `package.json` is newer than `node_modules/.modules.yaml`.

- [ ] **Step 6: Scenario 6 — bun missing produces clear error**

On Windows (Git Bash / MSYS):

```bash
PATH=/c/Windows/System32 cargo build 2>&1 | head -20
```

Expected: build fails with the message:
```
error: frontend build requires `bun` but it was not found on PATH.
       Install it from https://bun.sh/ and retry.
       ...
```

Note: This may also surface as `error: failed to run custom build command for \`mywords\`` wrapping the panic — that's expected. The key assertion is that the bun-specific message is present in the output.

If `PATH=/c/Windows/System32` happens to still contain a bun (unlikely), substitute any path known not to contain bun.

- [ ] **Step 7: Scenario 7 — frontend build error surfaces clearly**

Introduce a deliberate TS error. Example — read `web/src/main.tsx` (or whatever the entry is), and add at the top:

```tsx
const _broken: number = "not a number";
```

Then:

```bash
cargo build 2>&1 | tail -40
```

Expected: build fails with `bun run build failed in web/.` followed by the captured `tsc` / `vite` error mentioning the type mismatch.

Then revert the edit:

```bash
git checkout -- web/src/main.tsx
```

- [ ] **Step 8: Scenario 8 — subsequent build is a no-op**

```bash
cargo build
```

Expected: no `[mywords]` lines (verifies `rerun-if-changed` directives are correct — cargo did not re-invoke build.rs because nothing in the watched set changed since the last successful build).

- [ ] **Step 9: Final commit (if any scratch changes leaked)**

Run `git status`. Expected: clean working tree (all scratch edits were reverted in Step 7). If anything is unexpectedly modified, inspect and `git checkout` it. No commit should be needed here under normal conditions.

---

## Self-Review (completed during plan authoring)

**Spec coverage:** Every section of the spec maps to a task step:
- Architecture / decision flow → Task 1 Step 1 (the `main()` body order: probe → rerun-if-changed → staleness → install → build).
- Watched source set → Task 1 Step 1 (`max_src_mtime` + the 7 top-level paths + recursive `web/src` walk).
- Install trigger (`node_modules` missing / `.modules.yaml` missing / `bun.lock` newer) → Task 1 Step 1 (`maybe_bun_install`).
- Staleness target (`web/dist/index.html` mtime, missing → epoch) → Task 1 Step 1 (`mtime_or_epoch(&dist_index)`).
- Error messages (bun missing / install fail / build fail) → Task 1 Step 1 (`probe_bun`, `maybe_bun_install`, `run_bun_build` panic strings) and verified by Task 3 Steps 6, 5, 7 respectively.
- `rerun-if-changed` directive list (excludes `web/dist`) → Task 1 Step 1.
- AGENTS.md corrections (3 of them) → Task 2 Steps 2, 3, 4.
- Verification checklist (8 scenarios) → Task 3 Steps 1–8, in the same order.

**Placeholder scan:** No "TBD", "TODO", "appropriate error handling", or untitled code blocks. Every code-emitting step contains the exact final code. ✓

**Type/name consistency:** `probe_bun`, `maybe_bun_install`, `run_bun_build`, `max_src_mtime`, `max_mtime_recursive`, `mtime_opt`, `mtime_or_epoch` are used consistently within `build.rs`. `dist_index`, `node_modules`, `modules_yaml`, `bun_lock` are local names used once each in their function. ✓

**Dev-workflow note placement:** Step 3 of Task 2 acknowledges that the existing `## 开发工作流` section already ends with a "生产部署..." line and instructs the engineer to place the new note above it rather than blindly appending, to preserve the section's existing closing sentence.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-15-auto-frontend-build.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task with review between tasks
2. **Inline Execution** — execute tasks in this session with checkpoints

Which approach?
