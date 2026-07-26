"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Star,
  FolderOpen,
  X,
  Search,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMindMapStore } from "@/store/mindmap-store";
import type { MindMapData, MindMapSummary } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const [maps, setMaps] = useState<MindMapSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
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

  // Fetch maps on first render of sidebar
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  if (open && !initialFetchDone) {
    setInitialFetchDone(true);
    fetchMaps();
  }

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

  const handleDeleteMap = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/maps/${id}`, { method: "DELETE" });
        fetchMaps();
        if (mapId === id) {
          // Current map was deleted — create a new one
          handleNewMap();
        }
      } catch {
        /* silent */
      }
    },
    [fetchMaps, mapId, handleNewMap]
  );

  const filtered = maps.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
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
    <div className="fixed inset-0 z-40 flex">
      {/* backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      {/* panel */}
      <div className="w-[300px] bg-card border-l border-border flex flex-col shadow-2xl fade-in">
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
        {/* search + new */}
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
          <Button size="icon" className="h-8 w-8" onClick={handleNewMap} title="Novo mapa">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
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
              return (
                <div
                  key={m.id}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                    isActive
                      ? "bg-accent border-primary/40 shadow-sm"
                      : "border-transparent hover:bg-accent/50 hover:border-border"
                  }`}
                  onClick={() => handleOpenMap(m.id)}
                >
                  <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${isActive ? "bg-primary/15" : "bg-muted"}`}>
                    {m.starred ? (
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    ) : (
                      <MapPin className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-foreground" : ""}`}>{m.title}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span>{m.nodeCount} nós</span>
                      <span>·</span>
                      <span>{relativeTime(m.updatedAt)}</span>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMap(m.id);
                    }}
                    title="Excluir"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        {/* footer count */}
        <div className="px-3 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
          {filtered.length} de {maps.length} mapa{maps.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
