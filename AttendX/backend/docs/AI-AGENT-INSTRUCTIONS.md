# Instructions for AI Agents (Claude Code, etc.)

## After Every Significant Change

Please do ALL of the following at the end of each session:

1. **Update `docs/changelog.md`**
   - Add a new entry under [Unreleased] with what changed.

2. **Create a session report** at `docs/sessions/YYYY-MM-DD-brief-title.md`
   - Use the template below.

3. **Update `docs/current-status.md`**
   - Reflect new working features, bugs fixed, pending issues.

4. **Update relevant feature docs** in `docs/features/` if a feature was changed.

5. **Create an ADR** in `docs/decisions/` if a major architecture decision was made.

---

## Session Report Template

```markdown
# Session: [Title]
Date: YYYY-MM-DD

## Objective
What was the goal of this session?

## Changes Made
- Change 1
- Change 2

## Files Changed
- path/to/file.ts
- path/to/other.ts

## Docker / Infrastructure Changes
- (if any)

## Risks
- (anything that could break)

## Next Steps
- What should happen next?
```
