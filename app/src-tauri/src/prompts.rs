use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

const MAX_CONTENT_LEN: usize = 100_000;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptEntry {
    pub id: String,
    pub name: String,
    pub description: String,
    pub content: String,
}

pub type BuiltinPrompt = PromptEntry;

fn prompts_dir() -> PathBuf {
    crate::paths::bundled_data_dir("prompts")
}

/// Parse YAML-style `---` frontmatter from a raw markdown string.
fn parse_frontmatter(raw: &str) -> (HashMap<String, String>, String) {
    let trimmed = raw.trim_start_matches('\u{feff}'); // strip BOM
    let mut meta = HashMap::new();
    if !trimmed.starts_with("---") {
        return (meta, trimmed.trim().to_string());
    }
    // Skip the opening "---\n" (or "---\r\n")
    let after_open = &trimmed[3..];
    let after_open = after_open.strip_prefix("\r\n").or_else(|| after_open.strip_prefix('\n')).unwrap_or(after_open);

    if let Some(end) = after_open.find("\n---") {
        let header = &after_open[..end];
        let rest = &after_open[end + 4..]; // skip "\n---"
        let content = rest.strip_prefix("\r\n").or_else(|| rest.strip_prefix('\n')).unwrap_or(rest);

        for line in header.lines() {
            if let Some(idx) = line.find(':') {
                let key = line[..idx].trim().to_string();
                let val = line[idx + 1..]
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string();
                if !key.is_empty() {
                    meta.insert(key, val);
                }
            }
        }
        (meta, content.trim().to_string())
    } else {
        (meta, trimmed.trim().to_string())
    }
}

/// Convert a prompt name to a safe filename slug.
fn slugify(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// Validate that an id is a safe filename (no path traversal).
fn validate_id(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.contains('/')
        || id.contains('\\')
        || id.contains("..")
        || id != slugify(id)
    {
        return Err("Invalid prompt id".to_string());
    }
    Ok(())
}

/// Sanitize name/description for frontmatter (strip newlines, escape quotes).
fn format_prompt_file(name: &str, description: &str, content: &str) -> String {
    let safe_name = name.replace('\n', " ").replace('\r', "");
    let safe_desc = description.replace('\n', " ").replace('\r', "").replace('"', "\\\"");
    format!(
        "---\nname: \"{safe_name}\"\ndescription: \"{safe_desc}\"\n---\n\n{content}\n",
    )
}

/// Read all `.md` files from the prompts directory.
pub fn load_prompts() -> Vec<PromptEntry> {
    let dir = prompts_dir();
    log_info!("prompts: loading from {}", dir.display());

    let entries = match fs::read_dir(&dir) {
        Ok(e) => e,
        Err(e) => {
            log_error!("prompts: failed to read {}: {e}", dir.display());
            return Vec::new();
        }
    };

    let mut prompts = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map_or(true, |e| e != "md") {
            continue;
        }
        let stem = path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let raw = match fs::read_to_string(&path) {
            Ok(s) => s,
            Err(e) => {
                log_warn!("prompts: failed to read {}: {e}", path.display());
                continue;
            }
        };
        let (meta, content) = parse_frontmatter(&raw);
        prompts.push(PromptEntry {
            id: stem.clone(),
            name: meta.get("name").cloned().unwrap_or_else(|| stem.clone()),
            description: meta.get("description").cloned().unwrap_or_default(),
            content,
        });
    }

    prompts.sort_by(|a, b| a.name.cmp(&b.name));
    log_info!("prompts: loaded {} prompts", prompts.len());
    prompts
}

/// Backward-compat alias.
pub fn load_builtin_prompts() -> Vec<BuiltinPrompt> {
    load_prompts()
}

/// Save a prompt to a `.md` file. Returns the generated id (filename stem).
pub fn save_prompt(name: &str, description: &str, content: &str) -> Result<String, String> {
    if content.len() > MAX_CONTENT_LEN {
        return Err(format!("Content too large (max {MAX_CONTENT_LEN} bytes)"));
    }

    let dir = prompts_dir();
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create prompts dir: {e}"))?;

    let slug = slugify(name);
    if slug.is_empty() {
        return Err("Invalid prompt name".to_string());
    }

    let path = dir.join(format!("{slug}.md"));
    if path.exists() {
        return Err(format!("A prompt with id '{slug}' already exists"));
    }

    fs::write(&path, format_prompt_file(name, description, content))
        .map_err(|e| format!("Failed to write {}: {e}", path.display()))?;
    log_info!("prompts: saved {}", path.display());
    Ok(slug)
}

/// Update an existing prompt file (identified by id = filename stem).
/// Returns the new slug (may differ from id if name changed).
pub fn update_prompt(id: &str, name: &str, description: &str, content: &str) -> Result<String, String> {
    validate_id(id)?;

    if content.len() > MAX_CONTENT_LEN {
        return Err(format!("Content too large (max {MAX_CONTENT_LEN} bytes)"));
    }

    let dir = prompts_dir();
    let old_path = dir.join(format!("{id}.md"));

    let new_slug = slugify(name);
    if new_slug.is_empty() {
        return Err("Invalid prompt name".to_string());
    }

    // If name changed, rename the file
    let new_path = dir.join(format!("{new_slug}.md"));
    if old_path.exists() && old_path != new_path {
        if new_path.exists() {
            return Err(format!("A prompt with id '{new_slug}' already exists"));
        }
        fs::remove_file(&old_path).map_err(|e| format!("Failed to remove old file: {e}"))?;
    }

    fs::write(&new_path, format_prompt_file(name, description, content))
        .map_err(|e| format!("Failed to write {}: {e}", new_path.display()))?;
    log_info!("prompts: updated {} -> {}", id, new_slug);
    Ok(new_slug)
}

/// Delete a prompt file by id (filename stem).
pub fn delete_prompt(id: &str) -> Result<(), String> {
    validate_id(id)?;

    let dir = prompts_dir();
    let path = dir.join(format!("{id}.md"));
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete {}: {e}", path.display()))?;
        log_info!("prompts: deleted {}", path.display());
    }
    Ok(())
}
