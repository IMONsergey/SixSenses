# Six Senses final source

Recovered original copied from `/workspace/scratch/6ba048c62957/sites/SixSenses`; original and recovery folders preserved.

- Eight chapters and all original alternate scenes retained, including four gallery photographs, wellbeing cards, both residence details and all 56 optimized assets.
- Modal and inline forms preserve an unchanged submission UUID across retries and modal reopening. Editing a submitted payload creates a new UUID on the next attempt. Completed forms start a new enquiry on reopening. Pending requests block duplicate submission and temporarily freeze controls.
- Unsupported AED 5.8 ML, annual 20% appreciation and 7% rental-yield promises removed while retaining the original block geometry.
- The common enquiry backend and tests are integrated. Current server validation is recorded below.
- The initial server browser QA used port 4314 and the server Playwright installation. The fresh visual continuation below adds portable runtime/base URL overrides. API responses are mocked; no real lead is created.

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

### Subsequent publication confirmation

The release owner confirmed motion UI commit `c326bef95c37fa22e702302756ef7939bfcf94e6` in READY deployment `dpl_B8dyhkonisHH5CmXGSQyAvkUuFLD`. This supersedes the original handoff, which had completed the source implementation and listed server checks but had not yet confirmed publication.

The authoritative record for final commits, deployments and live acceptance across all five sites is [MOTION-RELEASE-2026-11-01.md](https://github.com/IMONsergey/LuxuryRealty/blob/main/docs/MOTION-RELEASE-2026-11-01.md). The server QA evidence and diagnostic limits above remain unchanged. Production loading comparisons are separate from that evidence; this documentation-only publication-status correction adds no new test or performance result.


## Fresh visual and interaction continuation, 2026-11-01 v2

A new audit started from published source 1b6be6c. It captured all seven two-state chapters plus Contact/footer, actual native navigation, modal states and every requested responsive size. The fresh deep-gallery reproduction exposed reading-position loss beyond the earlier motion suite's contact checks. The final matchMedia transaction preserves the selected source chapter/view before teardown and after refresh; cached pre-resize geometry also survives document clamping. Zero-duration reduced transitions avoid a transient old chapter height during that restore. Original story timelines remain active.

Text arrows and close/plus/minus glyphs now use decorative SVG. The investment title leads the photographs at progress .305, matching the independently inspected author clip, and stays visible throughout assembly. Failed gallery requests keep the last decoded frame and preview while allowing Next to reach the following photograph and Previous to retry. Sticky legal close controls preserve their original position and remain reachable during native scrolling.

Final local acceptance: 382 section/state/navigation captures across seven Chromium sizes and desktop/mobile WebKit; 111 interaction captures across four sizes; full motion 15/15 in both engines (53.1s); native close 16/16; both-engine reading continuity and failed-image recovery; existing four-width/ten-group browser suite; final TypeScript and production build exit 0. No page errors, unexpected enquiry attempts, failed original assets or text arrows remain in the audited states. All enquiry requests were blocked or mocked.

The complete final source, scope, findings, harness distinctions and limits are documented in docs/VISUAL-AUDIT-2026-11-01.md. Six selected screenshots and source-hashed compact results are commit-ready under docs/verification/design-2026-11-01/. Execution sessions 14822 (strengthened motion) and 73205 (final interactions, all-section visual matrix and base browser) both exited 0. The integration owner's final build HTML hash matches the tested static output. Product source did not change after that build; own servers and browsers are stopped.

This completes the local release handoff. No commit, push or deployment was performed by this audit owner. Publication and live acceptance are maintained in the shared MOTION-RELEASE-2026-11-01.md record linked above.
