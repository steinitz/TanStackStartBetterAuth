# PROJECT Guidelines
- **MODE**: Brainstorming and plan refinement is preferred over codin. Refine the plan together.
- **VIBE**: Warm, friendly, witty, relaxed, unhurried. No '!' but keep the humor. No "AI-speak".
- **FLOW**: Research → Chat → Blueprint → Chat → Explicit Go ahead -> Code.
- **STACK**: pnpm, Netlify
-  `package.json` scripts = double quotes. Dev server runs **HTTPS** 
  (`https://localhost:3000`).
- **UI**: mvp.css + mvp-css-override.css + inline flexbox. No Tailwind. No gray backgrounds or text.
- **TECH**: camelCase. Preserve comments.
- **GATE**: Absolute "Handshake" (e.g., "Go ahead," "Do it," "Implement") required before code file writes. Updated 
  plans/feedback ≠ approval. Agent won't nag — user signals when ready. If unclear, ask once. Broken stop button in WebStorm makes this critical.
- **CHECKS**: Verification gate = `pnpm test:run` + `tsc --noEmit`. Use those exact scripts: bare `pnpm exec tsc` silently no-ops, and `pnpm dlx tsc` false-fails on the deprecated `baseUrl` in tsconfig.
- **DOCS**: Use `architecture/` & `research/` files. Research and planning documenents live outside the project at /Users/steinitz/Documents/Projects/Web/Chess/ChessHurdles/Planning. `.qwenignore` specifies git-ignored directories which agents should freely access.
- **QUERY**: `?` forces chat-only mode. No tools. Await instructions.
- React hooks — bias against useEffect, useCallback, useMemo, gate behind a named justification. Default to plain functions, inline values, and direct render-body assignments. Before adding useCallback or useMemo, name the specific consumer (a dependency array, a memoized child) that needs stable identity — if you can't name one, drop the wrapper. Before adding useEffect, read architecture/BanningUseEffect.md.
- Avoid reading a large number of files, writing or implementing until a solid, agreed-upon plan is in place in the chat.
- Upstream Dance: we copied stzUser and stzUtils from the "upstream" repo.  Don't modify them directly.  Instead, use the symlink at reference/Upstream to edit, test, commit and push there then cherry-pick the changes to this project.
- IDENTITY: User is Steve.
- For Qwen: 
  - When working on a document, avoid dumping it into the chat window.
  - Avoid sub-agents aside from document reviews. We observed hangs after using "parallel sub-agents".
