// Pre-built mind-map templates that users can spawn with one click.
// Nodes are listed in order; edges reference nodes by their index in the array
// (sourceId/targetId as stringified indices). The API will resolve these to real IDs.

import type { NodeKind, EdgeKind } from "./types";

export interface TemplateNode {
  title: string;
  kind?: NodeKind;
  content?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface TemplateEdge {
  sourceId: string; // index as string
  targetId: string; // index as string
  label?: string;
  kind?: EdgeKind;
}

export interface MindMapTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  title: string; // map title to use
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

// Helper to compute a radial layout for template nodes
function radial(n: number, radius: number): Array<{ x: number; y: number }> {
  if (n <= 0) return [];
  if (n === 1) return [{ x: 0, y: 0 }];
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

// ─── Template 1: Brainstorm de Ideias ─────────────────────────────────────────
const brainstormNodes: TemplateNode[] = [
  { title: "Tema Central", kind: "goal", content: "O problema ou oportunidade", ...radial(1, 0)[0], width: 220, height: 88 },
];
const brainstormChildren: Array<{ title: string; kind: NodeKind; content: string }> = [
  { title: "Por quê?", kind: "question", content: "Motivação e contexto" },
  { title: "O quê?", kind: "question", content: "Definição do problema" },
  { title: "Para quem?", kind: "question", content: "Público-alvo" },
  { title: "Como?", kind: "action", content: "Estratégia e abordagem" },
  { title: "Recursos", kind: "resource", content: "O que precisamos" },
  { title: "Riscos", kind: "idea", content: "O que pode dar errado" },
];
const bmPositions = radial(brainstormChildren.length, 320);
brainstormChildren.forEach((c, i) => {
  brainstormNodes.push({
    ...c,
    x: bmPositions[i].x - 110,
    y: bmPositions[i].y - 44,
    width: 200,
    height: 80,
  });
});
const brainstormEdges: TemplateEdge[] = brainstormChildren.map((_, i) => ({
  sourceId: "0",
  targetId: String(i + 1),
  label: "explora",
  kind: "related",
}));

// ─── Template 2: Planejamento de Projeto ──────────────────────────────────────
const projectNodes: TemplateNode[] = [
  { title: "Projeto", kind: "goal", content: "Visão geral", x: 0, y: 0, width: 220, height: 88 },
  { title: "Objetivos", kind: "goal", content: "Metas mensuráveis", x: -360, y: -200, width: 200, height: 80 },
  { title: "Escopo", kind: "concept", content: "O que está incluído", x: 0, y: -240, width: 200, height: 80 },
  { title: "Cronograma", kind: "action", content: "Marcos e prazos", x: 360, y: -200, width: 200, height: 80 },
  { title: "Equipe", kind: "resource", content: "Pessoas e papéis", x: -360, y: 200, width: 200, height: 80 },
  { title: "Orçamento", kind: "resource", content: "Recursos financeiros", x: 0, y: 240, width: 200, height: 80 },
  { title: "Entregáveis", kind: "action", content: "Resultados esperados", x: 360, y: 200, width: 200, height: 80 },
];
const projectEdges: TemplateEdge[] = [
  { sourceId: "0", targetId: "1", label: "define", kind: "supports" },
  { sourceId: "0", targetId: "2", label: "inclui", kind: "related" },
  { sourceId: "0", targetId: "3", label: "controla", kind: "related" },
  { sourceId: "0", targetId: "4", label: "requer", kind: "depends" },
  { sourceId: "0", targetId: "5", label: "requer", kind: "depends" },
  { sourceId: "0", targetId: "6", label: "produz", kind: "causes" },
];

// ─── Template 3: Estudo / Resumo de Livro ────────────────────────────────────
const studyNodes: TemplateNode[] = [
  { title: "Livro / Assunto", kind: "goal", content: "Título da obra", x: 0, y: 0, width: 220, height: 88 },
  { title: "Capítulo 1", kind: "concept", content: "Ideia principal", x: -340, y: -160, width: 200, height: 80 },
  { title: "Capítulo 2", kind: "concept", content: "Ideia principal", x: 0, y: -220, width: 200, height: 80 },
  { title: "Capítulo 3", kind: "concept", content: "Ideia principal", x: 340, y: -160, width: 200, height: 80 },
  { title: "Personagens", kind: "resource", content: "Quem participa", x: -340, y: 160, width: 200, height: 80 },
  { title: "Temas", kind: "idea", content: "Mensagens profundas", x: 0, y: 220, width: 200, height: 80 },
  { title: "Aprendizados", kind: "action", content: "O que levar", x: 340, y: 160, width: 200, height: 80 },
];
const studyEdges: TemplateEdge[] = [
  { sourceId: "0", targetId: "1", label: "contém", kind: "related" },
  { sourceId: "0", targetId: "2", label: "contém", kind: "related" },
  { sourceId: "0", targetId: "3", label: "contém", kind: "related" },
  { sourceId: "0", targetId: "4", label: "envolve", kind: "related" },
  { sourceId: "0", targetId: "5", label: "aborda", kind: "supports" },
  { sourceId: "0", targetId: "6", label: "gera", kind: "causes" },
];

// ─── Template 4: Análise de Decisão (Prós/Contras) ───────────────────────────
const decisionNodes: TemplateNode[] = [
  { title: "Decisão", kind: "question", content: "O que decidir", x: 0, y: 0, width: 220, height: 88 },
  { title: "Prós", kind: "idea", content: "Vantagens", x: -300, y: -140, width: 180, height: 72 },
  { title: "Contras", kind: "action", content: "Desvantagens", x: 300, y: -140, width: 180, height: 72 },
  { title: "Critério 1", kind: "concept", content: "Custo", x: -440, y: 60, width: 160, height: 72 },
  { title: "Critério 2", kind: "concept", content: "Tempo", x: -260, y: 80, width: 160, height: 72 },
  { title: "Critério 3", kind: "concept", content: "Qualidade", x: 260, y: 80, width: 160, height: 72 },
  { title: "Critério 4", kind: "concept", content: "Risco", x: 440, y: 60, width: 160, height: 72 },
  { title: "Veredito", kind: "goal", content: "Decisão final", x: 0, y: 200, width: 200, height: 80 },
];
const decisionEdges: TemplateEdge[] = [
  { sourceId: "0", targetId: "1", kind: "supports", label: "a favor" },
  { sourceId: "0", targetId: "2", kind: "contradicts", label: "contra" },
  { sourceId: "1", targetId: "3", kind: "related" },
  { sourceId: "1", targetId: "4", kind: "related" },
  { sourceId: "2", targetId: "5", kind: "related" },
  { sourceId: "2", targetId: "6", kind: "related" },
  { sourceId: "0", targetId: "7", kind: "causes", label: "conclui" },
];

export const MINDMAP_TEMPLATES: MindMapTemplate[] = [
  {
    id: "brainstorm",
    name: "Brainstorm",
    description: "Estrutura 5W2H para explorar um tema",
    emoji: "💡",
    title: "Brainstorm de Ideias",
    nodes: brainstormNodes,
    edges: brainstormEdges,
  },
  {
    id: "project",
    name: "Projeto",
    description: "Planejamento completo de projeto",
    emoji: "📋",
    title: "Planejamento de Projeto",
    nodes: projectNodes,
    edges: projectEdges,
  },
  {
    id: "study",
    name: "Estudo",
    description: "Resumo de livro ou matéria",
    emoji: "📚",
    title: "Resumo de Estudo",
    nodes: studyNodes,
    edges: studyEdges,
  },
  {
    id: "decision",
    name: "Decisão",
    description: "Análise prós/contras com critérios",
    emoji: "⚖️",
    title: "Análise de Decisão",
    nodes: decisionNodes,
    edges: decisionEdges,
  },
  {
    id: "swot",
    name: "SWOT",
    description: "Forças, Fraquezas, Oportunidades, Ameaças",
    emoji: "🎯",
    title: "Análise SWOT",
    nodes: [
      { title: "Análise SWOT", kind: "goal", content: "Objeto de análise", x: 0, y: 0, width: 220, height: 88 },
      { title: "Forças (S)", kind: "idea", content: "Vantagens internas", x: -340, y: -180, width: 200, height: 80 },
      { title: "Fragilidades (W)", kind: "action", content: "Limitações internas", x: 340, y: -180, width: 200, height: 80 },
      { title: "Oportunidades (O)", kind: "resource", content: "Fatores externos positivos", x: -340, y: 180, width: 200, height: 80 },
      { title: "Ameaças (T)", kind: "question", content: "Fatores externos negativos", x: 340, y: 180, width: 200, height: 80 },
      { title: "Estratégia FO", kind: "concept", content: "Usar forças para aproveitar oportunidades", x: -520, y: 0, width: 180, height: 72 },
      { title: "Estratégia FA", kind: "concept", content: "Usar forças contra ameaças", x: -520, y: -100, width: 180, height: 72 },
      { title: "Estratégia WO", kind: "concept", content: "Superar fragilidades com oportunidades", x: 520, y: 0, width: 180, height: 72 },
      { title: "Estratégia WT", kind: "concept", content: "Minimizar fragilidades e ameaças", x: 520, y: 100, width: 180, height: 72 },
    ],
    edges: [
      { sourceId: "0", targetId: "1", label: "interna", kind: "supports" },
      { sourceId: "0", targetId: "2", label: "interna", kind: "contradicts" },
      { sourceId: "0", targetId: "3", label: "externa", kind: "related" },
      { sourceId: "0", targetId: "4", label: "externa", kind: "contradicts" },
      { sourceId: "1", targetId: "5", kind: "causes" },
      { sourceId: "1", targetId: "6", kind: "causes" },
      { sourceId: "2", targetId: "7", kind: "related" },
      { sourceId: "2", targetId: "8", kind: "related" },
      { sourceId: "3", targetId: "5", kind: "related" },
      { sourceId: "3", targetId: "7", kind: "related" },
      { sourceId: "4", targetId: "6", kind: "related" },
      { sourceId: "4", targetId: "8", kind: "related" },
    ],
  },
  {
    id: "okr",
    name: "OKR",
    description: "Objectives & Key Results",
    emoji: "🏆",
    title: "Planejamento OKR",
    nodes: [
      { title: "Objetivo Principal", kind: "goal", content: "O que queremos alcançar", x: 0, y: 0, width: 240, height: 88 },
      { title: "Key Result 1", kind: "action", content: "Mensurável e com prazo", x: -360, y: -160, width: 200, height: 80 },
      { title: "Key Result 2", kind: "action", content: "Mensurável e com prazo", x: 0, y: -200, width: 200, height: 80 },
      { title: "Key Result 3", kind: "action", content: "Mensurável e com prazo", x: 360, y: -160, width: 200, height: 80 },
      { title: "Iniciativa A", kind: "idea", content: "Como atingir KR1", x: -500, y: 80, width: 170, height: 72 },
      { title: "Iniciativa B", kind: "idea", content: "Como atingir KR2", x: -160, y: 140, width: 170, height: 72 },
      { title: "Iniciativa C", kind: "idea", content: "Como atingir KR2", x: 160, y: 140, width: 170, height: 72 },
      { title: "Iniciativa D", kind: "idea", content: "Como atingir KR3", x: 500, y: 80, width: 170, height: 72 },
      { title: "Owner", kind: "resource", content: "Responsável", x: 0, y: 260, width: 180, height: 72 },
    ],
    edges: [
      { sourceId: "0", targetId: "1", label: "KR1", kind: "supports" },
      { sourceId: "0", targetId: "2", label: "KR2", kind: "supports" },
      { sourceId: "0", targetId: "3", label: "KR3", kind: "supports" },
      { sourceId: "1", targetId: "4", kind: "causes" },
      { sourceId: "2", targetId: "5", kind: "causes" },
      { sourceId: "2", targetId: "6", kind: "causes" },
      { sourceId: "3", targetId: "7", kind: "causes" },
      { sourceId: "0", targetId: "8", label: "dono", kind: "depends" },
    ],
  },
  {
    id: "timeline",
    name: "Linha do Tempo",
    description: "Cronograma de eventos ou fases",
    emoji: "📅",
    title: "Linha do Tempo",
    nodes: [
      { title: "Início", kind: "goal", content: "Ponto de partida", x: -540, y: 0, width: 180, height: 80 },
      { title: "Fase 1", kind: "action", content: "Planejamento", x: -270, y: -120, width: 180, height: 80 },
      { title: "Fase 2", kind: "action", content: "Execução", x: 0, y: 0, width: 180, height: 80 },
      { title: "Fase 3", kind: "action", content: "Avaliação", x: 270, y: -120, width: 180, height: 80 },
      { title: "Marco 1", kind: "idea", content: "Entrega intermediária", x: -270, y: 120, width: 170, height: 72 },
      { title: "Marco 2", kind: "idea", content: "Entrega principal", x: 270, y: 120, width: 170, height: 72 },
      { title: "Fim", kind: "goal", content: "Conclusão", x: 540, y: 0, width: 180, height: 80 },
      { title: "Recursos", kind: "resource", content: "Equipamento, equipe, orçamento", x: 0, y: 240, width: 200, height: 80 },
    ],
    edges: [
      { sourceId: "0", targetId: "1", label: "inicia", kind: "causes" },
      { sourceId: "1", targetId: "2", label: "segue", kind: "causes" },
      { sourceId: "2", targetId: "3", label: "segue", kind: "causes" },
      { sourceId: "3", targetId: "6", label: "conclui", kind: "causes" },
      { sourceId: "1", targetId: "4", kind: "related" },
      { sourceId: "3", targetId: "5", kind: "related" },
      { sourceId: "2", targetId: "7", label: "requer", kind: "depends" },
    ],
  },
];
