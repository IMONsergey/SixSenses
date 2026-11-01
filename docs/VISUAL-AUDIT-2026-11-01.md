# Six Senses visual and interaction audit, 2026-11-01

This is the second, fresh visual audit of the recovered author design, starting from `1b6be6c`. It does not reuse the earlier server QA as evidence for the current continuation. Captures and machine-readable observations are under `artifacts/pixel-audit-20261101-v2/`.

## Reference and scope

The original sunrise hero is Figma `1:350` (1440 x 937); `1:388` is the loader frame. The original page is `1:349`, with the subsequent chapter board beginning at `2047:4553`. The integration owner re-opened these author references and inspected Dprofile case 105141. For the investment sequence, the owner extracted twenty frames at 4 fps from the author's `six case4` embed `7geUdHrYCM46MnZxn6ek9s`.

The audit covers all seven two-state chapters, contact/footer, native navigation landings, the two residence layouts and their nested plans, gallery, map and wellbeing image viewers, both enquiry forms, legal sheets, keyboard focus and scroll locks. Enquiry responses in these checks are intercepted locally. They never create a real enquiry.

## Confirmed findings and corrections

### Text arrows and control geometry

The fresh baseline DOM contained 24 text arrow instances, including hidden modal markup and repeated unit controls. They are now decorative inline SVG paths supplied by `Icon.astro`, with a shared `viewBox`, `currentColor`, explicit stroke, and `aria-hidden`. Close, plus and minus controls use the same vector system. Existing author SVG assets in the primary Action and document buttons remain intact.

The circular and rectangular control dimensions are retained. Grid centering is explicit for close/zoom controls, rather than depending on a font glyph's baseline. Labels and accessible names remain text. The source scan decodes HTML entities and includes Astro, TypeScript, CSS and original SVG files; the browser scan also inspects generated text and CSS pseudo-element content.

### Reading position across motion and viewport changes

The fresh desktop failure was `Interiors y9940 -> reduced Contact y6412 -> normal Contact y15295`. A separate mobile failure was `Interiors y6563 -> reduced Home y0`. These are real preference changes without locator scrolling.

Two independent causes were addressed:

1. GSAP clears the scroller's recorded position when the final ScrollTrigger is removed. A reading snapshot is now taken before the matchMedia teardown and restored after ScrollTrigger's refresh. The snapshot is cached before a viewport resize can clamp the document. Six preserves the selected source chapter and primary/secondary state when moving between a sticky story, static desktop view, and natural mobile flow.
2. The universal reduced-motion rule set `transition-duration:.01ms`, while the default `transition-property` was `all`. Removing `.is-story` therefore started a new height transition on otherwise non-animated chapters. The synchronous restore still measured heights of 2070/2790 px; the next frame changed them to 900 px and clamped the page to Contact. Reduced transitions now use `0s`, so the final geometry is available during restoration. Reduced native scrolling also uses `auto!important`, preventing a delayed GSAP inline `smooth` restoration from overriding the preference.

The two competing requestAnimationFrame restoration paths were replaced by this single lifecycle transaction. Deferred refresh helpers skip empty trigger sets. The original chapter timelines, gallery ownership and normal-motion interpolation remain active.

The causal desktop trace is reproducible with the diagnostic script in the artifact folder. `reading-lifecycle-before.json` changes only the isolated browser response back to the old CSS; `reading-lifecycle-fixed.json` records the corrected CSS. The repository is not reverted for that comparison.

The focused final check passed in Chromium and WebKit: gallery top `110.421875` remained unchanged in desktop normal/reduced/normal views (`9940 -> 3600 -> 9940` in Chromium), and the same Interiors view survived desktop/mobile/desktop. Mobile gallery top and scroll remained exact in both preference directions. See `continuity-final/report.json` and its twenty fresh PNGs.

### Investment title before the photographs

The baseline at story progress `.43` was entirely navy after the outgoing copy disappeared and before the collage entered. The author frames show a stationary central title already present before the photographs arrive.

The investment-only handoff now reveals that title at `.305`, when the last outgoing item has finished fading. The secondary panel does not slide the title offscreen. Photograph geometry and the existing staggered assembly at `.56+` are retained. The selected view, `aria-pressed`, inert state and accessible subtree change at the same handoff. The regression suite now samples `.43`, observes a continuous handoff for blank frames, simultaneous old/new foreground and title movement, and asserts the foreground/accessibility state again at the completed collage `.92`. Both engines pass; the title remains stationary and visible around the assembled photographs.

### Failed gallery photograph

With the second image deliberately blocked, the baseline's repeated Next requests remained on image 1. Its next-image preview also displayed a broken image. The requested cursor was being reset to the displayed cursor after decode failure.

The request cursor now advances independently while the visible photograph and counter commit only after a successful decode. A failed preview retains the current decoded photograph. Both engines now show the sequence `1 -> failed 2 keeps 1 -> Next reaches 3 -> Previous retries restored 2`, with a valid preview throughout. See `gallery-error-before/report.json` and `gallery-error-after/report.json`; these deliberate failures are isolated from the ordinary asset-health checks.

### Legal-sheet close controls

The integration owner's fresh native-wheel comparison confirmed that the published short-landscape privacy and terms sheets let their absolute close controls move upward with the scrolled content. The privacy close moved from top 35 to 3 and was partly clipped by the centered dialog.

The corrected small-sheet close is sticky, with margins compensating for the original padding. Its circle and SVG stay fully visible without shifting the title or body copy. Full-screen Six sheets already used a fixed opaque close; that behavior is retained. The final native test passed all 16 cases across Chromium and WebKit at 320x740 and 844x390, covering menu, enquiry, privacy and terms. Reopening the enquiry returned to scrollTop 0 while retaining the entered name; page errors and API requests were zero.

Evidence is in `root-dialog-before-public/report.json`, `root-dialog-after/report.json` and the selected durable legal-sheet screenshot. Chromium used mobile layout and touch-tap Close. Because Playwright does not implement mouse wheel for mobile WebKit, that engine used a desktop context at the same narrow viewport for the native-wheel check; the separate visual audit covers mobile WebKit rendering. An initial native-close check observed the immediate `open` removal before the queued application close event; the retained harness trace is distinguished from the final assertion which waits for scroll-lock cleanup.

## Audit harness corrections

The first extended interaction run selected the desktop next-image preview on mobile, where that preview is intentionally hidden; it now chooses a visible next control. The same run unconditionally centered an already visible button in the pinned Layouts chapter. Its extra `scrollIntoView` changed scrollY from 7870 to 7531, scrubbing the scene back into its entrance and hiding the target. The helper now checks the actual viewport rectangle and hit target first, and only scrolls when the control is not reachable. These are test corrections, with no forced click or application scroll workaround.

The original failed report is retained in `interactions-first-final`. The already completed 320px and short-landscape profiles were retained; the two interrupted 1440/390 profiles were rerun to completion. `interactions-final/report.json` explicitly records both contributing runs. Geometry, focus, image ratios and close hit-testing assertions were not relaxed. Native browser-chrome focus is distinguished from background-document focus using `document.hasFocus()` while the dialog remains open.

The footer capture now scrolls to the finite document end and asserts arrival. Using an excessively large numeric scroll coordinate can normalize to the top in a browser; the application is not changed to accommodate that harness behavior.

## Fresh evidence and commands

The first Chromium baseline contains 91 screenshots: 51 desktop and 40 mobile, including all source states, boundaries and real navigation landings. Its original `pass` field described capture completion; its recorded `continuity.preservesSection:false` is the product failure described above. The current harness makes continuity part of the strict overall result.

The cloud validation runtime uses Node 24, Playwright 1.58.2, Chromium 145 and WebKit 26. One engine/context is run at a time. The owned Astro server uses `--ignore-lock`; a supplied external base URL is never stopped by a test.

```sh
npm run check
npm run build
python -m http.server 14326 --bind 127.0.0.1 --directory .vercel/output/static
VISUAL_BASE_URL=http://127.0.0.1:14326 VISUAL_PHASE=after VISUAL_ENGINES=chromium,webkit node scripts/visual-audit.mjs
VISUAL_BASE_URL=http://127.0.0.1:14326 node scripts/interaction-audit.mjs
VISUAL_BASE_URL=http://127.0.0.1:14326 node scripts/gallery-error-qa.mjs
MOTION_QA_BASE_URL=http://127.0.0.1:14326 node scripts/motion-qa.mjs
BROWSER_QA_BASE_URL=http://127.0.0.1:14326 node scripts/browser-qa.mjs
BASE_URL=http://127.0.0.1:14326 PLAYWRIGHT_PATH="$PLAYWRIGHT_MODULE" node scripts/dialog-close-qa.mjs
```

`PLAYWRIGHT_MODULE` and `PLAYWRIGHT_BROWSERS_PATH` select the isolated runtime. `VISUAL_WIDTHS`, `VISUAL_ENGINES`, `INTERACTION_WIDTHS` and `INTERACTION_ENGINES` allow a bounded reproduction without weakening any assertions. The intended viewport set is 1440x900, 1920x1080, 1024x900, 768x1024, 390x844, 320x800 and 844x390; exact completed coverage is recorded in the final result table below.

## Final continuation result

All planned local gates passed. The product source is frozen for release handoff. The compact durable [results.json](verification/design-2026-11-01/results.json) records source hashes, exact viewport coverage, reading-position observations, continuous handoff measurements, native-close geometry and screenshot hashes.

| Gate | Fresh result |
| --- | --- |
| All source chapters, boundaries and actual navigation | 382 screenshots: Chromium at 1440x900, 1920x1080, 1024x900, 768x1024, 390x844, 320x800, 844x390; WebKit at 1440x900 and 390x844. No page errors, failed original assets, unexpected API requests or remaining text arrows. |
| Complete interaction states | 111 captures: 47 at 1440, 37 at 390, 13 at 320, 14 at 844x390. All four profiles pass dialog bounds, close hit tests, vector controls, focus/locks, both units/plans, gallery, map/wellbeing viewers and mocked form flows. |
| Existing full motion regression | Chromium 15/15 and WebKit 15/15, 53.1s total. Includes the continuous investment handoff and final collage title state. |
| Reading continuity | Both preference directions and desktop/mobile/desktop retain the selected Interiors state. Desktop gallery top stays at 110.421875; mobile preference changes retain their exact reading position. Short-landscape continuity also passes. |
| Failed gallery request | Both engines pass retention of decoded frame, progress past failed image 2, restored-image retry and valid preview. |
| Native close | 16/16 cases across both engines and 320x740 / 844x390; menu, enquiry, privacy, terms, reopen data retention and released locks. |
| Existing browser suite | Four widths (1440/768/390/320), ten interaction/structure groups; no page errors, missing original assets or metric overflow. |
| TypeScript and production build | Both exit 0. The tested production HTML SHA256 exactly matches the integration owner's final build record. No product source changed after that build. |
| Source arrow scan | 44 source/SVG files with HTML entities decoded, zero matches; runtime generated text and pseudo-elements also zero. |

The main final execution session is 73205 (remaining interactions, complete visual matrix, existing browser), exit 0. The strengthened motion execution is 14822, exit 0. Focused continuity and failed-image recovery are sessions 84128 and 25570, both exit 0. The integration owner's type/build and native close evidence is retained in `root-check-build.json` and `root-dialog-after/report.json`.

All final contact sheets were inspected, with selected and suspicious frames also opened at full resolution. A second reviewer independently inspected the 51 Chromium desktop section/state/navigation frames and all 47 desktop interaction frames. Intentional `.43` wipe frames and scrolled section boundaries are labeled separately from settled reading frames.

Selected settled views:

- [Original sunrise hero](verification/design-2026-11-01/hero-desktop-1440.jpg)
- [Investment title at progress .43](verification/design-2026-11-01/investment-title-043.png)
- [Mobile gallery and SVG controls](verification/design-2026-11-01/gallery-mobile-390.png)
- [Mobile residence and plan controls](verification/design-2026-11-01/residence-mobile-390.png)
- [Mobile enquiry](verification/design-2026-11-01/enquiry-mobile-390.png)
- [Native short-landscape legal close](verification/design-2026-11-01/close-landscape-844.png)

The large original capture sets and before/after traces remain under the artifact paths above. Local servers and owned browser processes were stopped after the gates. No commit, push or deployment was performed by this audit owner.

These local headless checks establish rendering and interaction behavior on this runtime. They do not claim physical-device FPS, Safari browser-chrome behavior or network performance. Full-resolution captures are inspected in addition to contact sheets. Publication commits, READY deployments and live acceptance are recorded by the integration owner in [the shared release record](https://github.com/IMONsergey/LuxuryRealty/blob/main/docs/MOTION-RELEASE-2026-11-01.md).
