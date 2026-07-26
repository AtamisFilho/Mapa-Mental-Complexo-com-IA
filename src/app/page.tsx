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
import { ShortcutsPanel } from "@/components/mindmap/ShortcutsPanel";
import { ExportPanel } from "@/components/mindmap/ExportPanel";
import { CommandPalette } from "@/components/mindmap/CommandPalette";
import { FloatingToolbar } from "@/components/mindmap/FloatingToolbar";
import { OnboardingTour, replayTour } from "@/components/mindmap/OnboardingTour";
import { useAutosave } from "@/hooks/use-autosave";
import { ToolProvider } from "@/hooks/use-tool-context";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { BrainCircuit, Loader2 } from "lucide-react";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  const [tourForceShow, setTourForceShow] = useState(false);

  const mapId = useMindMapStore((s) => s.mapId);
  const loadMap = useMindMapStore((s) => s.loadMap);
  const nodes = useMindMapStore((s) => s.nodes);
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const fitToView = useMindMapStore((s) => s.fitToView);

  const minimapEnabled = useSettingsStore((s) => s.settings.visual.minimap);

  // Initialize: load or create a map on first visit
  useEffect(() => {
    async function init() {
      try {
        const listRes = await fetch("/api/maps");
        const listData = await listRes.json();
        const existingMaps = listData.maps ?? [];

        if (existingMaps.length > 0) {
          const firstId = existingMaps[0].id;
          const mapRes = await fetch(`/api/maps/${firstId}`);
          const mapData = await mapRes.json();
          loadMap(mapData.map);
        } else {
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

  // After the map loads, fit it to view (after a short delay to let layout settle)
  useEffect(() => {
    if (!loadingMap && nodes.length > 0) {
      const t = setTimeout(() => fitToView(80), 80);
      return () => clearTimeout(t);
    }
  }, [loadingMap, nodes.length, fitToView]);

  // Global Ctrl+K to toggle command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Autosave hook
  useAutosave();

  const handleOpenNodeEditor = useCallback(() => setNodeEditorOpen(true), []);
  const handleOpenAIPanel = useCallback(() => setAiPanelOpen(true), []);
  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleOpenShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const handleOpenExport = useCallback(() => setExportOpen(true), []);
  const handleReplayTour = useCallback(() => {
    replayTour();
    setTourForceShow(true);
    // Reset after a tick so it can be re-triggered later
    setTimeout(() => setTourForceShow(false), 100);
  }, []);

  if (loadingMap) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="flex flex-col items-center gap-3">
          <BrainCircuit className="h-14 w-14 text-primary animate-pulse" />
          <p className="text-lg font-semibold brand-gradient">Mapa Mental Complexo com IA</p>
          <p className="text-sm text-muted-foreground">Carregando mapa mental...</p>
          <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <ToolProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Theme manager */}
        <ThemeManager />

        {/* Toolbar */}
        <Toolbar
          onOpenSettings={handleOpenSettings}
          onOpenAIPanel={handleOpenAIPanel}
          onOpenSidebar={handleOpenSidebar}
          onOpenShortcuts={handleOpenShortcuts}
          onOpenExport={handleOpenExport}
          onOpenSearch={() => setCommandPaletteOpen(true)}
          onOpenNodeEditor={handleOpenNodeEditor}
        />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Canvas */}
          <MindMapCanvas
            onOpenNodeEditor={handleOpenNodeEditor}
            onOpenAIPanel={handleOpenAIPanel}
          />

          {/* Floating toolbar for selected node */}
          <FloatingToolbar onOpenNodeEditor={handleOpenNodeEditor} />

          {/* Minimap overlay */}
          {minimapEnabled && nodes.length > 0 && <Minimap />}

          {/* Side panels */}
          {nodeEditorOpen && selectedNodeIds.length > 0 && (
            <NodeEditor open={nodeEditorOpen} onClose={() => setNodeEditorOpen(false)} />
          )}
          {aiPanelOpen && (
            <AIPanel open={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
          )}
          {settingsOpen && (
            <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} onReplayTour={handleReplayTour} />
          )}
          {exportOpen && (
            <ExportPanel open={exportOpen} onClose={() => setExportOpen(false)} />
          )}
        </div>

        {/* Status bar */}
        <StatusBar />

        {/* Sidebar (overlay) */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Shortcuts overlay */}
        <ShortcutsPanel open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        {/* Command palette (Ctrl+K) */}
        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onOpenAIPanel={handleOpenAIPanel}
          onOpenNodeEditor={handleOpenNodeEditor}
        />

        {/* Onboarding tour */}
        <OnboardingTour forceShow={tourForceShow} />

        {/* Footer */}
        <footer className="mt-auto border-t border-border px-4 py-2 bg-card/90 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-muted-foreground gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="brand-gradient font-semibold shrink-0">Mapa Mental Complexo com IA</span>
              <span className="hidden sm:inline shrink-0">·</span>
              <button
                className="hidden sm:flex items-center gap-1 hover:text-primary transition-colors cursor-pointer shrink-0"
                onClick={() => setCommandPaletteOpen(true)}
                title="Abrir busca (Ctrl+K)"
              >
                <kbd className="text-[10px] bg-muted px-1 py-0.5 rounded border border-border">Ctrl+K</kbd>
                <span>buscar</span>
              </button>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                className="hover:text-primary transition-colors cursor-pointer"
                onClick={handleOpenExport}
                title="Exportar"
              >
                Exportar
              </button>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Powered by Z.ai</span>
            </div>
          </div>
        </footer>
      </div>
    </ToolProvider>
  );
}
