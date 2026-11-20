# AI usage

## Tools and models
- **Claude Code** (desktop app), model **Claude Opus 5.5**: planning, code generation, tests, docs, and running the app in its built-in browser to verify the flows.
- Agent instruction file: [`CLAUDE.md`](CLAUDE.md), committed. It records the architecture rules and coding standards so later agent runs keep to them.

## How I directed the work

1. **Brief first.** I gave the agent the full challenge PDF and the deadline, and asked it to plan before writing code.
2. **Decisions stayed with me.** Before any code was written, the agent asked me to decide the ambiguous points. I chose:
   - **"Top rated" on the home page = merchandiser-chosen via config**, not computed. The AC says "I have chosen".
   - **Email = Mailpit in docker compose plus a console fallback**, behind an `EmailProvider` interface, so there's no paid service or reviewer account and the provider can be swapped later.
   - React + TypeScript web client and Node + TypeScript backend.
3. **Boundaries set up front:** product data only through the backend; a `ProductSource` port with Fake Store as one adapter; ports for email; config via validated env vars. These are written down in `CLAUDE.md`.
4. **Verification, not trust:** typecheck plus unit/API tests after each layer, a live smoke test of every endpoint against the real Fake Store API, and a click-through in a real browser (home → category → search → product → enquiry → "Thank you", with the email confirmed in the backend log).

## Plan / spec used
1. Backend: domain types and `ProductSource` port → Fake Store adapter (zod validation, cache) → `CatalogueService` (featured, category split, search) → enquiry + email port → Express routes with validation, security headers, rate limit and error mapping.
2. Frontend: API client module → pages for each AC → enquiry form with client-side validation and a thank-you state.
3. Tests per AC on both sides, then Docker/compose, then docs.

## Key prompts / moments
1. *"Here is the challenge PDF; I need to submit before 12 PM tomorrow."* The agent turned the AC into a plan and listed the gaps instead of guessing silently.
2. **Answering the agent's three decision questions** (folder, top-rated meaning, email approach). This set the core design: config-driven featured products and a swappable email provider.
3. **"Fake Store must not be called from the client"** drove the `/api` proxy (Vite in dev, nginx in Docker), so the browser only ever talks to our backend.
4. **Category "top rated"** has no "I have chosen" in the AC, so it's computed by rating with an explicit tie-break (two electronics products tie at 4.8). Recorded in DECISIONS.md.

## Where the AI got things wrong, and how it was caught
- **Phone validation was too weak, caught by me in manual testing.** The AI's first version only checked the *characters* (`^[+\d][\d\s()-]*$`), so made-up numbers like `12345` or `0000000000` were accepted. I asked for real validation, then took it a step further: a separate country code dropdown (default Australia +61) next to the national number. Both client and server now validate the number against the selected country's numbering plan with `libphonenumber-js`, with tests for the fake numbers I tried, real AU/IN/GB/US numbers, and mismatches (an Indian mobile under Australia). A "plausible but incorrect" output: the field *looked* validated.
- **Every API call sent twice, caught by me in the browser's network tab.** Featured, category, search and product calls all went out twice, and pages I'd already visited were fetched again.
  - **Diagnosis:** the agent measured every flow in both builds. Dev mode (`npm run dev`) doubled every call because React `StrictMode` double-mounts components and the AI's hand-rolled `useAsync` hook didn't de-duplicate. The production build called once, but still had no client cache.
  - **Fix:** replaced the hook with TanStack Query (de-duplication + 5-minute cache), and list responses now seed product details. StrictMode stays on.
  - **Proof:** two new tests run the app in StrictMode and assert each endpoint is called exactly once across a full journey (home → category → product → back → home → search → product). A re-measured browser run showed one call per new page and zero on revisits.
- **Dockerfile vs npm workspaces lockfile.** The first Dockerfiles copied only one workspace's `package.json` before `npm ci`. With a shared root lockfile, npm can reject that as out of sync. Caught on review and fixed by copying both workspace manifests.
- **Unsafe cleanup command.** During the smoke test the agent tried to stop the server by killing *all* `node.exe` processes on the machine. The permission guard blocked it. It was redone as a background task stopped by its own ID.
- **False alarm on "missing" images.** The first browser screenshot showed blank product tiles. Rather than "fixing" CSS or CSP, the agent checked `naturalWidth` on the images: they had loaded, and the screenshot was taken before they painted. No code change. Good example of verifying before changing.
- **Test noise.** React Router v7 future-flag warnings appeared in test output. They were opted into explicitly so real warnings aren't buried.
- **Leftover processes and an unneeded port.** Stopping the dev-server background task didn't stop its child processes, so the old API kept port 4000. The first `docker compose up` then failed with "port 4000 is already allocated". Two fixes: the orphaned processes were stopped, and the compose file no longer publishes the API to the host at all. The browser only needs nginx on :8080, which proxies `/api`, so a reviewer can't hit the same clash.
- **Docker verified end to end:** both images build. Via `docker compose up`, `/api` works through nginx, an enquiry lands in the Mailpit inbox, and SPA deep links (e.g. `/categories/electronics`) return 200.

> **My review notes:** <!-- TODO (Ashutosh): add 1–3 things YOU found or changed while reviewing the code yourself. Be specific and only write what actually happened. -->

## Time spent
<!-- TODO (Ashutosh): fill in your real numbers before submitting. -->
| Phase | Time |
|---|---|
| Planning (reading brief, deciding assumptions) | ~15 min |
| Building (agent-driven, with review) | ~35 min |
| Testing (automated + manual browser run) | ~15 min |
| Reviewing code and docs myself | _TODO_ |
| **Total** | _TODO_ |
