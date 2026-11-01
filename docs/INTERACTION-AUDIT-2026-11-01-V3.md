# Six Senses — interaction audit V3

Date: 2026-11-01. Baseline: `c7f4899544874b17f538a971385f963450db5c1c` and the public `https://six-senses-imon.vercel.app` site. Candidate: the uncommitted source recorded in [summary.json](verification/interaction-v3/summary.json). Publication and public acceptance belong to the release owner.

The final candidate passes **15/15 focused journeys in Chromium and 15/15 in WebKit**, plus the existing motion gate's **15/15 check groups in each engine**. These are fresh runs. V2 reports remain unchanged and are not used as this acceptance evidence.

## Confirmed problems and changes

| Problem and reproduction | Evidence before the fix | Result in this candidate |
| --- | --- | --- |
| Open Layouts, then reload; or enter a functional `#layouts`, `#location`, `#interiors` URL. | The public reload showed residence cards while their state remained `view=0`, `inert=true`, `aria-hidden=true`; visible controls did not respond. Root independently reproduced this. | Accessibility, pointer state and view controls follow the rendered GSAP animation progress after refresh/restoration. Direct functional links select the usable secondary scene. |
| Navigate Location → Layouts → browser Back/Forward. Open a residence → plan, then Back/Forward/Escape. | Section navigation replaced entries; modal layers were not represented in history, so Back could leave the site while dialogs/query remained inconsistent. | One dialog stack is synchronized with URL/history. Back closes the top layer, Forward restores its original payload. Switching a unit replaces its entry. Closing a direct `?unit=` link cleans the query within the page. |
| Open a unit → enquiry → terms; navigate between layers. | History could lose the relationship between layers and residence context. | The common parent prefix stays open. Parent scroll, focus, draft and context survive child closure. History stores route/media/context descriptors, not entered form fields. |
| Return to a previous plan after changing the underlying unit; or reopen zoom before the queued native close event runs. | Intermediate local diagnostics reproduced a stale plan/URL relationship and zoom stuck at “Loading image”. | History restores the original unit and plan together. Delayed close cleanup exits if the dialog has already reopened. A native hash-created entry is registered before adding child dialogs. |
| Return an HTTP 201 response with `ok:true` but an unrelated receipt ID. | The public baseline showed success for that mismatched receipt. | Success requires the submitted ID. A mismatch keeps the form and details visible, shows a retry message, and a matching retry succeeds with the same submission ID. All responses in this check were local mocks. |

The first local WebKit run also exposed a separate late native fragment jump after application navigation: on Layouts reload, application scrolling reached `7869` at 450 ms; at 499 ms a native scroll returned it to `6745`, without a JS `scrollTo` call. The initial fragment is now temporarily reserved within the same history entry while pinned geometry loads, then restored and navigated after load/refresh. Explicit navigation or wheel/touch/scroll-key intent cancels the pending automatic restoration. This uses lifecycle events, not a fixed delayed correction. The [diagnostic trace](verification/interaction-v3/webkit-initial-scroll-trace.json) is separate from final acceptance.

## Fresh verification

| Run | Result | Evidence |
| --- | --- | --- |
| Public baseline, Chromium 145.0.7632.6 | 0/13 selected regression journeys passed | [baseline-chromium.json](verification/interaction-v3/baseline-chromium.json) |
| Final local candidate, Chromium 145.0.7632.6 | 15/15 passed | [accepted-chromium.json](verification/interaction-v3/accepted-chromium.json) |
| Final local candidate, WebKit 26.0 | 15/15 passed | [accepted-webkit.json](verification/interaction-v3/accepted-webkit.json) |
| Existing motion gate, both engines | 15/15 check groups each; 52.3 seconds total | [motion.json](verification/interaction-v3/motion.json) |

The 13 baseline failures are regression journeys, not 13 independent defects. Two additional cases were added after source review. Intermediate local failures are retained as diagnostics: [queued-close/native-hash](verification/interaction-v3/local-race-diagnostics.json) and [WebKit before fragment reservation](verification/interaction-v3/local-webkit-before-fragment-reservation.json). An early harness also compared rendered unit titles case-sensitively despite authored uppercase CSS; those assertion-only failures were corrected before the final runs.

The focused journeys cover direct/reloaded/manual fragments; section Back/Forward; unit/zoom Back/Forward/Escape; replacing unit tabs; direct-query close; nested enquiry/legal navigation and draft retention; restoration of the original plan after a parent-unit change; mismatched/matching receipts; narrow 390×844 history; queued native close/reopen; and native hash followed by nested close/Forward. The queued-close case deliberately calls native `close()` and a plan click in the same task to test that lifecycle race deterministically.

The motion gate exercises the original hero/About handoffs, scene selection and ARIA/inert, map and residence controls, keyboard focus, investment sequence, resizing between pinned and natural flow, reduced-motion changes, and touch 390×844 navigation/overflow. Chromium's sampled RAF p95 was 16.8 ms and WebKit's 55 ms on this cloud machine. These measurements are diagnostic, not a universal smoothness or FPS claim.

Final runs logged **zero page errors**, **zero unexpected writes**, and the motion gate logged **zero failed original assets and zero enquiry attempts**. The focused receipt test fulfilled two synthetic POSTs per engine locally. TypeScript check, production build, focused-script syntax and `git diff --check` passed. One owned context ran at a time; all browsers and preview PID 462667 / port 14334 were stopped afterward.

## Selected visual evidence

- Root public reproduction: [Layout navigation](verification/interaction-v3/root-live-layouts-navigation.jpg), [reload](verification/interaction-v3/root-live-layouts-reload.jpg).
- Reload: [public before](verification/interaction-v3/before-layouts-reload.jpg), [Chromium after](verification/interaction-v3/after-layouts-reload-chromium.jpg), [WebKit after](verification/interaction-v3/after-layouts-reload-webkit.jpg). DOM assertions establish operability; the screenshot alone does not.
- Receipt mismatch: [public false success](verification/interaction-v3/before-receipt-mismatch.jpg), [WebKit retry state](verification/interaction-v3/after-receipt-mismatch-webkit.jpg).
- Queued zoom cleanup: [local intermediate failure](verification/interaction-v3/local-before-queued-close-reopen.jpg), [WebKit after](verification/interaction-v3/after-queued-close-reopen-webkit.jpg).
- [Narrow history after](verification/interaction-v3/after-narrow-history-webkit.jpg).

## Files and limits

Changed application files: `src/scripts/main.ts`, `src/scripts/media-interactions.ts`. Added reproducible focused harness: `scripts/logic-regression-qa.mjs`. Added this report and the evidence under `docs/verification/interaction-v3/`; source/build hashes and compact counters are in `summary.json`.

No authored CSS, markup, original media, fonts or residence data changed. Six has no film/video player in this implementation. No real enquiry delivery or storage was exercised. The focused narrow tests use a desktop context; the motion gate additionally uses touch emulation. Neither certifies physical iPhone Safari or every device/pixel. The broader `browser-qa.mjs` suite was not rerun or modified. Public deployment acceptance remains the release owner's next step.

To reproduce the focused suite, install the locked project dependencies and Playwright, build and serve `dist/client`, then set `BASE_URL`, `PLAYWRIGHT_PATH`, `PLAYWRIGHT_BROWSERS_PATH`, `QA_ENGINE=chromium` (then `webkit`) and run `node scripts/logic-regression-qa.mjs`. For the existing motion gate use `MOTION_QA_BASE_URL` and `PLAYWRIGHT_MODULE`, then run `node scripts/motion-qa.mjs`. The focused harness blocks every unexpected write; its receipt responses are mocked.
