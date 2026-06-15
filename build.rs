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
