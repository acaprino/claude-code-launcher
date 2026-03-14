use notify::{RecommendedWatcher, RecursiveMode, Watcher, EventKind};
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Emitter;

/// Minimum quiet period after the last filesystem event before triggering a rescan.
/// Uses trailing-edge debounce: waits until events stop arriving for this duration,
/// then emits once. Collapses rapid bulk operations (e.g., git clone) into a single rescan.
const DEBOUNCE_SECS: u64 = 1;

/// Watches project container directories for directory creation/deletion/rename
/// and emits a `projects-changed` event to trigger a frontend rescan.
pub struct ProjectWatcher {
    watcher: Mutex<Option<RecommendedWatcher>>,
    watched: Mutex<Vec<PathBuf>>,
}

impl ProjectWatcher {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        let (tx, rx) = std::sync::mpsc::channel::<()>();

        // Debounce thread: trailing-edge. Blocks until first event arrives, then
        // drains until no events arrive for DEBOUNCE_SECS, then emits once.
        let handle = app_handle.clone();
        std::thread::spawn(move || {
            loop {
                // Block until first event (or channel closed)
                if rx.recv().is_err() {
                    break;
                }
                // Drain until quiet period expires
                while rx
                    .recv_timeout(Duration::from_secs(DEBOUNCE_SECS))
                    .is_ok()
                {}
                log_info!("watcher: directory change detected, emitting projects-changed");
                let _ = handle.emit("projects-changed", ());
            }
        });

        let watcher = match notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
            let Ok(event) = res else { return };

            // Only care about create/remove/rename (directory changes)
            match event.kind {
                EventKind::Create(_)
                | EventKind::Remove(_)
                | EventKind::Modify(notify::event::ModifyKind::Name(_)) => {}
                _ => return,
            }

            let _ = tx.send(());
        }) {
            Ok(w) => Some(w),
            Err(e) => {
                log_error!("watcher: failed to create filesystem watcher: {e}");
                None
            }
        };

        Self {
            watcher: Mutex::new(watcher),
            watched: Mutex::new(Vec::new()),
        }
    }

    /// Update which directories are being watched.
    /// Call this on startup and whenever project_dirs or single_project_dirs change.
    /// Watches container dirs directly and parent dirs of single project entries.
    pub fn watch_dirs(&self, project_dirs: &[String], single_project_dirs: &[String]) {
        let mut guard = self.watcher.lock().unwrap_or_else(|e| e.into_inner());
        let Some(watcher) = guard.as_mut() else { return };
        let mut watched = self.watched.lock().unwrap_or_else(|e| e.into_inner());

        // Unwatch previously watched directories
        for old in watched.drain(..) {
            let _ = watcher.unwatch(&old);
        }

        // Collect directories to watch, deduplicating case-insensitively (NTFS)
        let mut to_watch: Vec<PathBuf> = Vec::new();
        let mut seen: HashSet<String> = HashSet::new();

        // Container dirs: watch directly for subdirectory changes
        for dir in project_dirs {
            let path = PathBuf::from(dir);
            if path.is_dir() && seen.insert(dir.to_ascii_lowercase()) {
                to_watch.push(path);
            }
        }

        // Single project dirs: watch their parent to detect rename/delete of the project
        for dir in single_project_dirs {
            if let Some(parent) = PathBuf::from(dir).parent() {
                let key = parent.to_string_lossy().to_ascii_lowercase();
                if parent.is_dir() && seen.insert(key) {
                    to_watch.push(parent.to_path_buf());
                }
            }
        }

        for path in &to_watch {
            if let Err(e) = watcher.watch(path, RecursiveMode::NonRecursive) {
                log_error!("watcher: failed to watch {}: {e}", path.display());
            }
        }

        log_info!("watcher: watching {} directories", to_watch.len());
        *watched = to_watch;
    }
}
