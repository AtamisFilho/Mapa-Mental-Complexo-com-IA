"use client";

import { useEffect, useRef } from "react";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";

export function useAutosave() {
  const dirty = useMindMapStore((s) => s.dirty);
  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const mapId = useMindMapStore((s) => s.mapId);
  const title = useMindMapStore((s) => s.title);
  const description = useMindMapStore((s) => s.description);
  const markSaved = useMindMapStore((s) => s.markSaved);
  const setSaving = useMindMapStore((s) => s.setSaving);

  const autosave = useSettingsStore((s) => s.settings.editor.autosave);
  const delay = useSettingsStore((s) => s.settings.editor.autosaveDelayMs);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!autosave || !dirty || !mapId) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch(`/api/maps/${mapId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            nodes,
            edges,
          }),
        });
        if (res.ok) {
          markSaved();
        }
      } catch {
        /* silent — will retry on next dirty change */
      } finally {
        // Always clear the saving flag — previously a fetch failure or
        // non-OK response left the status bar stuck on "Saving…" forever.
        setSaving(false);
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autosave, dirty, mapId, title, description, nodes, edges, delay, markSaved, setSaving]);
}
