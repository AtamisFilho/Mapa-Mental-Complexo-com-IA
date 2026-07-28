"use client";

import { X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settings-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsPanel({ open, onClose }: Props) {
  const shortcutsEnabled = useSettingsStore((s) => s.settings.editor.keyboardShortcuts);
  if (!open || !shortcutsEnabled) return null;

  const shortcuts = [
    { keys: "Ctrl + K", action: "Abrir busca / comandos", category: "Geral" },
    { keys: "Ctrl + Shift + S", action: "Estatísticas do mapa", category: "Geral" },
    { keys: "Ctrl + G", action: "Próximo resultado da busca", category: "Geral" },
    { keys: "Ctrl + Shift + G", action: "Resultado anterior da busca", category: "Geral" },
    { keys: "Ctrl + J", action: "Alternar tema (escuro/claro/sistema)", category: "Geral" },
    { keys: "Ctrl + B", action: "Adicionar/remover dos favoritos", category: "Geral" },
    { keys: "Ctrl + A", action: "Selecionar todos os nós", category: "Edição" },
    { keys: "Ctrl + Z", action: "Desfazer", category: "Edição" },
    { keys: "Ctrl + Y", action: "Refazer", category: "Edição" },
    { keys: "Ctrl + Shift + Z", action: "Refazer (alternativo)", category: "Edição" },
    { keys: "Ctrl + D", action: "Duplicar nó selecionado", category: "Edição" },
    { keys: "Ctrl + C", action: "Copiar nó(s) selecionado(s)", category: "Edição" },
    { keys: "Ctrl + V", action: "Colar nós copiados no centro da tela", category: "Edição" },
    { keys: "L", action: "Alternar ferramenta Conectar", category: "Edição" },
    { keys: "↑ ↓ ← →", action: "Navegar pela árvore (pai/filho/irmãos)", category: "Edição" },
    { keys: "Delete / Backspace", action: "Excluir nó selecionado", category: "Edição" },
    { keys: "Esc", action: "Cancelar seleção / conexão", category: "Geral" },
    { keys: "F", action: "Ajustar mapa à tela (fit)", category: "Visualização" },
    { keys: "Z", action: "Zoom à seleção (fit selection)", category: "Visualização" },
    { keys: "M", action: "Modo foco (escurece nós não relacionados)", category: "Visualização" },
    { keys: "T", action: "Alterar tipo da conexão selecionada", category: "Edição" },
    { keys: "Shift + L", action: "Abrir painel de organização visual (layouts)", category: "Visualização" },
    { keys: "C", action: "Adicionar Conceito", category: "Adicionar" },
    { keys: "P", action: "Adicionar Pergunta", category: "Adicionar" },
    { keys: "A", action: "Adicionar Ação", category: "Adicionar" },
    { keys: "I", action: "Adicionar Ideia", category: "Adicionar" },
    { keys: "R", action: "Adicionar Recurso", category: "Adicionar" },
    { keys: "O", action: "Adicionar Objetivo", category: "Adicionar" },
    { keys: "E / Enter", action: "Editar nó selecionado", category: "Edição" },
    { keys: "Clique duplo (canvas)", action: "Adicionar novo nó", category: "Mouse" },
    { keys: "Clique duplo (nó)", action: "Abrir editor do nó", category: "Mouse" },
    { keys: "Clique duplo (aresta)", action: "Excluir aresta", category: "Mouse" },
    { keys: "Arrastar (bg, tool Pan)", action: "Mover canvas (pan)", category: "Mouse" },
    { keys: "Arrastar (nó)", action: "Mover nó", category: "Mouse" },
    { keys: "Arrastar (bg, tool Select)", action: "Seleção por caixa", category: "Mouse" },
    { keys: "Shift + Clique", action: "Multi-seleção de nós", category: "Mouse" },
    { keys: "Scroll", action: "Zoom in/out (no cursor)", category: "Visualização" },
  ];

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm fade-in p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto scroll-thin bg-card rounded-xl border border-border shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            Atalhos de teclado
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 px-2">{cat}</p>
              <div className="flex flex-col gap-0.5">
                {shortcuts.filter((s) => s.category === cat).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/30 transition-colors">
                    <span className="text-xs text-muted-foreground">{s.action}</span>
                    <kbd className="px-2 py-0.5 rounded bg-muted text-[11px] font-mono text-foreground border border-border">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-4 pt-3 border-t border-border">
          Os atalhos podem ser desativados em Configurações → Editor → Atalhos de teclado.
        </p>
      </div>
    </div>
  );
}
