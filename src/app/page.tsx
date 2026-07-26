"use client";

import { useState, useEffect, useCallback } from "react";
import { MindMapCanvas } from "@/components/mindmap/MindMapCanvas";
import { Toolbar } from "@/components/mindmap/Toolbar";
import { Sidebar } from "@/components/mindmap/Sidebar";
import { NodeEditor } from "@/components/mindmap/NodeEditor";
import { AIPanel } from "@/components/mindmap/AIPanel";
import { SettingsPanel } from "@/components/mindmap/SettingsPanel";
import { Minimap } from "@/components/mindmap/Minimap";
import { StatusBar } from "@/components/mindmap/StatusBar";
import { ThemeManager } from "@/components/mindmap/ThemeManager";
import { useAutosave } from "@/hooks/use-autosave";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { BrainCircuit, Loader2 } from "lucide-react";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);

  const mapId = useMindMapStore((s) => s.mapId);
  const loadMap = useMindMapStore((s) => s.loadMap);
  const nodes = useMindMapStore((s) => s.nodes);
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);

  const minimapEnabled = useSettingsStore((s) => s.settings.visual.minimap);

  // Initialize: load or create a map on first visit
  useEffect(() => {
    async function init() {
      try {
        // Check if any maps exist
        const listRes = await fetch("/api/maps");
        const listData = await listRes.json();
        const existingMaps = listData.maps ?? [];

        if (existingMaps.length > 0) {
          // Load the most recent map
          const firstId = existingMaps[0].id;
          const mapRes = await fetch(`/api/maps/${firstId}`);
          const mapData = await mapRes.json();
          loadMap(mapData.map);
        } else {
          // Create a new map
          const createRes = await fetch("/api/maps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Meu Primeiro Mapa Mental" }),
          });
          const createData = await createRes.json();
          const mapRes = await fetch(`/api/maps/${createData.map.id}`);
          const mapData = await mapRes.json();
          loadMap(mapData.map);
        }
      } catch (e) {
        console.error("Failed to initialize map:", e);
      }
      setLoadingMap(false);
    }
    init();
  }, [loadMap]);

  // Node editor opens when a node is selected via click in the canvas
  // No effect needed — selection triggers onOpenNodeEditor from MindMapCanvas

  // Autosave hook
  useAutosave();

  const handleOpenNodeEditor = useCallback(() => setNodeEditorOpen(true), []);
  const handleOpenAIPanel = useCallback(() => setAiPanelOpen(true), []);
  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);

  if (loadingMap) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <BrainCircuit className="h-12 w-12 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Carregando mapa mental...</p>
        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Theme manager — no visual output */}
      <ThemeManager />

      {/* Toolbar */}
      <Toolbar
        onOpenSettings={handleOpenSettings}
        onOpenAIPanel={handleOpenAIPanel}
        onOpenSidebar={handleOpenSidebar}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas */}
        <MindMapCanvas
          onOpenNodeEditor={handleOpenNodeEditor}
          onOpenAIPanel={handleOpenAIPanel}
        />

        {/* Minimap overlay */}
        {minimapEnabled && nodes.length > 0 && <Minimap />}

        {/* Side panels */}
        {nodeEditorOpen && (
          <NodeEditor open={nodeEditorOpen} onClose={() => setNodeEditorOpen(false)} />
        )}
        {aiPanelOpen && (
          <AIPanel open={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
        )}
        {settingsOpen && (
          <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        )}
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Sidebar (overlay) */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Footer */}
      <footer className="mt-auto border-t border-border px-4 py-2 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="brand-gradient font-semibold">Mapa Mental Complexo com IA</span>
          <span>Powered by Z.ai · Next.js 16 · TypeScript</span>
        </div>
      </footer>
    </div>
  );
}
