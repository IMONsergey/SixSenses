# Six Senses Residences Dubai Marina

A faithful, responsive implementation of the supplied Six Senses Figma design, built with Astro 7, TypeScript and GSAP. The site is statically prerendered; `/api/enquiry` is a Vercel server endpoint using private Vercel Blob storage.

## Run

Requires Node 24.x. Dependencies are pinned and the lockfile is included with the application.

```sh
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run dev
ASTRO_TELEMETRY_DISABLED=1 npm run build
npm run check
npm test
```

Use `.env.example` for the local API configuration. Production needs the Vercel Blob token configured on its Vercel project. A failed or unavailable storage backend produces an honest error; entered values are retained and a retry uses the same submission ID.

## Design structure

Source Figma file: https://www.figma.com/design/m3N3lJCoutaziEm4nt4CwO?node-id=1-349

Prepared desktop reference: https://www.figma.com/design/m3N3lJCoutaziEm4nt4CwO?node-id=2047-5664

The site contains **eight semantic chapters**: Introduction, About, Location, Layouts, Interiors, Wellbeing, Investment and Contact. On desktop with motion enabled, seven chapters pin their visual stage and transition between their original Figma states as the visitor scrolls. They are not implemented as fifteen unrelated full-page sections. Each chapter also has direct view controls. Navigation to a functional destination, such as layouts or the map, reveals its detailed state.

The mobile composition reflows the same content into readable blocks, image compositions and a two-card layout rail. Reduced motion removes pinning, scrub transitions and the optional intro; the chapter view controls still expose all desktop states. Native scrolling, keyboard focus and Escape remain available throughout.

## Original assets and typography

- Original FoglihtenNo06, Graphik LCG, SF UI Display and Inter fonts are hosted locally.
- Photographs and floor-plan images come from the original Figma layers. The hero uses an isolated original photo-layer export, verified to contain only the photograph, replacing the low-resolution contextual thumbnail.
- `source-manifest.json` records source nodes, checksums, dimensions and optimized files. Responsive WebP derivatives preserve the original artwork; logos and floor plans use lossless encoding. The original vector ornaments and SVG dimensions are preserved.
- The implementation uses real semantic text, separate photographs and vector assets. It does not use screenshots of interface frames as pages or sections, and no temporary Figma URLs remain in runtime code.
- Approximately 14.3 MB of optimized local assets replace approximately 137.5 MB of source exports. Original source PNG exports are not shipped in the repository.

## Implemented scenarios

- Brief optional intro, fixed chapter navigation, mobile menu, scroll progress and original source-state transitions.
- Two unique layout types: Unit 01 | Triplex A and Unit 02 | Duplex B1. The repeated source cards are represented as a responsive two-card rail, not duplicated inventory.
- Both residence detail views preserve their source bedroom counts, levels and area tables. Plans show all supplied levels and building orientations, with full-size viewing, zoom and pan by buttons, keyboard, wheel, drag or pinch.
- Four original interior photographs can be viewed with arrows, keyboard, swipe and full-size zoom.
- The original location map and wellbeing photographs can be enlarged separately.
- Contextual enquiries from layouts, document requests and other calls to action, plus the inline contact form.
- Native first-name, last-name, email, telephone, country and message fields; consent validation; a country selector with an additional-country field; nested terms/privacy; pending, field error, network/storage failure, retry and confirmed-success states.
- Form submissions use the shared `/api/enquiry` contract with `project: 'six-senses'`, a preserved idempotency key and the selected residence/document context. Personal details are not stored in browser storage.

## Content boundaries

The supplied floor-plan values and category descriptions are retained as project overview material. Unsupported price, annual appreciation and rental-yield claims have been replaced with requests for current terms; the original visual composition is preserved. This is not a live inventory or reservation system. The page offers a request for current availability, prices, specifications and investment terms. No additional units, prices, amenities or availability have been invented.

The source names four wellbeing levels but supplies two unique descriptions. The site presents those two documented experiences rather than inventing the other levels. An accidental repeated clause in the Interaction paragraph is removed without adding a new claim.

The floor-plan, payment-plan and promotional PDF files were not supplied. Their controls clearly request the respective document through the real enquiry form; there is no fake download or file-size claim.

Submitted enquiries are stored privately for the website owner. The privacy notice does not claim direct transmission to the property developer or third-party agents.

## Verification

The checks below describe the recovered source baseline. The final form corrections require a fresh server build and browser run before publication. Run `node scripts/browser-qa.mjs` through the server queue; results are written to `artifacts/browser-qa.json`.

- Production Vercel adapter build and TypeScript check passed.
- Five shared endpoint tests passed, covering validation, consent, bot/origin/body checks, private-storage failures, idempotency and response privacy.
- Real Chromium verified all eight chapters at 1440, 1024, 768, 390 and 320px, including hero glyph boundaries and horizontal overflow.
- Motion-enabled checks verified the pinned stage, its state transition and functional navigation to the residence cards. Reduced-motion checks verified readable content and direct state controls.
- Interaction checks covered both unit details, source values, plan zoom/pan/Escape, the interior carousel, map zoom, mobile navigation and card rail.
- Browser form tests use mocked error/success responses and verify that validation prevents requests, errors preserve values, retry preserves submission ID and start time, and success appears only after an `ok` response. No real lead was sent by those UI tests.
- No browser JavaScript errors occurred in the checked scenarios. Original fonts and visible local assets loaded successfully.
- Visual QA screenshots and the local browser report are in the ignored `artifacts/qa` directory.
