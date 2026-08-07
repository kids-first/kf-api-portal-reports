# `src/arranger/` — the post-arranger merge seam

Everything in this folder is functionality that **arranger normally provides** and
that this service currently derives or vendors for itself. It is deliberately
isolated so that, when this report engine is baked into
[`kf-api-arranger`](https://github.com/kids-first/kf-api-arranger) (post-arranger)
to shed a standalone service, **this whole folder is deleted** and its call sites
redirect to post-arranger's own equivalents.

Keep it self-contained: code elsewhere in `src/` may import _from_ here, but
nothing here should import report-specific code. That one-way dependency is what
makes the eventual move a delete-and-redirect rather than a refactor.

## Contents

| File | Replaces (legacy) | Post-arranger equivalent |
| --- | --- | --- |
| `deriveExtendedFromMapping.ts` | `getExtendedConfigs` reading the `arranger-projects-<projectId>` ES doc | `graphql/schema/deriveExtended.ts` + `fieldTree.ts` |

## Planned

- `sqon/` — clean-room SQON → ES query mechanics to drop the `@arranger/middleware`
  (`buildQuery`, deep `esToSafeJsInt`) dependency. Post-arranger equivalent:
  `src/sqon/`. Not started; must be diff-verified against `@arranger/middleware@2.16.1`
  before trust.
