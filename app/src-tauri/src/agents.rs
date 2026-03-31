use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentDefinition {
    pub name: String,
    pub description: String,
    pub model: Option<String>,
    pub source: String,
    pub file_path: String,
}

fn parse_agent_file(path: &Path, source: &str) -> Option<AgentDefinition> {
    let content = fs::read_to_string(path).ok()?;
    let name = path.file_stem()?.to_str()?.to_string();

    if !content.starts_with("---") {
        return Some(AgentDefinition {
            name,
            description: String::new(),
            model: None,
            source: source.to_string(),
            file_path: path.to_string_lossy().to_string(),
        });
    }

    let end = content[3..].find("\n---").map(|i| i + 3)?;
    let yaml_str = &content[3..end].trim();

    let mut description = String::new();
    let mut model = None;

    for line in yaml_str.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("description:") {
            description = val.trim().trim_matches('"').trim_matches('\'').to_string();
        } else if let Some(val) = line.strip_prefix("model:") {
            model = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
        }
    }

    Some(AgentDefinition {
        name,
        description,
        model,
        source: source.to_string(),
        file_path: path.to_string_lossy().to_string(),
    })
}

fn scan_agents_dir(dir: &Path, source: &str) -> Vec<AgentDefinition> {
    let mut agents = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("md") {
                if let Some(agent) = parse_agent_file(&path, source) {
                    agents.push(agent);
                }
            }
        }
    }
    agents
}

#[tauri::command]
pub fn list_agent_definitions(project_path: String) -> Result<Vec<AgentDefinition>, String> {
    // Validate path: reject UNC and traversal
    if project_path.starts_with("\\\\") || project_path.starts_with("//") {
        return Err("UNC paths are not supported".to_string());
    }
    if project_path.contains("..") {
        return Err("Path traversal is not allowed".to_string());
    }
    let dir = Path::new(&project_path);
    if !dir.is_dir() {
        return Ok(Vec::new());
    }

    let mut agents = Vec::new();

    let project_agents_dir = PathBuf::from(&project_path).join(".claude").join("agents");
    agents.extend(scan_agents_dir(&project_agents_dir, "project"));

    if let Some(home) = dirs::home_dir() {
        let global_agents_dir = home.join(".claude").join("agents");
        agents.extend(scan_agents_dir(&global_agents_dir, "global"));
    }

    let mut seen = std::collections::HashSet::new();
    agents.retain(|a| seen.insert(a.name.clone()));

    agents.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(agents)
}
