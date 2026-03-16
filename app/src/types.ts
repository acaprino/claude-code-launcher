export interface SystemPrompt {
  id: string;
  name: string;
  description?: string;
  content: string;
}

export interface Tab {
  id: string;
  type: "new-tab" | "agent" | "about" | "usage" | "system-prompt" | "sessions";
  projectPath?: string;
  projectName?: string;

  modelIdx?: number;
  effortIdx?: number;
  skipPerms?: boolean;
  autocompact?: boolean;
  temporary?: boolean;
  agentSessionId?: string;
  hasNewOutput?: boolean;
  exitCode?: number | null;
  tagline?: string;
  /** When set, Terminal will call resumeAgent() instead of spawnAgent(). Consumed on mount. */
  resumeSessionId?: string;
  /** When set, Terminal will call forkAgent() instead of spawnAgent(). Consumed on mount. */
  forkSessionId?: string;
}

export interface ProjectInfo {
  path: string;
  name: string;
  label: string | null;
  branch: string | null;
  isDirty: boolean;
  hasClaudeMd: boolean;
}

export interface Settings {
  version?: number;

  model_idx: number;
  effort_idx: number;
  sort_idx: number;
  theme_idx: number;
  font_family: string;
  font_size: number;
  chat_font_family?: string;
  chat_font_size?: number;
  skip_perms: boolean;
  autocompact: boolean;
  active_prompt_ids: string[];
  security_gate: boolean;
  project_dirs: string[];
  single_project_dirs: string[];
  project_labels: Record<string, string>;
  vertical_tabs?: boolean;
  sidebar_width?: number;
  autocomplete_enabled?: boolean;
  session_panel_open?: boolean;
  input_style?: "chat" | "terminal";
  hide_thinking?: boolean;
  marketplace_global?: boolean;
}

export interface UsageEntry {
  last_used: number;
  count: number;
}

export type UsageData = Record<string, UsageEntry>;


export const MODELS = [
  { display: "sonnet", id: "claude-sonnet-4-6" },
  { display: "opus", id: "claude-opus-4-6" },
  { display: "haiku", id: "claude-haiku-4-5" },
  { display: "sonnet [1M]", id: "claude-sonnet-4-6[1m]" },
  { display: "opus [1M]", id: "claude-opus-4-6[1m]" },
] as const;

export const EFFORTS = ["high", "medium", "low"] as const;
export const SORT_ORDERS = ["alpha", "last used", "most used"] as const;

export interface ThemeColors {
  bg: string;
  surface: string;
  mantle: string;
  crust: string;
  text: string;
  textDim: string;
  overlay0: string;
  overlay1: string;
  accent: string;
  red: string;
  green: string;
  yellow: string;
  // xterm-specific
  cursor: string;
  selection: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  retro?: boolean;
}

export const THEMES: Theme[] = [
  {
    name: "Catppuccin Mocha",
    colors: {
      bg: "#161622", surface: "#282838", mantle: "#111118", crust: "#0b0b12",
      text: "#c8d0e8", textDim: "#6e728a", overlay0: "#585c72", overlay1: "#64687e",
      accent: "#7ca8e8", red: "#d87890", green: "#8cc890", yellow: "#e0cc98",
      cursor: "#d8c8b8", selection: "#2e3048",
    },
  },
  {
    name: "Dracula",
    colors: {
      bg: "#1a1c28", surface: "#2a2d42", mantle: "#141520", crust: "#0e0f18",
      text: "#e8e8e0", textDim: "#687098", overlay0: "#586088", overlay1: "#606898",
      accent: "#a880e0", red: "#e04848", green: "#40d868", yellow: "#d8e070",
      cursor: "#e0e0d8", selection: "#303450",
    },
  },
  {
    name: "One Dark",
    colors: {
      bg: "#1a1e26", surface: "#282e3a", mantle: "#14181e", crust: "#0e1014",
      text: "#a0a8b8", textDim: "#687080", overlay0: "#505868", overlay1: "#586070",
      accent: "#5098d8", red: "#c85860", green: "#80a868", yellow: "#c8a868",
      cursor: "#4878c0", selection: "#283040",
    },
  },
  {
    name: "Nord",
    colors: {
      bg: "#1e2430", surface: "#2a3248", mantle: "#181e28", crust: "#12161e",
      text: "#c8d0d8", textDim: "#788098", overlay0: "#506070", overlay1: "#586878",
      accent: "#70a8b8", red: "#a05058", green: "#88a878", yellow: "#d0a870",
      cursor: "#c0c8d0", selection: "#303848",
    },
  },
  {
    name: "Solarized Dark",
    colors: {
      bg: "#001820", surface: "#082830", mantle: "#001018", crust: "#000a10",
      text: "#788890", textDim: "#607078", overlay0: "#486068", overlay1: "#506870",
      accent: "#2070a8", red: "#c03028", green: "#708000", yellow: "#987000",
      cursor: "#708088", selection: "#082838",
    },
  },
  {
    name: "Gruvbox Dark",
    colors: {
      bg: "#1a1a18", surface: "#2a2826", mantle: "#121210", crust: "#0a0a08",
      text: "#d8c8a0", textDim: "#887868", overlay0: "#686050", overlay1: "#787060",
      accent: "#689080", red: "#d84030", green: "#98a020", yellow: "#d8a020",
      cursor: "#d0c098", selection: "#282420",
    },
  },
  {
    name: "Tokyo Night",
    colors: {
      bg: "#12131e", surface: "#1e2030", mantle: "#0c0d14", crust: "#08080e",
      text: "#a8b0d8", textDim: "#607088", overlay0: "#485070", overlay1: "#505878",
      accent: "#6088d8", red: "#d86070", green: "#80b058", yellow: "#c89850",
      cursor: "#a8b0d0", selection: "#1e2840",
    },
  },
  {
    name: "Monokai",
    colors: {
      bg: "#181810", surface: "#282820", mantle: "#101010", crust: "#0a0a08",
      text: "#e0e0d8", textDim: "#787060", overlay0: "#605848", overlay1: "#686050",
      accent: "#50b8d0", red: "#d82060", green: "#88c020", yellow: "#c8b860",
      cursor: "#d8d8d0", selection: "#303028",
    },
  },
  {
    name: "Anvil Forge [retro]",
    retro: true,
    colors: {
      bg: "#1a1610", surface: "#2a2218", mantle: "#140f0a", crust: "#0e0a06",
      text: "#d0b890", textDim: "#907860", overlay0: "#605040", overlay1: "#685848",
      accent: "#d08030", red: "#d05838", green: "#80a050", yellow: "#d0a830",
      cursor: "#d89038", selection: "#382c20",
    },
  },
  {
    name: "Guybrush [retro]",
    retro: true,
    colors: {
      bg: "#0e1420", surface: "#1a2030", mantle: "#0a0e18", crust: "#060a10",
      text: "#c0b8a0", textDim: "#807868", overlay0: "#485060", overlay1: "#506068",
      accent: "#38a890", red: "#c84840", green: "#58a050", yellow: "#c8b040",
      cursor: "#c0b890", selection: "#283048",
    },
  },
];

/** Shared tab label logic — used by TabBar and TabSidebar. */
export function getTabLabel(tab: Tab): string {
  const baseName =
    tab.type === "agent"
      ? (tab.projectName ?? "Terminal")
      : tab.type === "about"
        ? "About"
        : tab.type === "usage"
          ? "Usage"
          : tab.type === "system-prompt"
            ? "System Prompts"
            : tab.type === "sessions"
              ? "Sessions"
              : "New Tab";
  return tab.tagline ? `${baseName} \u2014 ${tab.tagline}` : baseName;
}

// ── Agent SDK types ─────────────────────────────────────────────────

/** Permission update suggestion from Agent SDK (mirrors PermissionUpdate type). */
export interface PermissionSuggestion {
  type: string;
  rules?: { toolName: string; ruleContent?: string }[];
  behavior?: string;
  destination?: string;
  mode?: string;
  directories?: string[];
}

/** Slash command from Agent SDK (skill invoked via /command syntax). */
export interface SlashCommand {
  name: string;
  description: string;
  argumentHint: string;
}

/** Agent info from Agent SDK (subagent invoked via @agent syntax). */
export interface AgentInfoSDK {
  name: string;
  description: string;
  model?: string;
}

export type AgentEvent =
  | { type: "assistant"; text: string; streaming: boolean }
  | { type: "toolUse"; tool: string; input: unknown }
  | { type: "toolResult"; tool: string; output: string; success: boolean }
  | { type: "permission"; tool: string; description: string; toolUseId: string; suggestions?: PermissionSuggestion[] }
  | { type: "inputRequired" }
  | { type: "thinking"; text: string }
  | { type: "status"; status: string; model: string; sessionId: string }
  | { type: "progress"; message: string }
  | { type: "result"; cost: number; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; turns: number; durationMs: number; isError: boolean; sessionId: string; contextWindow: number }
  | { type: "todo"; todos: TodoItem[] }
  | { type: "autocomplete"; suggestions: string[]; seq: number }
  | { type: "rateLimit"; utilization: number }
  | { type: "commandsInit"; commands: SlashCommand[]; agents: AgentInfoSDK[] }
  | { type: "error"; code: string; message: string }
  | { type: "exit"; code: number };

// ── Chat UI types ─────────────────────────────────────────────────

/** A single message in the chat view. Built from accumulated AgentEvents. */
export type ChatMessage =
  | { id: string; role: "user"; text: string; timestamp: number }
  | { id: string; role: "assistant"; text: string; streaming: boolean; timestamp: number }
  | { id: string; role: "tool"; tool: string; input: unknown; output?: string; success?: boolean; timestamp: number }
  | { id: string; role: "permission"; tool: string; description: string; suggestions?: PermissionSuggestion[]; resolved?: boolean; allowed?: boolean; timestamp: number }
  | { id: string; role: "thinking"; text: string; ended?: boolean; timestamp: number }
  | { id: string; role: "result"; cost: number; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; turns: number; durationMs: number; isError: boolean; sessionId: string; contextWindow: number; timestamp: number }
  | { id: string; role: "error"; code: string; message: string; timestamp: number }
  | { id: string; role: "status"; status: string; model: string; timestamp: number }
  | { id: string; role: "todo"; todos: TodoItem[]; timestamp: number };

export interface SessionInfo {
  id: string;
  summary: string;
  lastModified: number;
  cwd: string;
  firstPrompt: string;
  gitBranch: string;
  createdAt: number;
  customTitle: string;
  fileSize: number;
}

export interface TodoItem {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  category?: string;
}

export interface Attachment {
  id: string;
  path: string;
  name: string;
  type: "file" | "image";
  thumbnail?: string;
}
