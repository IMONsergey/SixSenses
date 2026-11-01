# Six Senses motion verification

## Confirmed result, 2026-11-01

Enhanced motion job `20261101T130704-34b4912f4d` passed all 14 checks in Chromium and all 14 in WebKit, in 60.1 seconds total. The integration owner reported no page errors, asset HTTP failures or API requests. Final build and TypeScript job `20261101T125857-7ad2849f24` also passed, including the latest About timing, skip-link focus and deferred closed-viewer source. The common five-project browser suite, including Six Senses, passed in job `20261101T124919-e3044c77a5`.

These references record authorized server runs. They are separate from publication or production measurements.

## Run commands

Run from the project root on the verification server, where dependencies and original/generated public assets are present:

```sh
npm run check
npm run build
node scripts/browser-qa.mjs
node scripts/motion-qa.mjs
```

`browser-qa.mjs` is the common functional regression harness and uses its own Astro server on port 4314. Its form responses are mocked. `motion-qa.mjs` creates a separate owned Astro server on a free localhost port and runs Chromium, then WebKit. Run the harnesses sequentially. Both use the shared server Playwright installation; the motion script accepts an alternate package location:

```sh
PLAYWRIGHT_PACKAGE=/absolute/path/to/playwright/package.json node scripts/motion-qa.mjs
```

The motion script has a 92-second overall budget and closes its own browser/server. Each engine receives a fresh desktop context and a fresh touch context. It blocks all `/api/` requests and fails if an attempt occurs; its dialog checks do not submit forms.

## Automated motion coverage

| Area | What the script verifies |
| --- | --- |
| Desktop startup | At 1440×900 with normal motion and a fine pointer, seven scroll stories initialize. The original intro completes. |
| Skip link | Tab reaches the skip link; Enter focuses `main`; the next Tab enters accessible main content instead of returning to the header. |
| Hero | Stable progress samples `.07`, `.26`, `.40`, `.57`, `.64`, `.88` check original/incoming foregrounds, no simultaneous visible old/new foregrounds, an opaque incoming background before the invitation, and selected-state accessibility. |
| About | Samples `.07`, `.26`, `.40`, `.64`, `.76`, `.995` check the separate foreground phases. At `.76`, the heading, its three nested lines, both columns and their paragraphs are all visible at full effective opacity. |
| Architecture pan | The image has meaningful excess height, travels at least 90% of its available vertical range by `.995`, and still covers the stage bottom. |
| Active controls | The primary About CTA opens an enquiry. Header navigation reaches the secondary Location and Layouts scenes; the map and residence details open from those scenes. |
| Dialog lifecycle | Tab, Enter, nested Privacy and Escape preserve the intended focus. Closing waits for the exact remaining open-dialog set, body/html lock classes, menu expansion state and released vertical overflow. |
| Short window and restoration | At 1440×650, both states of all seven chapters enter natural flow without stale inert/hidden/transform states. Returning to 1440×900 preserves Layouts and its selected secondary scene. |
| Reduced motion change | Switching reduced motion on while reading Contact removes scroll stories and keeps Contact in the reading viewport with a focusable form. |
| Touch layout | A fresh 390×844 coarse-pointer context has no document/body horizontal overflow, retained inert content or hidden focusable controls. Menu keyboard/touch navigation reaches Contact and releases the document lock. |
| Runtime observations | No recorded page errors, failed asset HTTP responses or attempted API requests during the scenarios. |

The transition checks use stable sampled progress, not a claim about every possible intermediate frame. The settlement helper observes successive animation frames and unchanged rendered geometry, opacity, visibility, clipping and transforms. It includes nested About lines and investment photograph transforms. A fixed delay alone is not treated as settled motion.

The common `browser-qa.mjs` separately exercises responsive widths 1440/768/390/320, original image loading, gallery selection, contained-image zoom/pan/reset, residence detail values and mocked enquiry validation/retry behavior. It deliberately loads original image inventory for functional inspection; it is not a page-loading performance measurement.

## Artifacts and visual review

The motion run writes `artifacts/motion-qa/report.json`, including completed checks, measured scene states, diagnostics, errors and screenshot names. For each engine it captures:

- `*-hero-invitation.png` at the invitation state.
- `*-about-reading.png` at progress `.76`.
- `*-about-pan-end.png` at progress `.995`.
- `*-layouts-steady.png` at progress `.92`.
- `*-investment-collage.png` at progress `.92`.
- `*-mobile-home.png` at 390×844.

A failure snapshot is added when possible. Layout and collage captures wait for their own visible images to load; the motion harness does not eagerly load the entire image inventory. Collage captures are visual-review artifacts, not an automated assertion that every crop matches the design reference.

For the latest successful run, the integration owner reviewed `webkit-about-reading.png` and `webkit-investment-collage.png`, confirming fully visible About text and accepting the collage composition. Additional physical-device, delayed-request and gesture-cancellation scenarios are listed as manual instructions in [MEDIA-QA-2026-11-01.md](MEDIA-QA-2026-11-01.md); those instructions are not recorded as completed automated checks.

## Performance diagnostics and limits

Each engine records a defined, warm 2,200 ms scroll from the beginning of Hero to About progress `.995`. The report stores the requested and actual interval, distance, RAF deltas, median/p95/maximum RAF intervals and counts of intervals exceeding 33.34 ms or 50 ms. These thresholds label observations; they are not pass/fail requirements.

Where supported, a PerformanceObserver records Long Tasks during that scroll, with their durations and total count. Unsupported Long Tasks reporting is explicitly marked unsupported rather than reported as zero tasks. The script verifies that the diagnostic actually scrolled over multiple frames and reached its endpoint, but does not impose an FPS gate.

These observations depend on the headless browser, server load, cache state and instrumentation. They do not establish universal frame rate, physical-device smoothness, cold-load LCP/CLS or production byte savings. Production loading comparisons are a separate observation workflow and are not inferred from this motion pass.
