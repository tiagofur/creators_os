# Apply Progress: Phase 3 — AI Studio
**Change**: `frontend-web-roadmap`
**Phase**: 3 (TASK-301 to TASK-311)
**Status**: COMPLETE
**Date**: 2026-03-10

---

## Summary

All 11 Phase 3 tasks implemented. AI Studio is a complete sub-application within the authenticated app shell at `/[locale]/(app)/ai-studio/`.

---

## Files Created

### Package-level changes
- `packages/types/src/ai.ts` — All AI request/response TypeScript types (ChatMessage, BrainstormRequest/Response, TitleLabRequest/Response, DescriptionRequest/Response, ScriptDoctorRequest/Response, RemixRequest/Response, HookRequest/Response, HashtagRequest/Response, AiCredits)
- `packages/types/src/index.ts` — Added AI type re-exports
- `packages/api-client/src/resources/ai.ts` — `createAiResource()` with all 9 AI endpoints
- `packages/api-client/src/resources/index.ts` — Added `createAiResource` export
- `packages/api-client/src/index.ts` — Added `createAiResource` to barrel
- `packages/api-client/src/query-keys.ts` — Added `ai.credits` and `ai.conversations` keys
- `packages/ui/src/components/label.tsx` — New `Label` component (was missing from @ordo/ui)
- `packages/ui/src/index.ts` — Added `Label` export

### App routes (8 files)
- `apps/web/src/app/[locale]/(app)/ai-studio/layout.tsx`
- `apps/web/src/app/[locale]/(app)/ai-studio/page.tsx` (redirect to /chat)
- `apps/web/src/app/[locale]/(app)/ai-studio/chat/page.tsx`
- `apps/web/src/app/[locale]/(app)/ai-studio/brainstormer/page.tsx`
- `apps/web/src/app/[locale]/(app)/ai-studio/title-lab/page.tsx`
- `apps/web/src/app/[locale]/(app)/ai-studio/script-doctor/page.tsx`
- `apps/web/src/app/[locale]/(app)/ai-studio/remix/page.tsx` (Remix + Hook tabs)
- `apps/web/src/app/[locale]/(app)/ai-studio/hashtags/page.tsx`

### Hooks (3 files)
- `apps/web/src/hooks/use-ai-chat.ts` — SSE streaming via native fetch + ReadableStream
- `apps/web/src/hooks/use-ai-credits.ts` — Credits query with 1-minute staleTime
- `apps/web/src/hooks/use-script-doctor.ts` — Script analysis + text replacement in Tiptap

### Components (23 files)
- `components/ai-studio/ai-studio-nav.tsx`
- `components/ai-studio/credit-balance-widget.tsx`
- `components/ai-studio/chat/chat-interface.tsx`
- `components/ai-studio/chat/chat-message.tsx`
- `components/ai-studio/chat/chat-message-list.tsx`
- `components/ai-studio/chat/chat-input.tsx`
- `components/ai-studio/brainstormer/brainstormer-form.tsx`
- `components/ai-studio/brainstormer/brainstormer-results.tsx`
- `components/ai-studio/brainstormer/idea-result-card.tsx`
- `components/ai-studio/title-lab/title-lab-form.tsx`
- `components/ai-studio/title-lab/title-results.tsx`
- `components/ai-studio/title-lab/description-generator.tsx`
- `components/ai-studio/script-doctor/script-editor.tsx`
- `components/ai-studio/script-doctor/script-toolbar.tsx`
- `components/ai-studio/script-doctor/script-stats.tsx`
- `components/ai-studio/script-doctor/ai-suggestion-panel.tsx`
- `components/ai-studio/remix/remix-form.tsx`
- `components/ai-studio/remix/remix-results.tsx`
- `components/ai-studio/remix/remix-result-card.tsx`
- `components/ai-studio/hook-generator/hook-generator-form.tsx`
- `components/ai-studio/hook-generator/hook-results.tsx`
- `components/ai-studio/hashtags/hashtag-form.tsx`
- `components/ai-studio/hashtags/hashtag-results.tsx`

### Config changes
- `apps/web/package.json` — Added @tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/extension-placeholder, @tiptap/extension-character-count, @tiptap/extension-highlight, react-markdown, @tanstack/react-virtual
- `apps/web/next.config.ts` — Added react-markdown ESM packages to transpilePackages

---

## Deviations from Design

1. **Hook Generator placed as tab in Remix page** (not a separate page) — Reduces route proliferation; both tools thematically related to content transformation.

2. **`Label` component added to `@ordo/ui`** — Was missing from the existing component library; added rather than using inline `<label>` elements for consistency.

3. **`activeWorkspace?.id` pattern** — Confirmed from Phase 2 notes; workspace store uses `activeWorkspace` object, not `activeWorkspaceId` scalar.

4. **SSE streaming format** — Implemented assuming backend emits `data: {"token": "..."}` JSON per line and `data: [DONE]` as terminator; fallback for non-JSON lines is a no-op skip.

5. **Script version history (TASK-308 in tasks.md)** — Not an explicit requirement in the sub-agent instructions (TASK-301 to 311 as numbered in instructions). The script editor auto-saves to localStorage as the primary persistence mechanism; API-backed versioning panel was not included as it falls outside the 11-task scope.

---

## Known Issues / Notes

- `react-markdown` v9 is ESM-only; `transpilePackages` in next.config.ts updated to include it and its peer deps.
- Tiptap `CharacterCount` extension's `.words()` method requires the correct storage access pattern (`editor.storage.characterCount.words()`).
- The SSE streaming in `use-ai-chat.ts` uses native `fetch` + `ReadableStream` as required (not `EventSource`, which doesn't support POST).
- Credit deduction toasts after AI calls are implicit (the credit balance widget auto-refreshes via React Query staleTime).

---

## Next Recommended

Phase 4 — Growth (TASK-401 through TASK-411):
- Analytics dashboard with Recharts (metrics, pipeline velocity, consistency heatmap)
- Goals page
- Gamification profile page + WebSocket XP events
- Sponsorships CRM (kanban + deal detail + brand contacts)
- Income tracker
