# Auto Frontend Build via build.rs

**Date:** 2026-06-15
**Status:** Approved (pending implementation)
**Topic:** Fix `cargo run` compile error on fresh clone by auto-building `web/dist/`

## Problem

`src/static_files.rs` uses `rust-embed` with `#[folder = "web/dist/"]`. The
`web/dist/` directory is gitignored and not present on a fresh clone. rust-embed's
derive macro **hard-errors at compile time** when the folder is missing:

```
error: #[derive(RustEmbed)] folder 'C:\Dev\zwords\web/dist/' does not exist.
```

As a result `cargo run` / `cargo build` fails immediately on any fresh clone
until the developer manually runs `bun install && bun run build` inside `web/`.

The existing `AGENTS.md` claim that "后端仍能编译/运行" (backend still compiles
and runs without `web/dist/`) is incorrect and must be corrected.

## Goal

On a fresh clone, `cargo build` must succeed without manual frontend steps, and
produce a binary whose embedded UI reflects the current `web/src/`. The clone
environment is required to have `bun` installed (this becomes a documented
prerequisite).

## Non-Goals

- No fallback to `npm` / `pnpm` / `yarn` — bun only.
- No "placeholder page" degradation path. If bun is missing, the build fails
  with a clear message.
- No skip switch / feature flag. The dev (`cargo run` + `bun run dev`) workflow
  accepts the occasional redundant frontend rebuild.
- No new automated tests; verification is manual per the checklist below
  (matches the project's no-`tests/` convention).

## Architecture

Add a `build.rs` at the repository root. Cargo runs it before compiling the
`mywords` crate, i.e. **before** rust-embed's derive macro expands. build.rs
guarantees `web/dist/` exists and is up-to-date. `src/static_files.rs` is not
modified.

### Decision flow inside build.rs

```
1. Probe bun: spawn `bun --version`.
   - If spawn fails or exit code != 0  -> panic! with install instructions.
2. Compute src_mtime = max mtime over the watched source set (see below).
3. Compute dist_mtime = mtime of web/dist/index.html, or 0 if absent.
4. If src_mtime > dist_mtime:
     a. Print: `[mywords] building frontend (web/src is newer than web/dist)...`
     b. Decide whether `bun install` is needed (see "Install trigger" below).
        If needed, run `bun install` in web/; on failure panic! with stderr.
     c. Run `bun run build` in web/; on failure panic! with stdout+stderr.
5. Emit cargo directives:
     cargo:rerun-if-changed=web/src
     cargo:rerun-if-changed=web/index.html
     cargo:rerun-if-changed=web/package.json
     cargo:rerun-if-changed=web/bun.lock
     cargo:rerun-if-changed=web/vite.config.ts
     cargo:rerun-if-changed=web/tsconfig.json
     cargo:rerun-if-changed=web/tsconfig.app.json
     cargo:rerun-if-changed=web/tsconfig.node.json
```

`web/dist` is deliberately **not** registered with `rerun-if-changed`, since it
is the build's own output; registering it would cause loops.

### Watched source set

The "src_mtime" is the maximum mtime of:

- `web/src/**/*` (recursive; all sources and assets)
- `web/index.html`
- `web/package.json`
- `web/bun.lock`
- `web/vite.config.ts`
- `web/tsconfig.json`, `web/tsconfig.app.json`, `web/tsconfig.node.json`

Missing files in the set are skipped (not an error). Directories are recursed
into. Symlinks are not specifically handled; default `std::fs` behavior applies.

### Install trigger

`bun install` runs before `bun run build` when any of the following holds:

- `web/node_modules/` does not exist, OR
- `web/node_modules/.modules.yaml` does not exist (bun writes this sentinel on
  every successful install), OR
- mtime(`web/bun.lock`) > mtime(`web/node_modules/.modules.yaml`)

`.modules.yaml` is chosen because bun reliably writes/updates it during
`bun install`. If a future bun version changes this, the worst case is a
redundant `bun install` (cheap); correctness does not depend on it.

### Staleness target

The "target" mtime compared against `src_mtime` is exactly:
`web/dist/index.html` (vite emits it on every successful build). Missing
`web/dist/index.html` is treated as mtime 0 (epoch), guaranteeing the first
build fires.

## Implementation Approach

**Approach A — pure build.rs, zero new dependencies (chosen).**

- Hand-written `build.rs` using only `std::process::Command` and `std::fs`.
- Recursive directory walk implemented inline (about 20 lines using
  `std::fs::read_dir` + recursion).
- No additions to `[build-dependencies]`.

Rejected alternative: pulling in `walkdir` as a build-dependency for cleaner
traversal. The traversal is simple enough that the dependency is not worth it.

### Environment / platform notes

- `Command::new("bun")` works on Windows because cargo's build scripts inherit
  the parent `PATH`, which contains `bun.CMD`'s directory in a standard bun
  install. No special `.cmd` handling is required when using `Command` with a
  single program name on Windows.
- All `Command` invocations set `.current_dir("web")` so the working tree does
  not need to be computed from `CARGO_MANIFEST_DIR`; build.rs always runs with
  the crate root as cwd.
- mtimes are read via `std::fs::metadata(...).modified()`. If a platform
  returns `Err` (e.g. some filesystems without mtime), that file is treated as
  "not stale" (skipped) rather than panicking.

## Error Handling & User Messages

All failures go through `panic!` so cargo reports a build-script failure and
exits non-zero.

**bun missing:**

```
error: frontend build requires `bun` but it was not found on PATH.
       Install it from https://bun.sh/ and retry.
       If you cannot install bun right now, you can produce web/dist/ manually:
           cd web && bun install && bun run build
```

**`bun install` failed:**

```
error: `bun install` failed in web/.
--- stderr ---
<bun install stderr verbatim>
```

**`bun run build` failed:**

```
error: `bun run build` failed in web/.
--- stdout ---
<bun run build stdout verbatim>
--- stderr ---
<bun run build stderr verbatim>
```

`Command::output()` is used (not `status()` + inherited stdout) so that output
can be captured and formatted; cargo's parallel compiler output stays clean.
Stdout/stderr are printed as lossy UTF-8 strings.

**Success path:** silent, except for the single
`[mywords] building frontend (web/src is newer than web/dist)...` line emitted
only when an actual build is about to happen. No output on a no-op build (the
common case during pure-Rust edits).

## Documentation Updates

### `AGENTS.md`

The current "重要：前端必须先构建…" paragraph ends with:

> `web/dist/` 被 gitignore，新检出时不存在；后端仍能编译/运行，但所有非 `/api/*` 请求会回退到 `index.html`（也不存在时返回 404）。

Replace with:

> `web/dist/` 被 gitignore，新检出时不存在；`build.rs` 会在编译期检测到缺失或过期，自动执行 `bun install && bun run build`。因此**克隆环境必须装 bun**，否则 `cargo build` 会失败并提示安装。开发者也可以手动 `cd web && bun run build`，build.rs 检测到产物已最新便不会再跑。

In the "开发工作流" section, append:

> dev 流程下编辑前端不会触发 cargo 重建；但如果同时改了 Rust 触发 cargo build，且 `web/src` 比 `web/dist` 新，build.rs 会顺带重跑一次 `bun run build`（无副作用，仅多花几秒）。

### Tech Stack prereq

Under "前端 (`web/`, 使用 bun)" add an explicit note that bun is a hard
prerequisite for building the backend binary, not just for frontend dev.

## Verification Checklist (manual)

1. Delete `web/dist/` and `web/node_modules` → `cargo build` runs
   `bun install` then `bun run build`, succeeds, embeds the new UI.
2. Delete `web/dist/` only (keep `node_modules`) → `cargo build` runs only
   `bun run build`.
3. `web/dist/` present and `web/src` unmodified → `cargo build` does **not**
   invoke bun (no `[mywords] building frontend...` line).
4. `touch web/src/main.tsx` → next `cargo build` triggers a rebuild.
5. Edit `web/package.json` (bump a dep) and `cargo build` → triggers
   `bun install` then `bun run build`.
6. Remove bun from PATH (e.g. `PATH=/usr/bin cargo build`) → build fails with
   the bun-install hint, non-zero exit.
7. Cause a TS error in `web/src` → `cargo build` fails with the captured
   `tsc`/`vite` stderr.
8. Subsequent `cargo build` with no changes is a no-op for the frontend
   (verifies `rerun-if-changed` hints are correct).

All scenarios are verified manually on Windows (the project's primary
environment). Unix behavior is identical by construction; a note is added to
`AGENTS.md` rather than maintaining separate CI.

## Out-of-Scope / Future Work

- Caching vite's build output across clean `target/` wipes — not needed; bun
  build is fast enough (~5-10s incremental).
- Watching `web/public/` — currently empty in the repo; if it gains content,
  add it to the watched set and rerun-if-changed in a follow-up.
- A `cargo xtask` style wrapper — overkill for this project size.
