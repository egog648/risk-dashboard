# Documentation — Start Here

Single entry point for all project documentation.

## Reading paths

| Goal | Read in order |
|------|---------------|
| **Run the app** | [../README.md](../README.md) → [BUILD.md](BUILD.md) Part 1 → [RUNBOOKS.md](RUNBOOKS.md) |
| **Build the next feature** | [DOC_RULES.md](DOC_RULES.md) → [BUILD.md](BUILD.md) (find current module) → `modules/NN_*.md` |
| **Understand the system** | [ARCHITECTURE.md](ARCHITECTURE.md) → [METHODOLOGY.md](METHODOLOGY.md) → [KNOWN_GAPS.md](KNOWN_GAPS.md) |
| **Hand off to a new session** | [HANDOFF_CHECKLIST.md](HANDOFF_CHECKLIST.md) → latest note in [sessions/HANDOFF_NOTE.md](sessions/HANDOFF_NOTE.md) |

## Doc map

| File | Purpose | Update when |
|------|---------|-------------|
| [BUILD.md](BUILD.md) | Master build index (Phase 1 + Phase 2 modules, API reference) | New module, new endpoint, build steps change |
| [DOC_RULES.md](DOC_RULES.md) | Doc hierarchy and agent build rules | Doc workflow changes |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System boundaries, data flows, advisory practice overview | Structure or integration changes |
| [METHODOLOGY.md](METHODOLOGY.md) | Risk formulas, mapping rules | Calculation logic changes |
| [ROADMAP.md](ROADMAP.md) | Phase status and priorities | Phase completes or reprioritized |
| [KNOWN_GAPS.md](KNOWN_GAPS.md) | Confirmed limitations | Gap found or fixed |
| [RUNBOOKS.md](RUNBOOKS.md) | Ops incidents and test commands | Ops or test workflow changes |
| [HANDOFF_CHECKLIST.md](HANDOFF_CHECKLIST.md) | New-contributor bootstrap | Setup sequence changes |
| [reference/FRED_SERIES.md](reference/FRED_SERIES.md) | FRED series registry | New macro series added |
| [sessions/HANDOFF_NOTE.md](sessions/HANDOFF_NOTE.md) | Rolling session log | End of each work session |
| `modules/01–09` | Phase 1 build steps | Foundation feature work |
| `modules/10–17` | Phase 2 advisory expansion | Practice tool feature work |

## Build phases

- **Phase 1 (Modules 01–09):** Risk Dashboard foundation — macro data, asset classes, optimizer.
- **Phase 2 (Modules 10–17):** Finesse Funds advisory tools — branding, ticker registry, profiler, client workflow.

See [BUILD.md](BUILD.md) for the full module table.
