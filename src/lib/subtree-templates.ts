// Subtree templates that users can INSERT into the current mind map (rather than
// spawning a whole new map). Each template is a recursive tree of nodes which
// will be inserted at a chosen position by the store's `insertSubtree` action.

import type { NodeKind } from "./types";

export interface SubtreeTemplateNode {
  title: string;
  content?: string;
  note?: string;
  kind: NodeKind; // "concept" | "question" | "action" | "idea" | "resource" | "goal"
  icon?: string; // emoji
  children?: SubtreeTemplateNode[];
}

export type SubtreeTemplateCategory =
  | "productivity"
  | "study"
  | "business"
  | "creative"
  | "personal";

export interface SubtreeTemplate {
  id: string;
  name: string;
  description: string;
  category: SubtreeTemplateCategory;
  icon: string; // emoji
  root: SubtreeTemplateNode;
}

// ─── Category metadata (colors used by the TemplatesPanel) ───────────────────
export const SUBTREE_CATEGORY_META: Record<
  SubtreeTemplateCategory,
  { label: string; color: string }
> = {
  productivity: { label: "Produtividade", color: "#10b981" },
  study: { label: "Estudos", color: "#f59e0b" },
  business: { label: "Negócios", color: "#14b8a6" },
  creative: { label: "Criativo", color: "#8b5cf6" },
  personal: { label: "Pessoal", color: "#ec4899" },
};

// Helper to count the total nodes in a subtree (used for the badge)
export function countSubtreeNodes(node: SubtreeTemplateNode): number {
  let count = 1;
  if (node.children) {
    for (const c of node.children) count += countSubtreeNodes(c);
  }
  return count;
}

// ─── Template 1: Reunião eficaz ──────────────────────────────────────────────
const reuniaoEficaz: SubtreeTemplate = {
  id: "reuniao-eficaz",
  name: "Reunião eficaz",
  description:
    "Estrutura completa para conduzir e documentar uma reunião produtiva.",
  category: "productivity",
  icon: "🗓️",
  root: {
    title: "Reunião",
    kind: "goal",
    content: "Tema e objetivo da reunião",
    icon: "🗓️",
    children: [
      {
        title: "Pauta",
        kind: "concept",
        content: "Tópicos a serem discutidos",
        icon: "📋",
        children: [
          { title: "Tópicos", kind: "concept", content: "Lista de assuntos" },
          { title: "Tempo por tópico", kind: "resource", content: "Cronograma estimado" },
        ],
      },
      {
        title: "Participantes",
        kind: "resource",
        content: "Quem está presente",
        icon: "👥",
        children: [
          { title: "Anfitrião", kind: "resource", content: "Quem conduz" },
          { title: "Convidados", kind: "resource", content: "Demais participantes" },
        ],
      },
      { title: "Decisões", kind: "idea", content: "Acordos tomados", icon: "💡" },
      {
        title: "Itens de ação",
        kind: "action",
        content: "O que precisa ser feito",
        icon: "⚡",
        children: [
          { title: "Responsável", kind: "resource", content: "Quem fará" },
          { title: "Prazo", kind: "action", content: "Quando entregar" },
        ],
      },
      { title: "Follow-up", kind: "action", content: "Acompanhamento pós-reunião", icon: "🔄" },
    ],
  },
};

// ─── Template 2: Revisão semanal ─────────────────────────────────────────────
const revisaoSemanal: SubtreeTemplate = {
  id: "revisao-semanal",
  name: "Revisão semanal",
  description: "Reflexão estruturada sobre a semana e planejamento da próxima.",
  category: "productivity",
  icon: "📅",
  root: {
    title: "Revisão Semanal",
    kind: "goal",
    content: "Avaliação dos últimos 7 dias",
    icon: "📅",
    children: [
      {
        title: "Vitórias",
        kind: "idea",
        content: "Conquistas da semana",
        icon: "🎉",
        children: [
          { title: "Pessoal", kind: "idea", content: "Sucessos pessoais" },
          { title: "Profissional", kind: "idea", content: "Sucessos no trabalho" },
        ],
      },
      { title: "Desafios", kind: "question", content: "Obstáculos enfrentados", icon: "🧗" },
      { title: "Lições", kind: "concept", content: "Aprendizados extraídos", icon: "🧠" },
      {
        title: "Prioridades da próxima semana",
        kind: "action",
        content: "Focos principais",
        icon: "🎯",
        children: [
          { title: "Top 3", kind: "action", content: "As 3 prioridades máximas" },
          { title: "Tarefas secundárias", kind: "action", content: "Desejáveis, não críticas" },
        ],
      },
    ],
  },
};

// ─── Template 3: Decisão 5W2H ────────────────────────────────────────────────
const decisao5W2H: SubtreeTemplate = {
  id: "decisao-5w2h",
  name: "Decisão 5W2H",
  description: "Estrutura completa para tomada de decisão estruturada.",
  category: "productivity",
  icon: "🧭",
  root: {
    title: "Decisão 5W2H",
    kind: "question",
    content: "Questão central a decidir",
    icon: "🧭",
    children: [
      { title: "Quem", kind: "resource", content: "Responsável / pessoas envolvidas", icon: "👤" },
      { title: "O quê", kind: "concept", content: "Definição da decisão", icon: "❓" },
      { title: "Quando", kind: "action", content: "Prazo e momento", icon: "⏰" },
      { title: "Onde", kind: "resource", content: "Local ou contexto", icon: "📍" },
      { title: "Por quê", kind: "idea", content: "Motivação e justificativa", icon: "💡" },
      { title: "Como", kind: "action", content: "Método e passos", icon: "⚙️" },
      { title: "Quanto", kind: "resource", content: "Custo e investimento", icon: "💰" },
    ],
  },
};

// ─── Template 4: Resumo de livro ─────────────────────────────────────────────
const resumoLivro: SubtreeTemplate = {
  id: "resumo-livro",
  name: "Resumo de livro",
  description: "Estrutura para resumir e extrair valor de uma obra.",
  category: "study",
  icon: "📚",
  root: {
    title: "Resumo do Livro",
    kind: "goal",
    content: "Título da obra e autor",
    icon: "📚",
    children: [
      { title: "Tese central", kind: "concept", content: "Ideia principal do autor", icon: "🎯" },
      {
        title: "Argumentos-chave",
        kind: "idea",
        content: "Pontos defendidos",
        icon: "💡",
        children: [
          { title: "Argumento 1", kind: "idea", content: "Primeiro argumento central" },
          { title: "Argumento 2", kind: "idea", content: "Segundo argumento central" },
        ],
      },
      { title: "Evidências", kind: "resource", content: "Dados, estudos e exemplos", icon: "📊" },
      { title: "Contrapontos", kind: "question", content: "Críticas e visões alternativas", icon: "⚖️" },
      { title: "Aplicação prática", kind: "action", content: "Como usar no dia a dia", icon: "⚡" },
    ],
  },
};

// ─── Template 5: Método Feynman ──────────────────────────────────────────────
const metodoFeynman: SubtreeTemplate = {
  id: "metodo-feynman",
  name: "Método Feynman",
  description: "Aprender profundamente explicando de forma simples.",
  category: "study",
  icon: "🧪",
  root: {
    title: "Método Feynman",
    kind: "goal",
    content: "Estratégia de aprendizado profundo",
    icon: "🧪",
    children: [
      { title: "Tópico", kind: "concept", content: "Conceito que quer dominar", icon: "📖" },
      {
        title: "Explicar de forma simples",
        kind: "action",
        content: "Como explicaria a uma criança",
        icon: "🗣️",
        children: [
          { title: "Analogia", kind: "idea", content: "Comparação com algo conhecido" },
          { title: "Exemplo", kind: "resource", content: "Caso concreto" },
        ],
      },
      { title: "Identificar lacunas", kind: "question", content: "Onde você travou?", icon: "🔍" },
      { title: "Refinar", kind: "action", content: "Estudar pontos fracos e simplificar", icon: "🔄" },
      { title: "Ensinar a outrem", kind: "resource", content: "Apresentar para consolidar", icon: "👨‍🏫" },
    ],
  },
};

// ─── Template 6: Aprendizado ativo ───────────────────────────────────────────
const aprendizadoAtivo: SubtreeTemplate = {
  id: "aprendizado-ativo",
  name: "Aprendizado ativo",
  description: "Ciclo de 5 etapas (SQ3R) para estudo eficiente.",
  category: "study",
  icon: "🎓",
  root: {
    title: "Aprendizado Ativo",
    kind: "goal",
    content: "Ciclo SQ3R adaptado",
    icon: "🎓",
    children: [
      {
        title: "Pré-visualização",
        kind: "concept",
        content: "Visão geral antes de aprofundar",
        icon: "👀",
        children: [
          { title: "Sumário", kind: "resource", content: "Resumo do material" },
          { title: "Objetivos", kind: "goal", content: "O que se quer aprender" },
        ],
      },
      { title: "Perguntas", kind: "question", content: "O que responder com o estudo", icon: "❓" },
      { title: "Leitura ativa", kind: "action", content: "Ler fazendo anotações", icon: "📝" },
      { title: "Recitar", kind: "idea", content: "Reproduzir sem olhar o texto", icon: "🗣️" },
      { title: "Revisão", kind: "action", content: "Espaçada e ativa", icon: "🔄" },
    ],
  },
};

// ─── Template 7: Análise SWOT compacta ───────────────────────────────────────
const swotCompacta: SubtreeTemplate = {
  id: "swot-compacta",
  name: "Análise SWOT compacta",
  description: "Forças, Fraquezas, Oportunidades e Ameaças em um quadrante.",
  category: "business",
  icon: "📊",
  root: {
    title: "Análise SWOT",
    kind: "goal",
    content: "Avaliação estratégica de 4 quadrantes",
    icon: "📊",
    children: [
      {
        title: "Forças (S)",
        kind: "idea",
        content: "Vantagens internas",
        icon: "💪",
        children: [
          { title: "Recurso-chave", kind: "idea", content: "Diferencial competitivo" },
          { title: "Capacidade", kind: "idea", content: "Competência distinta" },
        ],
      },
      { title: "Fraquezas (W)", kind: "question", content: "Limitações internas", icon: "⚠️" },
      { title: "Oportunidades (O)", kind: "idea", content: "Tendências externas positivas", icon: "🌟" },
      { title: "Ameaças (T)", kind: "action", content: "Riscos externos", icon: "🛡️" },
    ],
  },
};

// ─── Template 8: Canvas de proposta de valor ─────────────────────────────────
const canvasPropostaValor: SubtreeTemplate = {
  id: "canvas-proposta-valor",
  name: "Canvas de proposta de valor",
  description: "Modelo de Value Proposition Canvas para produtos e serviços.",
  category: "business",
  icon: "🎨",
  root: {
    title: "Proposta de Valor",
    kind: "goal",
    content: "Ajuste entre cliente e solução",
    icon: "🎨",
    children: [
      {
        title: "Cliente",
        kind: "resource",
        content: "Perfil do segmento-alvo",
        icon: "👥",
        children: [
          { title: "Jobs", kind: "action", content: "Tarefas que o cliente quer realizar" },
          { title: "Dores", kind: "question", content: "Frustrações e obstáculos" },
          { title: "Ganhos", kind: "idea", content: "Benefícios desejados" },
        ],
      },
      { title: "Produtos e Serviços", kind: "concept", content: "O que você oferece", icon: "📦" },
      { title: "Criadores de Ganho", kind: "idea", content: "Como você gera benefícios", icon: "✨" },
      { title: "Aliviadores de Dor", kind: "action", content: "Como você elimina frustrações", icon: "🩹" },
    ],
  },
};

// ─── Template 9: 5 Forças de Porter ──────────────────────────────────────────
const porters5Forcas: SubtreeTemplate = {
  id: "porters-5-forcas",
  name: "5 Forças de Porter",
  description: "Análise competitiva em cinco dimensões estratégicas.",
  category: "business",
  icon: "⚔️",
  root: {
    title: "5 Forças de Porter",
    kind: "goal",
    content: "Avaliação do ambiente competitivo",
    icon: "⚔️",
    children: [
      { title: "Rivais", kind: "action", content: "Concorrentes diretos", icon: "🥊" },
      { title: "Novos entrantes", kind: "question", content: "Ameaça de novos jogadores", icon: "🚪" },
      { title: "Substitutos", kind: "idea", content: "Soluções alternativas", icon: "🔁" },
      {
        title: "Fornecedores",
        kind: "resource",
        content: "Poder de barganha upstream",
        icon: "🏭",
        children: [
          { title: "Poder", kind: "resource", content: "Quão dependente você é" },
          { title: "Concentração", kind: "concept", content: "Poucos ou muitos fornecedores" },
        ],
      },
      { title: "Compradores", kind: "resource", content: "Poder de barganha downstream", icon: "🛒" },
    ],
  },
};

// ─── Template 10: Brainstorm SCAMPER ─────────────────────────────────────────
const scamper: SubtreeTemplate = {
  id: "brainstorm-scamper",
  name: "Brainstorm SCAMPER",
  description: "Sete técnicas para gerar variações criativas de uma ideia.",
  category: "creative",
  icon: "✨",
  root: {
    title: "Brainstorm SCAMPER",
    kind: "idea",
    content: "Técnicas de pensamento criativo",
    icon: "✨",
    children: [
      {
        title: "Substituir",
        kind: "action",
        content: "O que pode ser trocado?",
        icon: "🔁",
        children: [
          { title: "Material", kind: "resource", content: "Insumos alternativos" },
          { title: "Processo", kind: "action", content: "Maneira diferente de fazer" },
        ],
      },
      { title: "Combinar", kind: "idea", content: "Juntar com outro elemento", icon: "🔗" },
      { title: "Adaptar", kind: "action", content: "Inspirar-se em algo externo", icon: "🧩" },
      { title: "Modificar", kind: "idea", content: "Mudar forma ou atributos", icon: "✏️" },
      { title: "Usar de outro jeito", kind: "concept", content: "Novos usos possíveis", icon: "🔄" },
      { title: "Eliminar", kind: "action", content: "Remover partes desnecessárias", icon: "✂️" },
      { title: "Inverter", kind: "question", content: "Reorganizar ou virar ao contrário", icon: "🔃" },
    ],
  },
};

// ─── Template 11: Storyboard de ideia ────────────────────────────────────────
const storyboard: SubtreeTemplate = {
  id: "storyboard-ideia",
  name: "Storyboard de ideia",
  description: "Estrutura narrativa em 6 atos para desenvolver uma história.",
  category: "creative",
  icon: "🎬",
  root: {
    title: "Storyboard",
    kind: "idea",
    content: "Estrutura narrativa da ideia",
    icon: "🎬",
    children: [
      {
        title: "Premissa",
        kind: "concept",
        content: "Conceito central",
        icon: "💡",
        children: [
          { title: "Tema", kind: "concept", content: "Assunto subjacente" },
          { title: "Tom", kind: "idea", content: "Clima e estilo" },
        ],
      },
      { title: "Personagens", kind: "resource", content: "Protagonistas e coadjuvantes", icon: "👥" },
      { title: "Cenário", kind: "concept", content: "Tempo e lugar", icon: "🗺️" },
      { title: "Conflito", kind: "question", content: "Tensão central", icon: "⚔️" },
      { title: "Clímax", kind: "action", content: "Ponto de virada", icon: "💥" },
      { title: "Resolução", kind: "goal", content: "Desfecho e mensagem", icon: "🎬" },
    ],
  },
};

// ─── Template 12: Hábito atômico ─────────────────────────────────────────────
const habitoAtomico: SubtreeTemplate = {
  id: "habito-atomico",
  name: "Hábito atômico",
  description: "Desconstrói um hábito em suas 4 leis + identidade.",
  category: "personal",
  icon: "🔁",
  root: {
    title: "Hábito Atômico",
    kind: "goal",
    content: "Hábito a instalar ou remover",
    icon: "🔁",
    children: [
      {
        title: "Gatilho",
        kind: "question",
        content: "Sinal que inicia o hábito",
        icon: "🔔",
        children: [
          { title: "Tempo", kind: "question", content: "Quando acontece" },
          { title: "Lugar", kind: "resource", content: "Onde acontece" },
          { title: "Estado emocional", kind: "idea", content: "Como você se sente" },
        ],
      },
      { title: "Desejo", kind: "idea", content: "Motivação por trás do hábito", icon: "💭" },
      { title: "Resposta", kind: "action", content: "Comportamento em si", icon: "🏃" },
      { title: "Recompensa", kind: "resource", content: "Benefício imediato", icon: "🎁" },
      { title: "Identidade", kind: "concept", content: "Quem você se torna com este hábito", icon: "🪞" },
    ],
  },
};

// ─── Template 13: Planejamento de viagem ─────────────────────────────────────
const planejamentoViagem: SubtreeTemplate = {
  id: "planejamento-viagem",
  name: "Planejamento de viagem",
  description: "Roteiro completo de viagem com orçamento e checklist.",
  category: "personal",
  icon: "✈️",
  root: {
    title: "Planejamento de Viagem",
    kind: "goal",
    content: "Trip a ser planejado",
    icon: "✈️",
    children: [
      {
        title: "Destino",
        kind: "concept",
        content: "Para onde ir",
        icon: "🌍",
        children: [
          { title: "Cidade", kind: "concept", content: "Local específico" },
          { title: "Época do ano", kind: "resource", content: "Melhor estação" },
        ],
      },
      {
        title: "Orçamento",
        kind: "resource",
        content: "Quanto vai custar",
        icon: "💰",
        children: [
          { title: "Transporte", kind: "resource", content: "Passagens e deslocamentos" },
          { title: "Hospedagem", kind: "resource", content: "Onde ficar" },
        ],
      },
      { title: "Roteiro", kind: "action", content: "Atividades dia a dia", icon: "🗺️" },
      { title: "Lista de bagagem", kind: "resource", content: "O que levar", icon: "🎒" },
      { title: "Documentos", kind: "resource", content: "Passaporte, vistos, seguros", icon: "📄" },
    ],
  },
};

export const SUBTREE_TEMPLATES: SubtreeTemplate[] = [
  reuniaoEficaz,
  revisaoSemanal,
  decisao5W2H,
  resumoLivro,
  metodoFeynman,
  aprendizadoAtivo,
  swotCompacta,
  canvasPropostaValor,
  porters5Forcas,
  scamper,
  storyboard,
  habitoAtomico,
  planejamentoViagem,
];
