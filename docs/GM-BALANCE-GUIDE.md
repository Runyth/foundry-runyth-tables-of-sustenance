# runyth-tables-of-sustenance-1.1.1

## GM Balance Guide

The balance model is unchanged from the original cuisine library. What changed in 1.1.0 is representation: mechanical rules are now expressed as neutral effect intents and implemented by adapters.

| Tier | Role |
|---|---|
| 1 | Narrative sustenance; no mechanical intent |
| 2 | Tiny, situational, short-lived benefits |
| 3 | Small but meaningful bounded temporary benefits |
| 4 | Strong temporary benefits with anti-spam restrictions |
| S | Tiny permanent legendary rewards with duplicate protection |

### Intent audit

| Intent kind | Occurrences |
|---|---:|
| `check-bonus` | 126 |
| `concentration-test-bonus` | 1 |
| `contextual-check-bonus` | 2 |
| `contextual-resistance-test-bonus` | 5 |
| `damage-resistance` | 5 |
| `ignore-difficult-terrain` | 1 |
| `maximum-vitality-bonus` | 2 |
| `movement-speed-bonus` | 3 |
| `movement-speed-match` | 1 |
| `resistance-test-bonus` | 14 |
| `rest-recovery-bonus` | 1 |

When reviewing a system adapter, audit the adapter's mapping—not the core—for concrete actor/effect data paths. A valid adapter must preserve durations, stacking groups, cooldowns and stable benefit identity rather than widening an intent into a stronger rule.
