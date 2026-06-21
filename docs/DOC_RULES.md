# Documentation Rules

Short rules for contributors and agents. Read this before writing docs or code.

## Source of truth hierarchy

| Question | Read |
|----------|------|
| How do I build X? | [BUILD.md](BUILD.md) + active `modules/NN_*.md` |
| How is the system shaped? | [ARCHITECTURE.md](ARCHITECTURE.md) |
| What's broken or deferred? | [KNOWN_GAPS.md](KNOWN_GAPS.md) |
| What phase are we in? | [ROADMAP.md](ROADMAP.md) |
| How are metrics calculated? | [METHODOLOGY.md](METHODOLOGY.md) |
| How do I run tests / fix incidents? | [RUNBOOKS.md](RUNBOOKS.md) |

## Conflict resolution

When two docs disagree, use the authoritative source — not the most recently edited file.

| Question | Authoritative source | Non-authoritative (inform only) |
|----------|---------------------|----------------------------------|
| What phase are we in / what's next? | [ROADMAP.md](ROADMAP.md) | [sessions/HANDOFF_NOTE.md](sessions/HANDOFF_NOTE.md) |
| What's broken or deferred? | [KNOWN_GAPS.md](KNOWN_GAPS.md) | Stale notes in [ARCHITECTURE.md](ARCHITECTURE.md) |
| What endpoints/features exist? | [BUILD.md](BUILD.md) + active `modules/NN_*.md` | [REFACTOR_CHECKLIST.md](REFACTOR_CHECKLIST.md) scope tables |
| How is it built? | [ARCHITECTURE.md](ARCHITECTURE.md), [METHODOLOGY.md](METHODOLOGY.md) | Session notes, refactor checklists |

Historical records ([REFACTOR_CHECKLIST.md](REFACTOR_CHECKLIST.md), [sessions/PERFORMANCE_BASELINE.md](sessions/PERFORMANCE_BASELINE.md)) document past work; they do not override ROADMAP or BUILD for current status.

## When to create a new doc

- **New build step** → one file in `docs/modules/` only (e.g. `12_INVESTMENT_PROFILER.md`).
- **Session notes** → append to [sessions/HANDOFF_NOTE.md](sessions/HANDOFF_NOTE.md).
- **Reference data** → `docs/reference/` (e.g. FRED series list).

Do **not** create parallel build guides, vision docs, or duplicate API references outside [BUILD.md](BUILD.md).

## Definition of done (docs)

When shipping a feature:

1. Update the active module doc (Goal, files, API, verify steps).
2. Add API rows to [BUILD.md](BUILD.md) if endpoints changed.
3. Update [KNOWN_GAPS.md](KNOWN_GAPS.md) if a gap was fixed or discovered.
4. Update [ARCHITECTURE.md](ARCHITECTURE.md) only if system boundaries changed.
5. Append a short entry to [sessions/HANDOFF_NOTE.md](sessions/HANDOFF_NOTE.md) with one next priority.

## Agent startup checklist

1. Read [README.md](README.md) (this folder).
2. Read this file.
3. Open [BUILD.md](BUILD.md) and identify the current module.
4. Read that module file before editing code.

## Anti-patterns

- Updating six docs for one small feature.
- Leaving stale "known risks" in ARCHITECTURE after fixes land.
- Putting structural guides in session handoff files.
- Creating `BUILD_EXPANSION.md` or similar parallel indexes.
