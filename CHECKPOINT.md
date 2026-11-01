# Six Senses final source

Recovered original copied from `/workspace/scratch/6ba048c62957/sites/SixSenses`; original and recovery folders preserved.

- Eight chapters and all original alternate scenes retained, including four gallery photographs, wellbeing cards, both residence details and all 56 optimized assets.
- Modal and inline forms preserve an unchanged submission UUID across retries and modal reopening. Editing a submitted payload creates a new UUID on the next attempt. Completed forms start a new enquiry on reopening. Pending requests block duplicate submission and temporarily freeze controls.
- Unsupported AED 5.8 ML, annual 20% appreciation and 7% rental-yield promises removed while retaining the original block geometry.
- The common enquiry backend and tests are integrated. Current server validation is recorded below.
- Browser QA uses port 4314 and the server Playwright installation. Its API responses are mocked; no real lead is created.

## Publication verification, 2026-11-01

Recovered original design source and optimized assets preserved. Fresh npm install, production build, type checks, five enquiry API tests, and browser interaction checks passed on the authorized server. Private enquiry storage is configured on the Vercel project. Production HTTP and storage verification is recorded separately after deployment.

## Motion polish verified on the server, 2026-11-01

Dprofile case 105141 was inspected as thirteen source clips shared with the ORLA case; Six Senses uses clips 9-13. The desktop chapter sequence hands off an opaque background before foreground entry, with no full-page text crossfade. Architecture pans from crown to base; the investment photographs assemble around the fixed heading. About now reaches full foreground opacity before its reading target at progress `.76`, holds through `.80`, then fades as the photograph pans. Short/coarse-pointer layouts use natural flow; changing viewport or reduced motion preserves the active section. Media interactions use decode-before-switch, latest-request handling, bounded zoom/pinch geometry and explicit dialog focus origin. Responsive source mapping and native srcset support are included; gallery, zoom and plan sources remain original.

The skip link focuses `main` and the next Tab enters its content. The closed zoom viewer has no initial image source, deferring its plan request until needed. Dialog regression checks wait for application cleanup after the native close lifecycle, including both scroll locks and the remaining open-dialog set.

| Verification | Server job | Confirmed result |
| --- | --- | --- |
| Common browser suite | `20261101T124919-e3044c77a5` | All five projects passed, including Six Senses and the corrected contained-image pan assertions. |
| Final build and TypeScript check | `20261101T125857-7ad2849f24` | Passed with the latest About timing, skip-link and deferred viewer source changes. |
| Enhanced normal-motion QA | `20261101T130704-34b4912f4d` | Chromium and WebKit: 14 checks each, all passed; 60.1 seconds total; no recorded page errors, asset HTTP failures or API requests. |

The integration owner reviewed the latest WebKit About reading and investment collage screenshots. About text was fully visible and the collage composition was accepted. Automated coverage, commands and diagnostic performance limits are in `docs/MOTION-QA.md`; additional manual gesture scenarios are separately identified in `docs/MEDIA-QA-2026-11-01.md`.

Source implementation and the listed server checks are complete. Deployment of this polish and production loading comparisons are recorded separately; this checkpoint does not claim that the polish has been published.
