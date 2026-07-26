"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "mindmap-tour-completed";

interface TourStep {
  title: string;
  description: string;
  targetSelector?: string | null;
  position: "center" | "top" | "right" | "bottom" | "left";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo!",
    description: "Este é seu canvas de mapa mental. Aqui você pode organizar ideias, planejar projetos e explorar conexões entre conceitos de forma visual e interativa.",
    targetSelector: null,
    position: "center",
  },
  {
    title: "Adicionar nós",
    description: "Clique duplo no canvas para adicionar um novo nó. Você também pode usar o botão 'Adicionar' na barra de ferramentas ou teclas de atalho (C, P, A, I, R, O).",
    targetSelector: "[data-canvas='true']",
    position: "center",
  },
  {
    title: "Barra de ferramentas",
    description: "Use a barra de ferramentas para trocar entre as ferramentas (Selecionar, Arrastar, Conectar), adicionar nós, desfazer/refazer, ajustar zoom e acessar as funcionalidades principais.",
    targetSelector: ".toolbar-group",
    position: "bottom",
  },
  {
    title: "Painel de IA",
    description: "Explore o painel de IA para gerar mapas automaticamente, expandir nós, resumir subárvores, sugerir conexões e conversar com o assistente sobre seu mapa.",
    targetSelector: "[title='IA']",
    position: "bottom",
  },
  {
    title: "Configurações",
    description: "Configure toggles no painel de Configurações para controlar cada funcionalidade independentemente — IA, aparência, editor, performance e exportação.",
    targetSelector: "[title='Configurações']",
    position: "bottom",
  },
];

interface Props {
  forceShow?: boolean;
}

export function OnboardingTour({ forceShow }: Props) {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Show tour if: not dismissed AND (never completed OR forceShow requested)
  const shouldShow = !dismissed && (forceShow || !localStorage.getItem(TOUR_KEY));

  // When forceShow changes, reset step and dismissed state
  // Use a key based on forceShow to effectively "reset" the component
  const effectiveKey = forceShow ? "force" : "normal";

  const handleFinish = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "true");
    setDismissed(true);
  }, []);

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "true");
    setDismissed(true);
  }, []);

  const handleNext = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  }, [step, handleFinish]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
    }
  }, [step]);

  const currentStep = TOUR_STEPS[step];
  const isLastStep = step === TOUR_STEPS.length - 1;

  // Compute target element position
  const targetRect = useMemo<DOMRect | null>(() => {
    if (!shouldShow || !currentStep.targetSelector) return null;
    // Only try to find element if visible (DOM should be ready)
    try {
      const el = document.querySelector(currentStep.targetSelector);
      return el ? el.getBoundingClientRect() : null;
    } catch {
      return null;
    }
  }, [shouldShow, currentStep.targetSelector, step]);

  const tooltipStyle = useMemo(() => {
    if (!targetRect || currentStep.position === "center") {
      return {
        position: "fixed" as const,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const padding = 12;
    const tooltipWidth = 320;

    switch (currentStep.position) {
      case "bottom": {
        const left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        const top = targetRect.bottom + padding;
        return {
          position: "fixed" as const,
          left: Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16)),
          top: Math.min(top, window.innerHeight - 200),
        };
      }
      case "top": {
        const left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        const top = targetRect.top - padding - 150;
        return {
          position: "fixed" as const,
          left: Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16)),
          top: Math.max(16, top),
        };
      }
      case "right": {
        const left = targetRect.right + padding;
        const top = targetRect.top + targetRect.height / 2 - 80;
        return {
          position: "fixed" as const,
          left: Math.min(left, window.innerWidth - tooltipWidth - 16),
          top: Math.max(16, top),
        };
      }
      case "left": {
        const left = targetRect.left - padding - tooltipWidth;
        const top = targetRect.top + targetRect.height / 2 - 80;
        return {
          position: "fixed" as const,
          left: Math.max(16, left),
          top: Math.max(16, top),
        };
      }
      default:
        return {
          position: "fixed" as const,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        };
    }
  }, [targetRect, currentStep.position]);

  if (!shouldShow) return null;

  return (
    <AnimatePresence key={effectiveKey}>
      {shouldShow && (
        <>
          {/* Overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center"
            onClick={handleSkip}
          />

          {/* Highlight ring around target element */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed z-[201] rounded-lg pointer-events-none"
              style={{
                left: targetRect.left - 4,
                top: targetRect.top - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                boxShadow: "0 0 0 4px var(--primary), 0 0 20px 4px rgba(var(--primary-rgb), 0.3)",
                animation: "pulse-ring 1.5s ease-in-out infinite",
              }}
            />
          )}

          {/* Step icon for center-positioned steps */}
          {currentStep.position === "center" && !targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed z-[202] pointer-events-none"
              style={{ left: "50%", top: "45%", transform: "translate(-50%, -100%)", marginBottom: 16 }}
            >
              <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </motion.div>
          )}

          {/* Tooltip */}
          <motion.div
            key={`tour-step-${step}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed z-[202] w-[320px] max-w-[calc(100vw-32px)] pointer-events-auto"
            style={tooltipStyle}
          >
            <div
              className="rounded-xl bg-card p-4 backdrop-blur-md relative"
              style={{
                border: "1px solid color-mix(in srgb, white 10%, transparent)",
                boxShadow:
                  "0 24px 64px -12px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in srgb, var(--primary) 8%, transparent), inset 0 1px 0 color-mix(in srgb, white 6%, transparent)",
              }}
            >
              {/* Close button */}
              <button
                className="absolute top-2.5 right-2.5 h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground hover:underline transition-colors"
                onClick={handleSkip}
                aria-label="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Step indicator — active dot larger (8x8), inactive at 50% opacity */}
              <div className="flex items-center gap-1.5 mb-2.5">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all ${
                      i === step
                        ? "h-2 w-2 bg-primary opacity-100"
                        : i < step
                          ? "h-1.5 w-1.5 bg-primary/50 opacity-50"
                          : "h-1.5 w-1.5 bg-muted opacity-50"
                    }`}
                  />
                ))}
              </div>

              {/* Title */}
              <p className="text-sm font-semibold text-foreground mb-1.5">{currentStep.title}</p>

              {/* Description — higher contrast + 1.6 line-height */}
              <p className="text-xs text-foreground/80 mb-3" style={{ lineHeight: 1.6 }}>{currentStep.description}</p>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                  onClick={handleSkip}
                >
                  Pular tour
                </button>
                <div className="flex items-center gap-1.5">
                  {step > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={handlePrev}
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Voltar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={isLastStep ? handleFinish : handleNext}
                    style={{
                      boxShadow: "0 0 16px 2px color-mix(in srgb, var(--primary) 25%, transparent)",
                    }}
                  >
                    {isLastStep ? (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Concluir
                      </>
                    ) : (
                      <>
                        Próximo
                        <ChevronRight className="h-3 w-3" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Step counter */}
              <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
                {step + 1} de {TOUR_STEPS.length}
              </p>
            </div>
          </motion.div>

          {/* CSS animation for the highlight ring */}
          <style>{`
            @keyframes pulse-ring {
              0%, 100% { box-shadow: 0 0 0 4px var(--primary), 0 0 20px 4px rgba(var(--primary-rgb), 0.3); }
              50% { box-shadow: 0 0 0 4px var(--primary), 0 0 30px 6px rgba(var(--primary-rgb), 0.5); }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

// Export a utility function to replay the tour
export function replayTour() {
  localStorage.removeItem(TOUR_KEY);
  // The tour will auto-show on next mount since localStorage is cleared
}
