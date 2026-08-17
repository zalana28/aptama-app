---
name: better-colors
description: OKLCH color space and color usage for web projects. Convert hex/rgb/hsl to oklch, generate palettes, check contrast, handle gamut boundaries, and apply color with meaning.
---

# OKLCH Colors & Systematic Web Palettes

OKLCH is a perceptually uniform color space where lightness, chroma, and hue are useful design controls. Use it when creating a new color system or when the user asks for conversion, theming, or palette work.

## Core Principles

### 1. Use a Perceptual Color Space
- **Perceptual uniformity**: Equal Lightness steps = equal perceived brightness. `oklch(0.5 ...)` is visually mid.
- **Stable hue**: OKLCH hue stays constant across the full lightness range, avoiding muddy tint shifts.
- **Independent chroma**: Chroma is an absolute measure of colorfulness that doesn't depend on lightness.

### 2. Semantic Tokens Architecture
Always map colors to semantic roles rather than raw values:
- `bg-surface`, `bg-canvas`, `bg-subtle`
- `text-primary`, `text-secondary`, `text-muted`
- `border-subtle`, `border-strong`
- `accent-primary`, `accent-hover`
- `status-success`, `status-warning`, `status-danger`

### 3. Accessible Contrast (WCAG & APCA)
- Body text requires at least 4.5:1 contrast against its background.
- Large text (headings 18pt+) requires at least 3:1 contrast.
- Interactive controls and focus indicators must be clearly distinguishable.
