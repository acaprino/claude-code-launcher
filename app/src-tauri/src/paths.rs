//! Shared path resolution and constants used across multiple modules.

use std::path::PathBuf;

/// Win32 process creation flag: suppresses console window allocation.
pub(crate) const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Resolve a bundled data subdirectory (e.g., "prompts", "themes", "marketplace").
/// Production: `<exe_dir>/data/<name>/`.  Dev: `<crate_root>/data/<name>/`.
pub(crate) fn bundled_data_dir(name: &str) -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let candidate = dir.join("data").join(name);
            if candidate.is_dir() {
                return candidate;
            }
        }
    }
    // Dev fallback: data/ lives at the crate root (src-tauri/data/<name>/)
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("data")
        .join(name)
}

/// Civil date from days since 1970-01-01 (Howard Hinnant algorithm).
/// Returns (year, month, day).
pub(crate) fn days_to_date(days: u64) -> (u64, u64, u64) {
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}
