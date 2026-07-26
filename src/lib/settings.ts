// Feature settings — granular control to enable/disable functionality.
// This is the core of the user's request: "controle mais amplo de opções
// para habilitar (ou não) funcionalidades".

export interface FeatureSettings {
  // ── IA ──────────────────────────────────────────────
  ai: {
    enabled: boolean; // master kill switch for all AI features
    expandNode: boolean; // expand a node into child concepts
    generateMap: boolean; // generate an entire map from a topic
    summarize: boolean; // summarize a subtree
    suggestConnections: boolean; // suggest connections between nodes
    chatAssistant: boolean; // conversational assistant about the map
    generateImage: boolean; // generate an image for a node
    autoLayout: boolean; // AI-assisted auto layout
    thinking: boolean; // chain-of-thought reasoning (slower, deeper)
  };
  // ── Visual ──────────────────────────────────────────
  visual: {
    animations: boolean; // framer-motion transitions
    grid: boolean; // background dot grid
    minimap: boolean; // minimap in corner
    edgeLabels: boolean; // show edge labels
    autoColors: boolean; // auto-color nodes by kind
    glow: boolean; // glow effect on selected node
    rounded: boolean; // rounded node corners
    showStatusBar: boolean; // bottom status bar
  };
  // ── Editor ──────────────────────────────────────────
  editor: {
    autosave: boolean; // auto-save changes
    autosaveDelayMs: number; // debounce delay
    snapToGrid: boolean; // snap nodes to grid
    gridSize: number; // grid size in px
    keyboardShortcuts: boolean; // enable keyboard shortcuts
    multiSelect: boolean; // enable multi-selection
    undoRedo: boolean; // enable undo/redo history
    historyLimit: number; // max history steps
    confirmDelete: boolean; // confirm before deleting
    alignmentGuides: boolean; // show alignment / snap guides when dragging nodes
  };
  // ── Performance ─────────────────────────────────────
  performance: {
    maxNodes: number; // warn when exceeding
    virtualization: boolean; // virtualize offscreen nodes
    antialiasing: boolean; // SVG antialiasing
    reducedMotion: boolean; // respect reduced motion preference
  };
  // ── Export ──────────────────────────────────────────
  export: {
    png: boolean;
    json: boolean;
    markdown: boolean;
    includeNotes: boolean; // include node notes in markdown export
  };
  // ── Theme ───────────────────────────────────────────
  theme: {
    mode: "light" | "dark" | "system";
    accent: "emerald" | "rose" | "amber" | "violet" | "teal";
  };
}

export const DEFAULT_SETTINGS: FeatureSettings = {
  ai: {
    enabled: true,
    expandNode: true,
    generateMap: true,
    summarize: true,
    suggestConnections: true,
    chatAssistant: true,
    generateImage: true,
    autoLayout: true,
    thinking: false,
  },
  visual: {
    animations: true,
    grid: true,
    minimap: true,
    edgeLabels: true,
    autoColors: true,
    glow: true,
    rounded: true,
    showStatusBar: true,
  },
  editor: {
    autosave: true,
    autosaveDelayMs: 1200,
    snapToGrid: false,
    gridSize: 20,
    keyboardShortcuts: true,
    multiSelect: true,
    undoRedo: true,
    historyLimit: 50,
    confirmDelete: true,
    alignmentGuides: true,
  },
  performance: {
    maxNodes: 500,
    virtualization: false,
    antialiasing: true,
    reducedMotion: false,
  },
  export: {
    png: true,
    json: true,
    markdown: true,
    includeNotes: true,
  },
  theme: {
    mode: "dark",
    accent: "emerald",
  },
};

// Metadata for rendering the settings panel
export interface SettingToggleMeta {
  key: string;
  label: string;
  description: string;
}

export interface SettingCategoryMeta {
  id: keyof FeatureSettings;
  title: string;
  description: string;
  icon: string; // lucide icon name
  toggles: SettingToggleMeta[];
}

export const SETTING_CATEGORIES: SettingCategoryMeta[] = [
  {
    id: "ai",
    title: "Inteligência Artificial",
    description: "Controle cada capacidade de IA independentemente.",
    icon: "Sparkles",
    toggles: [
      { key: "enabled", label: "IA habilitada", description: "Chave-mestra: desliga todas as funções de IA." },
      { key: "expandNode", label: "Expandir nó", description: "Gera conceitos-filho a partir de um nó." },
      { key: "generateMap", label: "Gerar mapa", description: "Cria um mapa mental inteiro a partir de um tema." },
      { key: "summarize", label: "Resumir subárvore", description: "Resume um ramo do mapa em texto." },
      { key: "suggestConnections", label: "Sugerir conexões", description: "Propõe ligações entre nós." },
      { key: "chatAssistant", label: "Assistente de chat", description: "Converse com a IA sobre o mapa." },
      { key: "generateImage", label: "Gerar imagem", description: "Gera uma imagem ilustrativa para o nó." },
      { key: "autoLayout", label: "Auto-layout por IA", description: "Reorganiza o layout via IA." },
      { key: "thinking", label: "Raciocínio estendido", description: "Cadeia de pensamento (mais lento, mais profundo)." },
    ],
  },
  {
    id: "visual",
    title: "Aparência",
    description: "Ajuste a aparência e o comportamento visual.",
    icon: "Palette",
    toggles: [
      { key: "animations", label: "Animações", description: "Transições suaves com Framer Motion." },
      { key: "grid", label: "Grade de fundo", description: "Mostra pontos de grade no canvas." },
      { key: "minimap", label: "Minimapa", description: "Visão geral no canto." },
      { key: "edgeLabels", label: "Rótulos das arestas", description: "Exibe o tipo/label das conexões." },
      { key: "autoColors", label: "Cores automáticas", description: "Coloração automática por tipo de nó." },
      { key: "glow", label: "Brilho na seleção", description: "Efeito de glow no nó selecionado." },
      { key: "rounded", label: "Cantos arredondados", description: "Nodes com cantos arredondados." },
      { key: "showStatusBar", label: "Barra de status", description: "Barra inferior com informações." },
    ],
  },
  {
    id: "editor",
    title: "Editor",
    description: "Comportamento da edição e do salvamento.",
    icon: "Settings2",
    toggles: [
      { key: "autosave", label: "Salvamento automático", description: "Salva alterações automaticamente." },
      { key: "snapToGrid", label: "Encaixar na grade", description: "Atrai os nós à grade ao mover." },
      { key: "alignmentGuides", label: "Guias de alinhamento", description: "Mostrar linhas guia ao arrastar nós." },
      { key: "keyboardShortcuts", label: "Atalhos de teclado", description: "Habilita atalhos (Tab, Delete, etc.)." },
      { key: "multiSelect", label: "Multi-seleção", description: "Selecionar vários nós com Shift." },
      { key: "undoRedo", label: "Desfazer/Refazer", description: "Histórico de ações." },
      { key: "confirmDelete", label: "Confirmar exclusão", description: "Pede confirmação ao excluir." },
    ],
  },
  {
    id: "performance",
    title: "Performance",
    description: "Ajustes para mapas grandes.",
    icon: "Gauge",
    toggles: [
      { key: "virtualization", label: "Virtualização", description: "Renderiza só os nós visíveis (mapas grandes)." },
      { key: "antialiasing", label: "Antialiasing", description: "Suavização de bordas do SVG." },
      { key: "reducedMotion", label: "Movimento reduzido", description: "Reduz animações para acessibilidade." },
    ],
  },
  {
    id: "export",
    title: "Exportação",
    description: "Quais formatos de exportação habilitar.",
    icon: "Download",
    toggles: [
      { key: "png", label: "Exportar PNG", description: "Imagem do mapa." },
      { key: "json", label: "Exportar JSON", description: "Dados brutos do mapa." },
      { key: "markdown", label: "Exportar Markdown", description: "Lista hierárquica em MD." },
      { key: "includeNotes", label: "Incluir notas (MD)", description: "Inclui notas dos nós no Markdown." },
    ],
  },
];

// Theme accent color palettes (avoiding indigo/blue per design rules)
export const ACCENT_PALETTES: Record<
  FeatureSettings["theme"]["accent"],
  { primary: string; primaryFg: string; soft: string; ring: string; name: string }
> = {
  emerald: {
    name: "Esmeralda",
    primary: "#10b981",
    primaryFg: "#052e1b",
    soft: "rgba(16,185,129,0.14)",
    ring: "rgba(16,185,129,0.45)",
  },
  rose: {
    name: "Rosa",
    primary: "#f43f5e",
    primaryFg: "#2b0a12",
    soft: "rgba(244,63,94,0.14)",
    ring: "rgba(244,63,94,0.45)",
  },
  amber: {
    name: "Âmbar",
    primary: "#f59e0b",
    primaryFg: "#2b1d05",
    soft: "rgba(245,158,11,0.14)",
    ring: "rgba(245,158,11,0.45)",
  },
  violet: {
    name: "Violeta",
    primary: "#8b5cf6",
    primaryFg: "#1a1030",
    soft: "rgba(139,92,246,0.14)",
    ring: "rgba(139,92,246,0.45)",
  },
  teal: {
    name: "Turquesa",
    primary: "#14b8a6",
    primaryFg: "#04261f",
    soft: "rgba(20,184,166,0.14)",
    ring: "rgba(20,184,166,0.45)",
  },
};

// Node kind color mapping (when autoColors is enabled)
export const NODE_KIND_META: Record<
  NodeKind,
  { label: string; color: string; icon: string }
> = {
  concept: { label: "Conceito", color: "#10b981", icon: "Lightbulb" },
  question: { label: "Pergunta", color: "#f59e0b", icon: "HelpCircle" },
  action: { label: "Ação", color: "#f43f5e", icon: "Zap" },
  idea: { label: "Ideia", color: "#8b5cf6", icon: "Sparkles" },
  resource: { label: "Recurso", color: "#14b8a6", icon: "BookMarked" },
  goal: { label: "Objetivo", color: "#ec4899", icon: "Target" },
};

export const EDGE_KIND_META: Record<
  EdgeKind,
  { label: string; color: string; dash: string }
> = {
  related: { label: "Relacionado", color: "#64748b", dash: "none" },
  causes: { label: "Causa", color: "#f59e0b", dash: "none" },
  supports: { label: "Apoia", color: "#10b981", dash: "none" },
  contradicts: { label: "Contradiz", color: "#f43f5e", dash: "6 4" },
  depends: { label: "Depende", color: "#8b5cf6", dash: "4 4" },
};

import type { NodeKind, EdgeKind } from "./types";
