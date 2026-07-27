---
Task ID: 5-b
Agent: full-stack-developer
Task: Add new features: edge label editing, JSON import, contextual floating toolbar, onboarding tour, map deletion confirmation

Work Log:
- Read worklog.md and all existing source files to understand project context
- Implemented Feature 1: Edge Label Editing (MapEdges.tsx) — double-click inline edit via foreignObject/input, tooltip hint on hover, default label creation on path double-click
- Implemented Feature 2: JSON Import (ExportPanel.tsx) — 5th "Importar JSON" card with file input, validation function, API POST with ID-to-index mapping, error messages, sample structure hint
- Implemented Feature 3: Contextual Floating Toolbar (FloatingToolbar.tsx) — Edit/Delete/Duplicate/Color/Collapse actions, framer-motion animation, positioned above selected node
- Implemented Feature 4: First-Use Onboarding Tour (OnboardingTour.tsx) — 5-step tour with highlight ring, localStorage persistence, replay via SettingsPanel "Repetir tour" button
- Implemented Feature 5: Map Deletion Confirmation (Sidebar.tsx) — shadcn AlertDialog replaces window.confirm, red "Excluir" button, quoted map title in description
- Wired all new components into page.tsx (FloatingToolbar, OnboardingTour, SettingsPanel onReplayTour prop)
- Fixed lint errors: handleFinish declaration order, setState-in-effect patterns, ref access during render
- Final lint: 0 errors, 0 warnings

Stage Summary:
- All 5 features implemented and lint-clean
- Key artifacts: MapEdges.tsx (edge label editing), ExportPanel.tsx (JSON import), FloatingToolbar.tsx (new), OnboardingTour.tsx (new), Sidebar.tsx (AlertDialog confirmation), SettingsPanel.tsx (replay tour button), page.tsx (wiring)
- Dev server compiles without errors
