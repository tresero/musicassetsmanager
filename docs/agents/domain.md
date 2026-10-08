# Domain Docs

How the engineering skills should use this repo's domain documentation.

## Before exploring, read these

- **`docs/modeling.md`**: the domain model and schema conventions. Read it before changing the schema or naming a domain concept.
- **`docs/standards.md`**: identifiers (UPC, ISRC, ISWC, IPI, ISNI), DDEX codes and export formats. Read it before touching identifiers or exports.
- **"Domain rules" in `AGENTS.md`**.

This repo has no `GLOSSARY.md` and no `docs/adr/`. Don't create them. When a term or decision is settled, including through `/domain-modeling`, record it in whichever of `docs/modeling.md` or `docs/standards.md` covers it, and add a row to that file's Revision History.

## Use the docs' vocabulary

When your output names a domain concept (an issue title, a refactor proposal, a test name), use the term these docs use. Don't swap in synonyms.

If the concept isn't in the docs yet, either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag conflicts

If your output contradicts `docs/modeling.md` or `docs/standards.md`, say so explicitly rather than overriding them silently.

## Revision History

| Date | Revision |
|---|---|
| 2026-10-08 | Initial version |
