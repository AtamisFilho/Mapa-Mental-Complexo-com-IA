"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Plus,
  Trash2,
  Star,
  FolderOpen,
  X,
  Search,
  MapPin,
  Edit3,
  Check,
  LayoutTemplate,
  RefreshCw,
  Copy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useMindMapStore } from "@/store/mindmap-store";
import { MINDMAP_TEMPLATES, type MindMapTemplate } from "@/lib/templates";
import type { MindMapSummary } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type View = "maps" | "templates";

export function Sidebar({ open, onClose }: Props) {
  const [maps, setMaps] = useState<MindMapSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("maps");
  // Filter toggle: when true, only starred maps are shown in the list.
  const [starredOnly, setStarredOnly] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingFromTemplate, setCreatingFromTemplate] = useState<string | null>(null);
  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");

  const mapId = useMindMapStore((s) => s.mapId);
  const loadMap = useMindMapStore((s) => s.loadMap);

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/maps");
      if (!res.ok) return;
      const data = await res.json();
      setMaps(data.maps ?? []);
    } catch {
      /* silent */
    }
    setLoading(false);
  }, []);

  // Fetch maps on first render of sidebar (moved out of render body —
  // calling setState during render is a React anti-pattern that can cause
  // confusing re-render loops).
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  useEffect(() => {
    if (open && !initialFetchDone) {
      setInitialFetchDone(true);
      fetchMaps();
    }
  }, [open, initialFetchDone, fetchMaps]);

  const handleNewMap = useCallback(async () => {
    try {
      const res = await fetch("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Novo Mapa Mental" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      // Load the new map
      const fullRes = await fetch(`/api/maps/${data.map.id}`);
      if (!fullRes.ok) return;
      const fullData = await fullRes.json();
      loadMap(fullData.map);
      fetchMaps();
      onClose();
    } catch {
      /* silent */
    }
  }, [loadMap, fetchMaps, onClose]);

  const handleCreateFromTemplate = useCallback(
    async (template: MindMapTemplate) => {
      setCreatingFromTemplate(template.id);
      try {
        const res = await fetch("/api/maps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: template.title,
            description: template.description,
            nodes: template.nodes,
            edges: template.edges,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const fullRes = await fetch(`/api/maps/${data.map.id}`);
        if (!fullRes.ok) return;
        const fullData = await fullRes.json();
        loadMap(fullData.map);
        fetchMaps();
        onClose();
      } catch {
        /* silent */
      }
      setCreatingFromTemplate(null);
    },
    [loadMap, fetchMaps, onClose]
  );

  const handleOpenMap = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/maps/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        loadMap(data.map);
        onClose();
      } catch {
        /* silent */
      }
    },
    [loadMap, onClose]
  );

  // When user clicks delete button → show confirmation dialog
  const handleRequestDelete = useCallback((id: string, title: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmTitle(title);
  }, []);

  // When user confirms in AlertDialog → actually delete
  const handleConfirmDelete = useCallback(async () => {
    const id = deleteConfirmId;
    if (!id) return;
    setDeleteConfirmId(null);
    try {
      await fetch(`/api/maps/${id}`, { method: "DELETE" });
      fetchMaps();
      if (mapId === id) {
        handleNewMap();
      }
    } catch {
      /* silent */
    }
  }, [deleteConfirmId, fetchMaps, mapId, handleNewMap]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
    setDeleteConfirmTitle("");
  }, []);

  // Duplicate (clone) a map via POST /api/maps/[id]/duplicate. Shows a
  // spinner on the clicked card, then refreshes the list. The clone gets a
  // "(cópia)" suffix automatically.
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const handleDuplicate = useCallback(async (id: string) => {
    setDuplicatingId(id);
    try {
      const res = await fetch(`/api/maps/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        await fetchMaps();
      }
    } catch {
      /* silent */
    }
    setDuplicatingId(null);
  }, [fetchMaps]);

  const handleStartRename = useCallback((id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
  }, []);

  const handleCommitRename = useCallback(async () => {
    if (!renamingId) return;
    const newTitle = renameValue.trim();
    if (!newTitle) {
      setRenamingId(null);
      return;
    }
    try {
      // Use the metadata-only PATCH endpoint instead of the destructive
      // PUT. The previous flow fetched the whole map and PUT it back with
      // all nodes/edges, which deleteMany+create'd every record — wiping
      // createdAt timestamps and losing concurrent edits.
      const res = await fetch(`/api/maps/${renamingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok && renamingId === mapId) {
        useMindMapStore.getState().setMeta(newTitle, useMindMapStore.getState().description);
      }
      fetchMaps();
    } catch {
      /* silent */
    }
    setRenamingId(null);
  }, [renamingId, renameValue, mapId, fetchMaps]);

  const filtered = maps.filter(
    (m) =>
      // Starred filter: when enabled, only show starred maps
      (!starredOnly || m.starred) &&
      (m.title.toLowerCase().includes(search.toLowerCase()) ||
        (m.description?.toLowerCase().includes(search.toLowerCase()) ?? false))
  );

  if (!open) return null;

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `${min}min atrás`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h atrás`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d atrás`;
    return new Date(iso).toLocaleDateString("pt-BR");
  };

  return (
    <>
      {/* Delete confirmation AlertDialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(v) => !v && handleCancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mapa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deleteConfirmTitle}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed inset-0 z-40 flex">
        {/* backdrop */}
        <div className="flex-1 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
        {/* panel */}
        <div className="w-[340px] bg-card border-l border-border flex flex-col shadow-2xl fade-in">
          {/* header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-gradient-to-r from-primary/15 via-primary/5 to-transparent">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <FolderOpen className="h-4 w-4 text-primary" />
              Meus Mapas
            </h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* tabs */}
          <div className="flex p-2 gap-1 border-b border-border bg-muted/20">
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-all ${
                view === "maps"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              onClick={() => setView("maps")}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Mapas ({maps.length})
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-all ${
                view === "templates"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              onClick={() => setView("templates")}
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Templates
            </button>
          </div>

          {/* MAPS VIEW */}
          {view === "maps" && (
            <>
              {/* search + star filter + new */}
              <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border bg-muted/20">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar mapas..."
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                {/* Star filter toggle — when active, only starred maps are shown */}
                <Button
                  variant={starredOnly ? "default" : "ghost"}
                  size="icon"
                  className={`h-8 w-8 shrink-0 ${starredOnly ? "text-amber-500" : ""}`}
                  onClick={() => setStarredOnly((v) => !v)}
                  title={starredOnly ? "Mostrar todos os mapas" : "Mostrar apenas favoritos"}
                  aria-pressed={starredOnly}
                >
                  <Star className={`h-4 w-4 ${starredOnly ? "fill-amber-500" : ""}`} />
                </Button>
                <Button size="icon" className="h-8 w-8" onClick={handleNewMap} title="Novo mapa vazio">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {/* Starred filter indicator */}
              {starredOnly && (
                <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-500" />
                  Mostrando apenas favoritos · {filtered.length} de {maps.length}
                </div>
              )}
              {/* list */}
              <ScrollArea className="flex-1 px-2">
                {loading && (
                  <div className="p-6 text-center">
                    <div className="inline-block h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground mt-2">Carregando...</p>
                  </div>
                )}
                {!loading && filtered.length === 0 && (
                  <div className="p-6 text-center">
                    <FolderOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {search ? `Nenhum mapa para "${search}"` : "Nenhum mapa ainda. Crie o primeiro!"}
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-1 py-1">
                  {filtered.map((m) => {
                    const isActive = m.id === mapId;
                    const isRenaming = renamingId === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                          isActive
                            ? "bg-accent border-primary/40 shadow-sm"
                            : "border-transparent hover:bg-accent/50 hover:border-border"
                        }`}
                        onClick={() => !isRenaming && handleOpenMap(m.id)}
                      >
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${isActive ? "bg-primary/15" : "bg-muted"}`}>
                          {m.starred ? (
                            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                          ) : (
                            <MapPin className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {isRenaming ? (
                            <Input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCommitRename();
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-6 text-xs px-1.5 py-0"
                            />
                          ) : (
                            <p className={`text-sm font-medium truncate ${isActive ? "text-foreground" : ""}`}>{m.title}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span>{m.nodeCount} nós</span>
                            <span>·</span>
                            <span>{relativeTime(m.updatedAt)}</span>
                          </p>
                        </div>
                        {isRenaming ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCommitRename();
                            }}
                            title="Confirmar renomeação"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        ) : (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRename(m.id, m.title);
                              }}
                              title="Renomear"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(m.id);
                              }}
                              title="Duplicar mapa"
                            >
                              {duplicatingId === m.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestDelete(m.id, m.title);
                              }}
                              title="Excluir"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              {/* footer count */}
              <div className="px-3 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
                {filtered.length} de {maps.length} mapa{maps.length !== 1 ? "s" : ""}
              </div>
            </>
          )}

          {/* TEMPLATES VIEW */}
          {view === "templates" && (
            <>
              <div className="px-3 py-2.5 border-b border-border bg-muted/20">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Comece com um template pronto. Você pode personalizar tudo depois.
                </p>
              </div>
              <ScrollArea className="flex-1 px-2.5 py-2">
                <div className="flex flex-col gap-2">
                  {MINDMAP_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="group rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden"
                    >
                      <div className="flex items-start gap-3 p-3">
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-xl shrink-0">
                          {tpl.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{tpl.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{tpl.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-2">
                            <span>{tpl.nodes.length} nós</span>
                            <span>·</span>
                            <span>{tpl.edges.length} conexões</span>
                          </p>
                        </div>
                      </div>
                      <button
                        className="w-full flex items-center justify-center gap-1.5 h-8 bg-muted/30 hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-colors border-t border-border"
                        disabled={creatingFromTemplate !== null}
                        onClick={() => handleCreateFromTemplate(tpl)}
                      >
                        {creatingFromTemplate === tpl.id ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            Usar template
                          </>
                        )}
                      </button>
                    </div>
                  ))}

                  {/* AI hint card */}
                  <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 mt-2">
                    <p className="text-xs text-foreground font-medium flex items-center gap-1.5">
                      <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
                      Quer um mapa sobre um tema específico?
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Use o painel de IA → <strong>Gerar mapa</strong> para criar um mapa completo sobre qualquer assunto em segundos.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    </>
  );
}
