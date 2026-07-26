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
import { ToastContainer } from "@/components/mindmap/ToastContainer";
import { ShortcutsPanel } from "@/components/mindmap/ShortcutsPanel";
import { ExportPanel } from "@/components/mindmap/ExportPanel";
import { CommandPalette } from "@/components/mindmap/CommandPalette";
import { FloatingToolbar } from "@/components/mindmap/FloatingToolbar";
import { OnboardingTour, replayTour } from "@/components/mindmap/OnboardingTour";
import { useAutosave } from "@/hooks/use-autosave";
import { ToolProvider, useTool } from "@/hooks/use-tool-context";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { BrainCircuit, Loader2 } from "lucide-react";

/** Wrapper component inside ToolProvider that can use useTool */
function FloatingToolbarWithCallbacks({ onOpenNodeEditor, onExpand }: { onOpenNodeEditor: () => void; onExpand: () => void }) {
  const { setConnectingFrom, setTool } = useTool();
  const handleConnectFrom = useCallback(() => {
    setTool("connect");
    setConnectingFrom(useMindMapStore.getState().selectedNodeIds[0] ?? null);
  }, [setTool, setConnectingFrom]);
  return (
    <FloatingToolbar
      onOpenNodeEditor={onOpenNodeEditor}
      onExpand={onExpand}
      onConnectFrom={handleConnectFrom}
    />
  );
}

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

  const handleOpenNodeEditor = useCallback(() => {
    setNodeEditorOpen(true);
    setAiPanelOpen(false);
    setSettingsOpen(false);
    setExportOpen(false);
  }, []);
  const handleOpenAIPanel = useCallback(() => {
    setAiPanelOpen(true);
    setNodeEditorOpen(false);
    setSettingsOpen(false);
    setExportOpen(false);
  }, []);
  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
    setNodeEditorOpen(false);
    setAiPanelOpen(false);
    setExportOpen(false);
  }, []);
  const handleOpenShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const handleOpenExport = useCallback(() => {
    setExportOpen(true);
    setNodeEditorOpen(false);
    setAiPanelOpen(false);
    setSettingsOpen(false);
  }, []);
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

        {/* Toast notifications */}
        <ToastContainer />

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
          <FloatingToolbarWithCallbacks onOpenNodeEditor={handleOpenNodeEditor} onExpand={handleOpenAIPanel} />

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
        <footer className="mt-auto border-t border-border/40 px-4 py-2.5 backdrop-blur-md"
          style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--card) 85%, var(--muted)) 0%, var(--card) 50%, color-mix(in srgb, var(--card) 85%, var(--muted)) 100%)",
        }}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="brand-gradient font-semibold shrink-0 text-sm">Mapa Mental Complexo com IA</span>
              <span className="hidden sm:inline shrink-0 text-muted-foreground/40">·</span>
              <button
                className="hidden sm:flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer shrink-0 px-2 py-1 rounded-md hover:bg-accent/40"
                onClick={() => setCommandPaletteOpen(true)}
                title="Abrir busca (Ctrl+K)"
              >
                <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded border border-border/60 font-mono">Ctrl+K</kbd>
                <span className="font-medium">Buscar</span>
              </button>
              <span className="hidden md:inline shrink-0 text-muted-foreground/40">·</span>
              <button
                className="hidden md:flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer shrink-0 px-2 py-1 rounded-md hover:bg-accent/40"
                onClick={handleOpenShortcuts}
                title="Atalhos de teclado"
              >
                <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded border border-border/60 font-mono">?</kbd>
                <span className="font-medium">Atalhos</span>
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-accent/40 font-medium"
                onClick={handleOpenExport}
                title="Exportar"
              >
                Exportar
              </button>
              <span className="hidden sm:inline text-muted-foreground/40">·</span>
              <span className="hidden sm:inline text-muted-foreground/70 font-medium">Powered by Z.ai</span>
            </div>
          </div>
        </footer>
      </div>
    </ToolProvider>
  );
}
