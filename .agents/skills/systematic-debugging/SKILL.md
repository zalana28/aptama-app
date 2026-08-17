---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

## The Iron Law
```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

## The 4 Phases

### Phase 1: Root Cause Investigation
1. **Read Error Messages Carefully**: Read full stack traces, line numbers, and error codes.
2. **Reproduce Consistently**: Determine exact steps and conditions to trigger the failure.
3. **Trace the Data Flow**: Follow inputs from origin to failure point.

### Phase 2: Hypothesis & Isolation
1. Form a specific hypothesis for why the failure occurs.
2. Verify hypothesis with targeted logs or isolated tests.

### Phase 3: Minimal, Complete Fix
1. Apply the simplest fix that directly addresses the root cause.
2. Ensure no regressions in related flows.

### Phase 4: Verification
1. Verify the reproduction case now passes.
2. Run full test suite to ensure overall stability.
