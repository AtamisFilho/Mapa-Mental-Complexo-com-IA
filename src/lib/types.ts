// Core domain types for the Mind Map application

export type NodeKind =
  | "concept"
  | "question"
  | "action"
  | "idea"
  | "resource"
  | "goal";

export type EdgeKind =
  | "related"
  | "causes"
  | "supports"
  | "contradicts"
  | "depends";

export interface MapNode {
  id: string;
  mapId: string;
  parentId?: string | null;
  title: string;
  content?: string | null;
  note?: string | null;
  kind: NodeKind;
  color?: string | null;
  icon?: string | null;
  image?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MapEdge {
  id: string;
  mapId: string;
  sourceId: string;
  targetId: string;
  label?: string | null;
  kind: EdgeKind;
  createdAt: string;
}

export interface MindMapData {
  id: string;
  title: string;
  description?: string | null;
  theme: string;
  tags?: string | null;
  starred: boolean;
  nodes: MapNode[];
  edges: MapEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface MindMapSummary {
  id: string;
  title: string;
  description?: string | null;
  theme: string;
  tags?: string | null;
  starred: boolean;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

// Viewport for the canvas
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export type Tool = "select" | "pan" | "connect" | "addNode";
