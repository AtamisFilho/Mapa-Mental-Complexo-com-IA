# Task 15-B — Search & Find Nodes feature

**Agent:** full-stack-developer  
**Task:** Add in-app Search & Find Nodes feature (Ctrl+F / Cmd+F) with goto, prev/next navigation, replace, and canvas highlighting.

## Work Log

### 1. Read context & planned
- Read `/home/z/my-project/worklog.md` (Tasks 0–14 all complete; app is feature-rich with command palette, alignment guides, icon picker, favorites, templates).
- Read existing files: `mindmap-store.ts`, `MapNode.tsx`, `page.tsx`, `CommandPalette.tsx`, `settings.ts` (NODE_KIND_META), `types.ts`, shadcn Dialog/Switch/Input/Badge components, and `globals.css` for the `glass-panel` utility.

### 2. Modified `/home/z/my-project/src/store/mindmap-store.ts`
Added new state and actions to `MindMapState` (kept all existing exports/actions intact):
- `searchQuery: string` (default `""`)
- `searchMatches: string[]` (nodeIds that match the current query)
- `highlightedMatchId: string | null` (the currently-focused match)
- `setSearchQuery`, `setSearchMatches`, `setHighlightedMatch` setters
- `searchNodes(query, opts?)` — filters nodes by substring (case-insensitive by default); `titleOnly` excludes content/note matches; sets `searchQuery` + `searchMatches` + `highlightedMatchId[0]`; returns matched IDs
- `replaceInNode(nodeId, search, replacement, opts?)` — calls `pushHistory()` first, then `updateNode` with title+content replaced via a regex (escaped); returns count of replacements
- `replaceAll(search, replacement, opts?)` — calls `pushHistory()` once, iterates all `searchMatches`, applies patch to all matching nodes in a single `set()` call; returns total count of replacements
- Updated `loadMap` to also reset the three search fields on map switch

### 3. Created `/home/z/my-project/src/components/mindmap/SearchPanel.tsx`
A modal-style panel built on shadcn `Dialog`, `Input`, `Button`, `Switch`, `Badge`, with Framer Motion entrance animation and the `glass-panel` class:

- **Header**: Search icon + "Buscar nós" title, "Substituir" toggle button, "Fechar" (X) button
- **Search input** with magnifier icon, clear button, keyboard handler (Enter = next, Shift+Enter = prev, Esc = close)
- **Replace row** (collapsible via AnimatePresence): Replace input + "Substituir" button + "Todos" (Replace All) button
- **Toggles row**: Case-sensitive switch (with `CaseSensitive` icon, label "Maiúsculas") + "Apenas título" switch (with `CaseUpper` icon)
- **Results list** (`max-h-96 overflow-y-auto scroll-thin`, role="listbox"): Each result shows:
  - Kind icon container (uses `NODE_KIND_META` color + Lucide icon, with the node's emoji if set)
  - Title with `<mark>` highlights around matched substrings (primary-colored background)
  - Snippet of content around the first match (truncated ~60 chars) with highlights
  - Parent-chain breadcrumb (e.g. "Reunião → Tema Central"), built via parentId (fallback to edges)
  - Active match indicator (`CornerDownLeft` icon) + aria-selected
  - Hover sets highlightedMatch; click → `focusNode(id)` + close
- **Footer**: result count + current index ("X resultados · N/M"), prev/next chevron buttons, "Fechar" button
- **State architecture**: 
  - `activeIdx` is **derived** from the store's `highlightedMatchId` (no local state) — keeps the component simpler and avoids the React `set-state-in-effect` lint rule
  - The parent (`page.tsx`) passes `key={searchKey}` that increments on each open, forcing a fresh `useState` initialization (cleaner than resetting state in an effect, also satisfies the lint rule)
  - Search runs via a `useEffect` that calls the store action `searchNodes()` whenever query/toggles change
  - On unmount (panel closed) the store's search state is cleared so canvas highlights disappear

### 4. Modified `/home/z/my-project/src/app/page.tsx`
- Added `SearchPanel` import + `Search` icon from lucide-react
- Added `searchOpen` state + `searchKey` counter state + `openSearch` callback (sets `searchOpen(true)` and increments `searchKey`)
- Added a global `keydown` handler for `Ctrl+F` / `Cmd+F` that `preventDefault()`s the browser's find and calls `openSearch()`
- Rendered `<SearchPanel key={searchKey} open={searchOpen} onClose={...} />` next to the `CommandPalette`
- Added a new "Buscar nós" button in the footer between "Buscar" (Ctrl+K) and "Atalhos" — shows the Search icon + `Ctrl+F` kbd chip + "Buscar nós" label, only on md+ screens
- Did NOT touch any other state, imports, or JSX

### 5. Modified `/home/z/my-project/src/components/mindmap/MapNode.tsx`
- Subscribed to `searchMatches.includes(node.id)` (boolean) and `highlightedMatchId === node.id` (boolean) from the store — Zustand's selector pattern means only the actually-changed nodes re-render
- Added a new `<motion.div>` overlay inside the inner container (between the accent stripe and the content) that is rendered only when `isSearchMatch` is true:
  - For non-highlighted matches: a static amber ring `0 0 0 2px rgba(245,158,11,0.45), 0 0 8px 1px rgba(245,158,11,0.18)` positioned `inset: -3px`
  - For the highlighted (active) match: an animated pulsing ring via Framer Motion `animate={{ opacity: [0.65, 1, 0.65], boxShadow: [...] }}` with `repeat: Infinity`, `duration: 1.4` — the ring grows from 2px to 3px and the glow from 10px to 20px
- All styling is inline (no new CSS files needed, no changes to `globals.css`) — uses `rgba(245,158,11,...)` amber color
- Preserved all existing border/box-shadow/chain-highlight/selected logic untouched

### 6. Ran `bun run lint` from `/home/z/my-project/`
- First run: 2 errors from `react-hooks/set-state-in-effect` rule (calling `setState` in effects)
- Fix: refactored `activeIdx` from local state to a derived `useMemo` from the store's `highlightedMatchId`. Removed the open-reset effect (replaced by `key`-prop remount from parent). Removed the close-clear effect (replaced by unmount cleanup). Removed the sync effect (no longer needed since `activeIdx` is derived).
- Final lint run: **exit code 0, 0 errors, 0 warnings** ✓

### 7. QA via agent-browser on http://localhost:81/
Verified end-to-end:
- ✅ `Ctrl+F` (via `agent-browser press Control+f`) opens the SearchPanel modal (prevents browser's native find)
- ✅ Footer "Buscar nós" button also opens the panel
- ✅ Search input accepts queries; results list populates instantly as you type
- ✅ Results show: kind icon (color-coded by NODE_KIND_META), title with `<mark>` highlights on matched substrings, content snippet (~60 chars) with highlights, parent-chain breadcrumb
- ✅ Tested "reuni" → 2 matches: "🗓️ Reunião" (with content snippet "Tema e objetivo da reunião") and "🔄 Follow-up" (with snippet "Acompanhamento pós-reunião"), both with "Reunião" breadcrumb
- ✅ Pressing Enter cycles to next match (highlighted match updates); Shift+Enter goes to previous
- ✅ Clicking a result calls `focusNode` + closes the panel — the matching node becomes selected and centered in the viewport (verified FloatingToolbar appears on the focused node)
- ✅ "Substituir" toggle expands an animated replace row with "Substituir" and "Todos" buttons
- ✅ Replace All tested: searched "ação", replaced with "ATIVIDADE" — both matches updated in title AND content ("Motivação" → "MotivATIVIDADE", "Itens de ação" → "Itens de ATIVIDADE"); search list re-ran and showed 0 matches for the old query
- ✅ Searching for the replacement word "ATIVIDADE" now finds both updated nodes — confirms the replace persisted to store
- ✅ "Apenas título" toggle ON filters out content-only matches (only title matches remain)
- ✅ "Maiúsculas" (case-sensitive) toggle ON: searching "Reuni" matches only "Reunião" (capital R) in titles, not "reunião" (lowercase) in content
- ✅ Esc closes the panel
- ✅ Footer buttons (Anterior/Próximo) enable/disable correctly based on matchCount
- ✅ No errors in browser console; Fast Refresh rebuilt cleanly after each change
- ✅ Dev server (`dev.log`) shows only successful 200 OK responses and Prisma queries — no compile errors related to my changes

## Stage Summary

**Files created:**
- `src/components/mindmap/SearchPanel.tsx` — full Search & Find/Replace modal (≈490 lines)

**Files modified:**
- `src/store/mindmap-store.ts` — added 3 state fields + 3 setters + 3 actions (`searchNodes`, `replaceInNode`, `replaceAll`); also added search-state reset in `loadMap`
- `src/app/page.tsx` — added `searchOpen` + `searchKey` state, `openSearch` callback, `Ctrl+F`/`Cmd+F` global keyboard handler, `<SearchPanel>` render with remount-key, and a "Buscar nós" footer button with Search icon + Ctrl+F chip
- `src/components/mindmap/MapNode.tsx` — added search-match amber ring overlay (static for matches, pulsing for the active match), subscribed to `searchMatches` + `highlightedMatchId` from store

**Feature behavior:**
- Pressing `Ctrl+F` (or `Cmd+F` on Mac) anywhere in the app opens the SearchPanel modal — overrides the browser's native find-in-page
- Search by title or content (case-insensitive substring match by default); two toggles for case-sensitive and "title-only"
- Results list shows kind icon, highlighted title, highlighted content snippet, parent breadcrumb — click any result to focus+select that node on the canvas and close the panel
- Navigate prev/next via Enter/Shift+Enter or the chevron buttons in the footer
- Replace mode (toggle) lets you replace in the current match or all matches at once — pushes a single history entry per bulk replace (undo-friendly)
- Matched nodes on the canvas get a temporary amber ring; the active match gets a stronger pulsing amber ring with glow — both disappear when the panel closes (store state is cleared on unmount)
- No new dependencies — uses only Zustand (already in store), Framer Motion (already used in MapNode), shadcn/ui (Dialog, Input, Button, Switch, Badge), and Lucide icons (Search, Replace, ChevronUp/Down, CaseSensitive, CaseUpper, CornerDownLeft, X, + node kind icons)

**Lint status:** `bun run lint` → **exit code 0, 0 errors, 0 warnings** ✓

**Dev server status:** Running on port 3000 (proxied via Caddy on port 81); GET / 200 OK; no compile errors after my changes; Fast Refresh rebuilt cleanly.

**Screenshot path:** `/home/z/my-project/download/qa-round8-search-panel.png` (search for "reuni" showing 2 matches with breadcrumbs + snippets + active match indicator + prev/next buttons enabled). Additional QA screenshots:
- `qa-round8-search-initial.png` — initial canvas state before opening panel
- `qa-round8-search-panel-empty.png` — panel just opened, empty state
- `qa-round8-search-results.png` — 3 matches for "tema" (title + content)
- `qa-round8-search-next-highlighted.png` — after pressing Enter, second match is active
- `qa-round8-search-after-click.png` — after clicking a match, panel closed, node focused on canvas
- `qa-round8-search-replace-mode.png` — replace mode toggled on, showing replace input + Substituir/Todos buttons
- `qa-round8-search-replace-all.png` — after Replace All "ação"→"ATIVIDADE", search list now empty (no more matches for "ação")

## Notes / Issues encountered
- The `react-hooks/set-state-in-effect` lint rule initially flagged 2 errors in my SearchPanel because I was calling `setActiveIdx(0)` inside a `useEffect` after running the search. Fixed by deriving `activeIdx` from the store's `highlightedMatchId` via `useMemo` (removing the local state entirely) and using a `key`-prop remount pattern from the parent for state initialization on each open.
- The shadcn `Dialog` `DialogContent` has a default close button (top-right X) — I disabled it with `showCloseButton={false}` and added my own header close button to match the design.
- I used `onOpenAutoFocus={(e) => e.preventDefault()}` on the Dialog to prevent Radix from auto-focusing the first focusable element (which would skip my search input). Instead, I focus the input manually via `useEffect` + `setTimeout`.
- The replace-all regex uses the global flag (`/g` or `/gi`) so all occurrences in a single field are replaced in one pass.
- For accessibility: results list has `role="listbox"` and each result has `role="option"` with `aria-selected`. The Dialog has a `sr-only` `DialogDescription`. Switches have `aria-label`. All buttons have `title` attributes for tooltips.
