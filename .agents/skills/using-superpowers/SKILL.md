---
name: using-superpowers
description: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions
---

# Using Superpowers

If you think there is even a 1% chance a skill might apply to what you are doing, invoke the skill.

## The Rule

**Invoke relevant or requested skills BEFORE any response or action** — including clarifying questions, exploring the codebase, or checking files.

- **Before entering plan mode:** if you haven't already brainstormed, invoke the `brainstorming` skill first.
- Announce "Using [skill] to [purpose]" and follow the skill exactly.

## Skill Priority

When multiple skills apply, process skills come first:
- "Let's build X" → `brainstorming` first, then implementation skills (`frontend-design`, etc.).
- "Fix this bug" → `systematic-debugging` first, then domain-specific implementation.
- "Implement code" → `test-driven-development` first before writing production code.
