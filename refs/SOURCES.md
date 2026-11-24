# Research log

| Question | Source | Found | Decision |
| --- | --- | --- | --- |
| Exterior form | https://www.ebbandember.com/ (dock and side photos) | Float, black cabin, cedar roof deck, cable rail, flue, ladder, life ring | Modeled by hand |
| Interior | https://www.ebbandember.com/ (hero photo) | Cedar benches, stove with rocks, corner windows | Modeled by hand |
| Setting | https://www.ebbandember.com/ (deck photo) | Marina dock, floating homes, evergreens | Modeled by hand |
| Instagram | https://www.instagram.com/ebbandember/ | Login wall over most content | Used public grid only |
| Site layout | ebbandember.com: lounge deck, covered deck with kayaks, dock sign, cedar entry, blue-sky exterior, guests on deck | Pavilion, open deck, Downpour, L bench and fence | Modeled by hand |
| Site placement | Five user-supplied Instagram screenshots, kept locally | Pavilion behind sauna, Downpour on its end wall, L-bench lounge corner, string lights, homes across channel | Layout rebuilt to match |
| Models | None, authored-only | No third-party models | n/a |

---

# Sources

The research log for this build. One row per question, with the query actually
run and the decision. Written before the first mesh and updated as the build
finds out it was wrong.

## Shape

| Question | Searched | Found | Decision |
| --- | --- | --- | --- |
| what does a send-out look like, in order | yt: `sword shield send out slow motion` | `RoUJ_TWvB3g`, orb forms inside a white burst | matched; frames in `refs/sendout/` |

## Motion

| Question | Searched | Found | Decision |
| --- | --- | --- | --- |
| how long is the wind-up | yt: `<move> animation` stepped at 12 fps | 5 frames at 12 fps = 0.42 s | beat table: wind-up 0.42, contact 0.13, follow 0.35 |
| what does the hit reaction look like | yt: `pokemon take damage animation` | 0.9 s flinch, 1.7 s stagger for the big one | HURTS table |

## Assets

| Asset | Ladder step | Source / query | Licence | Decision |
| --- | --- | --- | --- | --- |
| hero creature rig | 2 (CC0) | poly.pizza `dragon`, quaternius.com characters | CC0 | nothing matched the silhouette, hand-built from `refs/sendout/` |
| backdrop HDRI | 3 (CC-BY) | polyhaven.com `studio` | CC0 | imported, credited |
| attack clips | 2 (CC0) | Quaternius Universal Animation Library | CC0 | retargeted, root motion stripped |

## Proof

| Beat | Capture | Compared against | Result |
| --- | --- | --- | --- |
| send-out | `shots/sendout/sheet.png` | `refs/sendout/sheet-01.png` | ball arcs, opens, creature exits at full size, ball returns |

## Rules

- Write the query, not just the result, so the next person can tell a dead end
  from an untried one.
- "Nothing found" is a real answer, but only with the search written next to it.
- Keep the reference sheets in `refs/<subject>/`; do not delete them after the
  build, because the next fix will need them.
- Anything imported gets a matching row in `CREDITS.md`.
