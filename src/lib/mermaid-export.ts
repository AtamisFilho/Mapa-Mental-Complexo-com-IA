import type { MapNode, MapEdge } from "@/lib/types";
import { NODE_KIND_META, EDGE_KIND_META } from "@/lib/settings";

/**
 * Sanitize a node ID for Mermaid syntax — replace non-alphanumeric chars
 * with underscores so Mermaid doesn't choke on special characters.
 */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * Escape a title string for Mermaid node labels.
 * Mermaid uses ["..."] for node labels, so we need to escape
 * characters that conflict with Mermaid syntax.
 */
function escapeMermaidTitle(title: string): string {
  return title
    .replace(/"/g, "#quot;")
    .replace(/\[/g, "#91;")
    .replace(/\]/g, "#93;")
    .replace(/\{/g, "#123;")
    .replace(/\}/g, "#125;")
    .replace(/</g, "#lt;")
    .replace(/>/g, "#gt;");
}

/**
 * Generate a Mermaid flowchart diagram from mind map nodes and edges.
 * Returns a string wrapped in a ```mermaid code block.
 *
 * Algorithm:
 * 1. Build sanitized IDs for each node
 * 2. Declare each node with its kind-colored class
 * 3. Create edges with labels (using edge kind label when no custom label)
 * 4. Add style classes per node kind (concept→green, question→amber, etc.)
 * 5. Wrap in ```mermaid\n...\n``` block
 */
export function generateMermaid(
  nodes: MapNode[],
  edges: MapEdge[],
  mapTitle?: string
): string {
  if (nodes.length === 0) {
    const emptyDiagram = "```mermaid\ngraph TD\n  empty[\"Mapa vazio\"]\n```";
    return emptyDiagram;
  }

  const lines: string[] = [];

  // Direction: top-down (TD) is good for hierarchical mind maps
  lines.push("graph TD");

  // Title as a comment
  if (mapTitle) {
    lines.push(`  %% ${mapTitle}`);
  }

  // Build sanitized ID mapping
  const idMap = new Map<string, string>();
  for (const node of nodes) {
    const sid = sanitizeId(node.id);
    idMap.set(node.id, sid);
  }

  // Declare each node: N<id>["<escapedTitle>"]
  // We group nodes by kind for visual clarity in comments
  for (const node of nodes) {
    const sid = idMap.get(node.id)!;
    const escapedTitle = escapeMermaidTitle(node.title);
    const kindMeta = NODE_KIND_META[node.kind];
    const kindLabel = kindMeta?.label ?? node.kind;
    lines.push(`  %% ${kindLabel}`);
    lines.push(`  N${sid}["${escapedTitle}"]`);
  }

  // Create edges: N<sourceId> -->|"label"| N<targetId>
  // Use edge kind label when no custom label exists
  for (const edge of edges) {
    const sourceSid = idMap.get(edge.sourceId);
    const targetSid = idMap.get(edge.targetId);
    if (!sourceSid || !targetSid) continue;

    const label = edge.label ?? EDGE_KIND_META[edge.kind]?.label ?? "";
    if (label) {
      lines.push(`  N${sourceSid} -->|"${escapeMermaidTitle(label)}"| N${targetSid}`);
    } else {
      lines.push(`  N${sourceSid} --> N${targetSid}`);
    }
  }

  // Add style classes per node kind
  // Mermaid classDef syntax: classDef <name> fill:<color>,stroke:<color>,color:<textColor>
  lines.push("");
  lines.push("  %% Style classes per node kind");
  lines.push("  classDef concept fill:#10b981,stroke:#059669,color:#fff");
  lines.push("  classDef question fill:#f59e0b,stroke:#d97706,color:#fff");
  lines.push("  classDef action fill:#f43f5e,stroke:#e11d48,color:#fff");
  lines.push("  classDef idea fill:#8b5cf6,stroke:#7c3aed,color:#fff");
  lines.push("  classDef resource fill:#14b8a6,stroke:#0d9488,color:#fff");
  lines.push("  classDef goal fill:#ec4899,stroke:#db2777,color:#fff");

  // Assign classes to nodes
  for (const node of nodes) {
    const sid = idMap.get(node.id)!;
    lines.push(`  class N${sid} ${node.kind}`);
  }

  // Wrap in code block
  return "```mermaid\n" + lines.join("\n") + "\n```";
}

/**
 * Generate just the raw Mermaid diagram content (without the code block wrapper).
 * Useful for downloading as a .md file where we add the wrapper ourselves.
 */
export function generateMermaidRaw(
  nodes: MapNode[],
  edges: MapEdge[],
  mapTitle?: string
): string {
  const wrapped = generateMermaid(nodes, edges, mapTitle);
  // Strip the ```mermaid and ``` wrapper
  return wrapped
    .replace(/^```mermaid\n/, "")
    .replace(/\n```$/, "");
}
