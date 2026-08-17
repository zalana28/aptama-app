---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development (TDD)

## The Iron Law
```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write the test first. Watch it fail. Write minimal code to pass.

## Red-Green-Refactor Cycle
1. **RED**: Write a failing test that clearly defines the desired behavior.
2. **VERIFY RED**: Run test and confirm it fails for the expected reason.
3. **GREEN**: Write minimal implementation code to make the test pass.
4. **VERIFY GREEN**: Confirm all tests pass.
5. **REFACTOR**: Clean up and optimize without altering behavior.
