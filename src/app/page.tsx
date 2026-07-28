"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { MindMapCanvas } from "@/components/mindmap/MindMapCanvas";
import { Toolbar } from "@/components/mindmap/Toolbar";
import { Minimap } from "@/components/mindmap/Minimap";
import { StatusBar } from "@/components/mindmap/StatusBar";
import { ThemeManager } from "@/components/mindmap/ThemeManager";
import { ToastContainer } from "@/components/mindmap/ToastContainer";
import { FloatingToolbar } from "@/components/mindmap/FloatingToolbar";
import { replayTour } from "@/components/mindmap/OnboardingTour";
import { useAutosave } from "@/hooks/use-autosave";
import { useCollab } from "@/hooks/use-collab";
import { ToolProvider, useTool } from "@/hooks/use-tool-context";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { BrainCircuit, Loader2, Search, LayoutTemplate, Eye, LogOut } from "lucide-react";

// ── Code-splitting: heavy panels are lazy-loaded with ssr:false to keep the
//    initial bundle lean and reduce dev-server memory pressure (OOM relief).
//    These components are only ever rendered after user interaction, so deferring
//    them until first open is a pure win.
const Sidebar = dynamic(() => import("@/components/mindmap/Sidebar").then(m => ({ default: m.Sidebar })), { ssr: false });
const NodeEditor = dynamic(() => import("@/components/mindmap/NodeEditor").then(m => ({ default: m.NodeEditor })), { ssr: false, loading: () => <PanelSkeleton /> });
const AIPanel = dynamic(() => import("@/components/mindmap/AIPanel").then(m => ({ default: m.AIPanel })), { ssr: false, loading: () => <PanelSkeleton /> });
const SettingsPanel = dynamic(() => import("@/components/mindmap/SettingsPanel").then(m => ({ default: m.SettingsPanel })), { ssr: false, loading: () => <PanelSkeleton /> });
const ShortcutsPanel = dynamic(() => import("@/components/mindmap/ShortcutsPanel").then(m => ({ default: m.ShortcutsPanel })), { ssr: false });
const ExportPanel = dynamic(() => import("@/components/mindmap/ExportPanel").then(m => ({ default: m.ExportPanel })), { ssr: false, loading: () => <PanelSkeleton /> });
const CommandPalette = dynamic(() => import("@/components/mindmap/CommandPalette").then(m => ({ default: m.CommandPalette })), { ssr: false });
const OnboardingTour = dynamic(() => import("@/components/mindmap/OnboardingTour").then(m => ({ default: m.OnboardingTour })), { ssr: false });
const SearchPanel = dynamic(() => import("@/components/mindmap/SearchPanel").then(m => ({ default: m.SearchPanel })), { ssr: false });
const TemplatesPanel = dynamic(() => import("@/components/mindmap/TemplatesPanel").then(m => ({ default: m.TemplatesPanel })), { ssr: false, loading: () => <PanelSkeleton /> });
const ShareDialog = dynamic(() => import("@/components/mindmap/ShareDialog").then(m => ({ default: m.ShareDialog })), { ssr: false });
const RemoteCursors = dynamic(() => import("@/components/mindmap/RemoteCursors").then(m => ({ default: m.RemoteCursors })), { ssr: false });
const LayoutPanel = dynamic(() => import("@/components/mindmap/LayoutPanel").then(m => ({ default: m.LayoutPanel })), { ssr: false });

/** Lightweight skeleton shown while a lazy panel chunk is loading. */
function PanelSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6" aria-busy="true">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKey, setSearchKey] = useState(0);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  const [tourForceShow, setTourForceShow] = useState(false);
  // LayoutPanel open state — also toggled by Shift+L keyboard shortcut.
  const [layoutPanelOpen, setLayoutPanelOpen] = useState(false);
  // Read-only share mode (`?share=XXX` query param) — when true, hides all
  // editing UI and loads the map from the public /api/share/[shareId] endpoint.
  const [readOnly, setReadOnly] = useState(false);
  // ShareDialog state (only used in editor mode, not in read-only mode).
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMapId, setShareMapId] = useState<string | null>(null);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setSearchKey((k) => k + 1);
  }, []);

  const mapId = useMindMapStore((s) => s.mapId);
  const loadMap = useMindMapStore((s) => s.loadMap);
  const nodes = useMindMapStore((s) => s.nodes);
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const fitToView = useMindMapStore((s) => s.fitToView);
  const focusNode = useMindMapStore((s) => s.focusNode);
  const selectNode = useMindMapStore((s) => s.selectNode);

  const minimapEnabled = useSettingsStore((s) => s.settings.visual.minimap);
  const collabEnabled = useSettingsStore((s) => s.settings.editor.collab);

  // Real-time collaboration (presence + remote cursors). Only active when the
  // user has enabled it in Settings AND we have a real map loaded (not in
  // read-only share mode — viewers don't broadcast).
  const { remoteCursors } = useCollab(!readOnly && collabEnabled ? mapId : null, !readOnly && collabEnabled);

  // Initialize: load or create a map on first visit.
  //
  // SPECIAL CASE: if the URL contains a `?share=XXX` query param, we load the
  // map via the PUBLIC endpoint `GET /api/share/[shareId]` and enter read-only
  // mode (no editing UI). This bypasses the normal "create or load first map"
  // flow entirely.
  useEffect(() => {
    async function init() {
      try {
        // ── Read-only share mode ──
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const shareToken = params.get("share");
          if (shareToken) {
            const res = await fetch(`/api/share/${encodeURIComponent(shareToken)}`);
            if (!res.ok) {
              console.error("Share map not found:", res.status);
              setLoadingMap(false);
              return;
            }
            const data = await res.json();
            if (data?.map) {
              loadMap(data.map);
              setReadOnly(true);
              setLoadingMap(false);
              return;
            }
          }
        }

        // ── Normal editor mode ──
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

        // ── Deep-link to a specific node (`?node=NODEID`) ──
        // After the map loads, if the URL contains a ?node= param (produced
        // by the NodeEditor "copy link to node" action), select + focus that
        // node so the user lands exactly on it.
        if (typeof window !== "undefined") {
          const nodeParams = new URLSearchParams(window.location.search);
          const nodeId = nodeParams.get("node");
          if (nodeId) {
            // Defer to the next tick so loadMap's state has settled.
            setTimeout(() => {
              selectNode(nodeId);
              focusNode(nodeId);
            }, 120);
          }
        }
      } catch (e) {
        console.error("Failed to initialize map:", e);
      }
      setLoadingMap(false);
    }
    init();
  }, [loadMap, selectNode, focusNode]);

  // After the map loads, fit it to view (after a short delay to let layout settle)
  useEffect(() => {
    if (!loadingMap && nodes.length > 0) {
      const t = setTimeout(() => fitToView(80), 80);
      return () => clearTimeout(t);
    }
  }, [loadingMap, nodes.length, fitToView]);

  // Global Ctrl+K to toggle command palette — disabled in read-only mode.
  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [readOnly]);

  // Global Ctrl+F / Cmd+F to open the search panel (Task 15-B) — disabled in read-only mode.
  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearch, readOnly]);

  // Global Shift+L to toggle the LayoutPanel (visual organization) — disabled in read-only mode.
  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      // Shift+L (no ctrl/cmd) — toggle layout panel
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "L" || e.key === "l")) {
        const target = e.target as HTMLElement | null;
        // Don't trigger when typing in inputs / textareas / contenteditable
        if (target) {
          const tag = target.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
            return;
          }
        }
        e.preventDefault();
        setLayoutPanelOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [readOnly]);

  // Handler to open the LayoutPanel (passed to Toolbar).
  const handleOpenLayout = useCallback(() => {
    setLayoutPanelOpen(true);
  }, []);

  // Autosave hook — disabled in read-only mode (no edits to save).
  useAutosave();

  // ── Share dialog handlers (editor mode only) ──
  const handleOpenShare = useCallback(() => {
    if (readOnly) return;
    setShareMapId(mapId);
    setShareOpen(true);
  }, [mapId, readOnly]);

  // ── Read-only mode: exit handler ──
  // Clears the ?share=XXX query param from the URL and reloads the page so
  // the normal editor init flow runs fresh.
  const handleExitReadOnly = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("share");
    // Use replaceState + reload so we don't add a history entry.
    window.location.replace(url.toString());
  }, []);

  const handleOpenNodeEditor = useCallback(() => {
    setNodeEditorOpen(true);
    setAiPanelOpen(false);
    setSettingsOpen(false);
    setExportOpen(false);
    setTemplatesOpen(false);
  }, []);
  const handleOpenAIPanel = useCallback(() => {
    setAiPanelOpen(true);
    setNodeEditorOpen(false);
    setSettingsOpen(false);
    setExportOpen(false);
    setTemplatesOpen(false);
  }, []);
  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
    setNodeEditorOpen(false);
    setAiPanelOpen(false);
    setExportOpen(false);
    setTemplatesOpen(false);
  }, []);
  const handleOpenShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const handleOpenExport = useCallback(() => {
    setExportOpen(true);
    setNodeEditorOpen(false);
    setAiPanelOpen(false);
    setSettingsOpen(false);
    setTemplatesOpen(false);
  }, []);
  // Templates panel — mutual exclusivity with other right-side panels (Task 15-C)
  const handleOpenTemplates = useCallback(() => {
    setTemplatesOpen(true);
    setNodeEditorOpen(false);
    setAiPanelOpen(false);
    setSettingsOpen(false);
    setExportOpen(false);
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

        {/* ── Read-only share mode banner ── */}
        {readOnly && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-primary/30 bg-primary/10 text-primary">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Eye className="h-4 w-4 shrink-0" />
              <span>Modo de visualização (apenas leitura)</span>
            </div>
            <button
              type="button"
              onClick={handleExitReadOnly}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        )}

        {/* Toolbar — hidden in read-only mode */}
        {!readOnly && (
          <Toolbar
            onOpenSettings={handleOpenSettings}
            onOpenAIPanel={handleOpenAIPanel}
            onOpenSidebar={handleOpenSidebar}
            onOpenShortcuts={handleOpenShortcuts}
            onOpenExport={handleOpenExport}
            onOpenSearch={openSearch}
            onOpenNodeEditor={handleOpenNodeEditor}
            onOpenShare={handleOpenShare}
            onOpenLayout={handleOpenLayout}
          />
        )}

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Canvas */}
          <MindMapCanvas
            onOpenNodeEditor={handleOpenNodeEditor}
            onOpenAIPanel={handleOpenAIPanel}
            readOnly={readOnly}
          />

          {/* Floating toolbar for selected node — hidden in read-only mode */}
          {!readOnly && (
            <FloatingToolbarWithCallbacks onOpenNodeEditor={handleOpenNodeEditor} onExpand={handleOpenAIPanel} />
          )}

          {/* Minimap overlay */}
          {minimapEnabled && nodes.length > 0 && <Minimap />}

          {/* Remote collaboration cursors — only when collab is enabled and there are remote users */}
          {!readOnly && collabEnabled && remoteCursors.length > 0 && (
            <RemoteCursors cursors={remoteCursors} />
          )}

          {/* Side panels — hidden in read-only mode */}
          {!readOnly && nodeEditorOpen && selectedNodeIds.length > 0 && (
            <NodeEditor open={nodeEditorOpen} onClose={() => setNodeEditorOpen(false)} />
          )}
          {!readOnly && aiPanelOpen && (
            <AIPanel open={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
          )}
          {!readOnly && settingsOpen && (
            <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} onReplayTour={handleReplayTour} />
          )}
          {!readOnly && exportOpen && (
            <ExportPanel open={exportOpen} onClose={() => setExportOpen(false)} />
          )}
          {!readOnly && templatesOpen && (
            <TemplatesPanel open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
          )}
          {!readOnly && (
            <LayoutPanel open={layoutPanelOpen} onClose={() => setLayoutPanelOpen(false)} />
          )}
        </div>

        {/* Status bar */}
        <StatusBar />

        {/* Sidebar (overlay) — hidden in read-only mode */}
        {!readOnly && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

        {/* Shortcuts overlay */}
        {!readOnly && <ShortcutsPanel open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />}

        {/* Command palette (Ctrl+K) — hidden in read-only mode */}
        {!readOnly && (
          <CommandPalette
            open={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            onOpenAIPanel={handleOpenAIPanel}
            onOpenNodeEditor={handleOpenNodeEditor}
          />
        )}

        {/* Search panel (Ctrl+F) — hidden in read-only mode */}
        {!readOnly && <SearchPanel key={searchKey} open={searchOpen} onClose={() => setSearchOpen(false)} />}

        {/* Onboarding tour — hidden in read-only mode */}
        {!readOnly && <OnboardingTour forceShow={tourForceShow} />}

        {/* Share dialog (editor mode only) */}
        {!readOnly && (
          <ShareDialog
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            mapId={shareMapId}
          />
        )}

        {/* Footer — simplified in read-only mode (no editor actions) */}
        <footer className="mt-auto border-t border-border/40 px-4 py-2.5 backdrop-blur-md"
          style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--card) 85%, var(--muted)) 0%, var(--card) 50%, color-mix(in srgb, var(--card) 85%, var(--muted)) 100%)",
        }}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="brand-gradient font-semibold shrink-0 text-sm">Mapa Mental Complexo com IA</span>
              {readOnly ? (
                <span className="text-muted-foreground/70 shrink-0">· Visualização pública</span>
              ) : (
                <>
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
                    onClick={openSearch}
                    title="Buscar nós por conteúdo (Ctrl+F)"
                  >
                    <Search className="h-3.5 w-3.5 text-primary/80" />
                    <kbd className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded border border-border/60 font-mono">Ctrl+F</kbd>
                    <span className="font-medium">Buscar nós</span>
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
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!readOnly && (
                <>
                  <button
                    className="hidden md:flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-accent/40 font-medium"
                    onClick={handleOpenTemplates}
                    title="Biblioteca de templates"
                  >
                    <LayoutTemplate className="h-3.5 w-3.5 text-primary/80" />
                    <span>Templates</span>
                  </button>
                  <span className="hidden sm:inline text-muted-foreground/40">·</span>
                  <button
                    className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-accent/40 font-medium"
                    onClick={handleOpenExport}
                    title="Exportar"
                  >
                    Exportar
                  </button>
                  <span className="hidden sm:inline text-muted-foreground/40">·</span>
                </>
              )}
              <span className="hidden sm:inline text-muted-foreground/70 font-medium">Powered by Z.ai</span>
            </div>
          </div>
        </footer>
      </div>
    </ToolProvider>
  );
}
