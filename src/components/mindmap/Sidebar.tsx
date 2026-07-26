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

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* backdrop */}
      <div className="flex-1 bg-black/20" onClick={onClose} />
      {/* panel */}
      <div className="w-[280px] bg-card border-l border-border flex flex-col shadow-xl fade-in">
        {/* header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4" />
            Mapas
          </h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {/* search + new */}
        <div className="flex items-center gap-1.5 px-3 py-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="h-7 pl-7 text-xs"
            />
          </div>
          <Button size="icon" className="h-7 w-7" onClick={handleNewMap} title="Novo mapa">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {/* list */}
        <ScrollArea className="flex-1 px-2">
          {loading && <p className="text-xs text-muted-foreground p-3">Carregando...</p>}
          {filtered.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground p-3">Nenhum mapa encontrado.</p>
          )}
          <div className="flex flex-col gap-1 py-1">
            {filtered.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors ${
                  m.id === mapId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => handleOpenMap(m.id)}
              >
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.nodeCount} nós · {new Date(m.updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {m.starred && <Star className="h-3 w-3 fill-primary text-primary" />}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMap(m.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
