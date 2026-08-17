---
name: aiux-playground
description: Comprehensive AI UX and interface design principles from AI UX Playground (aiuxplayground.com). Use when designing AI agent interfaces, copilot UIs, streaming indicators, generative components, and high-craft web experiences.
---

# AI UX Playground Design Reference

Official design engineering guidelines and UX patterns from [AI UX Playground](https://aiuxplayground.com).

## 1. Agentic & AI Interface Patterns
- **Streaming & Thought States**: Provide smooth streaming responses with clear, non-distracting loading indicators (e.g. subtle pulsing orbs, progressive text rendering).
- **Human-in-the-Loop & Trust Signals**: Clearly indicate when an action is executed autonomously vs requiring user confirmation (e.g. destructive edits, deletions, merges).
- **Context Awareness**: Surface relevant context chips, active filters, and session parameters without cluttering the main interaction canvas.

## 2. Micro-Interactions & Feel
- **Tactile Feedback**: Interactive elements should react instantly on hover and press (`active:scale-[0.98]`).
- **Smooth Page Transitions**: Stagger card lists and data rows with 30-50ms delays.
- **Concentric Radii**: Ensure nested container corners follow `outer_radius = inner_radius + padding`.

## 3. High-Quality Web Craft
- **No Generic AI Slop**: Avoid clichéd purple gradients on dark backgrounds, unstyled generic fonts, or icon-stuffed bento boxes.
- **Purposeful Palette**: Use curated semantic colors (OKLCH/HSL) with clear visual hierarchy between primary, secondary, and muted elements.
