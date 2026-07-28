"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Share2,
  Copy,
  Check,
  Link2,
  RefreshCw,
  Eye,
  Lock,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToastNotify } from "@/hooks/use-toast-notify";

interface Props {
  open: boolean;
  onClose: () => void;
  mapId: string | null;
}

/**
 * ShareDialog — manage the read-only public share link for a mind map.
 *
 * Behavior:
 *  - On open (with a mapId), fetches the current shareId via
 *    `GET /api/maps/[id]/share`.
 *  - Toggle (Switch) to enable/disable sharing:
 *      enable  → POST { enabled: true } (generates a shareId if missing)
 *      disable → POST { enabled: false } (clears shareId, revokes access)
 *  - When enabled: shows the share URL in a read-only Input with a Copy button.
 *  - "Regenerar link" button calls POST { rotate: true } after an AlertDialog
 *    confirmation (the old URL becomes invalid).
 *
 * The share URL format is `${window.location.origin}/?share=${shareId}` —
 * since the app only exposes the `/` route, the share view is a query-param
 * mode handled by `page.tsx`, not a separate route.
 */
export function ShareDialog({ open, onClose, mapId }: Props) {
  const { toast } = useToastNotify();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false);

  // Build the user-facing share URL on the client (so it reflects the user's
  // actual browser origin — useful in the preview panel where host differs
  // from what the server sees).
  const shareUrl =
    shareId && typeof window !== "undefined"
      ? `${window.location.origin}/?share=${shareId}`
      : "";

  // Fetch current shareId when the dialog opens with a mapId.
  const fetchShare = useCallback(async () => {
    if (!mapId) {
      setShareId(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/maps/${mapId}/share`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setShareId(data.shareId ?? null);
    } catch (e) {
      console.error("Failed to load share info:", e);
      toast({
        title: "Erro ao carregar informações de partilha",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [mapId, toast]);

  useEffect(() => {
    if (open && mapId) {
      setCopied(false);
      void fetchShare();
    } else if (!open) {
      // Reset transient state on close so the next open starts fresh.
      setCopied(false);
      setRotateConfirmOpen(false);
    }
  }, [open, mapId, fetchShare]);

  // Enable sharing: POST { enabled: true } — generates shareId if missing.
  const handleEnable = useCallback(async () => {
    if (!mapId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/maps/${mapId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setShareId(data.shareId ?? null);
      toast({
        title: "Partilha ativada",
        description: "O link está pronto para ser copiado.",
        variant: "success",
      });
    } catch (e) {
      console.error("Failed to enable share:", e);
      toast({ title: "Erro ao ativar partilha", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }, [mapId, toast]);

  // Disable sharing: POST { enabled: false } — clears shareId (revoke).
  const handleDisable = useCallback(async () => {
    if (!mapId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/maps/${mapId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setShareId(data.shareId ?? null);
      setCopied(false);
      toast({
        title: "Partilha desativada",
        description: "O link deixou de estar acessível.",
        variant: "success",
      });
    } catch (e) {
      console.error("Failed to disable share:", e);
      toast({ title: "Erro ao desativar partilha", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }, [mapId, toast]);

  // Rotate shareId: POST { rotate: true } — invalidates old URL.
  const handleRotate = useCallback(async () => {
    if (!mapId) return;
    setRotateConfirmOpen(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/maps/${mapId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotate: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setShareId(data.shareId ?? null);
      setCopied(false);
      toast({
        title: "Link regenerado",
        description: "O link anterior deixou de funcionar.",
        variant: "success",
      });
    } catch (e) {
      console.error("Failed to rotate share:", e);
      toast({ title: "Erro ao regenerar link", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }, [mapId, toast]);

  // Copy the share URL to the clipboard.
  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copiado",
        description: "Pode colar onde quiser partilhar.",
        variant: "success",
      });
      // Reset the copied indicator after 2s
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Clipboard write failed:", e);
      toast({
        title: "Não foi possível copiar",
        description: "Copie o link manualmente.",
        variant: "error",
      });
    }
  }, [shareUrl, toast]);

  const enabled = shareId !== null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Share2 className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <DialogTitle>Partilhar mapa</DialogTitle>
                <DialogDescription>
                  Crie um link público para ver o mapa em modo de leitura.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Enable / disable toggle */}
              <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {enabled ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    {enabled ? "Partilha ativa" : "Partilha desativada"}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {enabled
                      ? "Qualquer pessoa com o link pode ver o mapa."
                      : "Ative a partilha para gerar um link público."}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  disabled={submitting}
                  onCheckedChange={(checked) => {
                    if (checked) void handleEnable();
                    else void handleDisable();
                  }}
                  aria-label="Ativar partilha"
                />
              </div>

              {/* Share URL display */}
              {enabled && shareUrl && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    Link de partilha
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={shareUrl}
                      className="text-xs font-mono h-9 select-all"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={copied ? "default" : "outline"}
                      className="h-9 shrink-0 gap-1.5"
                      onClick={handleCopy}
                      disabled={submitting}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied ? "Copiado" : "Copiar"}
                    </Button>
                  </div>

                  {/* Read-only note */}
                  <p className="text-[11px] text-muted-foreground/80 leading-snug flex items-start gap-1.5">
                    <Eye className="h-3 w-3 mt-0.5 shrink-0" />
                    Qualquer pessoa com este link pode ver o mapa (apenas
                    leitura).
                  </p>

                  {/* Rotate button */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="self-start h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setRotateConfirmOpen(true)}
                    disabled={submitting}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerar link
                  </Button>
                </div>
              )}

              {!enabled && (
                <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
                  <Lock className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground/70" />
                  <p className="text-xs text-muted-foreground">
                    Este mapa é privado. Ative a partilha para gerar um link
                    público.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate confirmation */}
      <AlertDialog
        open={rotateConfirmOpen}
        onOpenChange={setRotateConfirmOpen}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar link de partilha?</AlertDialogTitle>
            <AlertDialogDescription>
              O link atual deixará de funcionar e será criado um novo. Qualquer
              pessoa que tenha o link antigo perderá o acesso ao mapa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleRotate()}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
