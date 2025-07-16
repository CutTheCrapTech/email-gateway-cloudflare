# CSS System Documentation

## Overview

The Email Alias Extensions project uses a modular CSS architecture designed for maintainability, scalability, and consistency across different components. The CSS system is organized into focused modules that can be imported individually or as a complete system.

## Architecture

### File Organization

```
packages/browser-extensions/extensions/public/css/
├── main.css          # Main entry point that imports all modules
├── variables.css     # CSS custom properties and design tokens
├── base.css          # Typography, reset, and fundamental styles
├── layout.css        # Grid, flexbox utilities, and responsive design
├── forms.css         # Form elements and validation states
├── buttons.css       # Button variants and interactions
├── components.css    # Reusable UI components
└── popup.css         # Extension popup specific styles
```

### Import Strategy

The system uses CSS `@import` statements for modular loading:

```css
/* main.css - imports all modules in dependency order */
@import url("./variables.css");
@import url("./base.css");
@import url("./layout.css");
@import url("./forms.css");
@import url("./buttons.css");
@import url("./components.css");
@import url("./popup.css");
```

## Design System

### Color Palette

The color system uses CSS custom properties for theming and supports automatic dark/light mode switching:

```css
:root {
  /* --- Light Theme (Default) --- */
  --background-body: #f8f9fa;
  --background-card: #ffffff;
  --background-input: #ffffff;
  --background-success: #d4edda;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --text-heading: #343a40;
  --text-success: #155724;
  --text-error: #dc3545;
  --border-color: #dee2e6;
  --border-focus: #86b7fe;
  --border-success: #c3e6cb;
  --button-primary: #0d6efd;
  --button-primary-hover: #0b5ed7;
  --button-danger: #dc3545;
  --button-danger-hover: #bb2d3b;
  --button-secondary: #6c757d;
  --button-secondary-hover: #5c636a;
  --button-disabled: #e9ecef;
  --text-disabled: #adb5bd;
  --shadow: rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  /* --- Dark Theme Overrides --- */
  :root {
    --background-body: #1a1d23;
    --background-card: #2d3748;
    --background-input: #374151;
    --background-success: #065f46;
    --text-primary: #f7fafc;
    --text-secondary: #a0aec0;
    --text-heading: #e2e8f0;
    --text-success: #6ee7b7;
    --text-error: #f87171;
    --border-color: #4a5568;
    --border-focus: #63b3ed;
    --border-success: #059669;
    --button-primary: #3182ce;
    --button-primary-hover: #2c5aa0;
    --button-danger: #e53e3e;
    --button-danger-hover: #c53030;
    --button-secondary: #718096;
    --button-secondary-hover: #4a5568;
    --button-disabled: #4a5568;
    --text-disabled: #718096;
    --shadow: rgba(0, 0, 0, 0.3);
  }
}
```

### Typography Scale

```css
h1 { font-size: 1.3rem; font-weight: 600; }
h2 { font-size: 1.5rem; font-weight: 600; }
h3 { font-size: 1.2rem; font-weight: 600; }
body { font-size: 1rem; line-height: 1.4; }
```

### Spacing System

A comprehensive spacing system with margin and padding utilities is available in `layout.css`.

## Component System

### Button Components

```css
/* Base button */
button {
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Button variants */
.btn-primary {
  background-color: var(--button-primary);
  color: white;
}

.btn-secondary {
  background-color: var(--button-secondary);
  color: white;
}

.btn-danger {
  background-color: var(--button-danger);
  color: white;
}

/* Button sizes */
.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}
```

### Form Components

```css
/* Form groups */
.form-group {
  margin-bottom: 1rem;
}

/* Input fields */
input[type="text"],
input[type="password"],
input[type="email"] {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.9rem;
  background-color: var(--background-input);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
}

input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
}

/* Validation states */
.form-group.error input {
  border-color: var(--text-error);
}

.form-group.success input {
  border-color: var(--border-success);
}
```

### Layout Components

`layout.css` provides a responsive grid system, flexbox utilities, and spacing helpers.

## Best Practices

### 1. CSS Custom Properties Usage

Always use the semantic custom properties defined in `variables.css` for colors, fonts, and other design tokens.

### 2. Component Isolation

Keep component-specific styles within their respective files (e.g., `popup.css`). Avoid overly generic selectors that could cause conflicts.

### 3. Responsive Design

Use a mobile-first approach. Define base styles for mobile and use `min-width` media queries to add or adjust styles for larger screens.

## Integration

The CSS is bundled into `style.css` which is included in `popup.html` and `options.html`. No special integration is needed for new components as long as they are imported into `main.css`.

## Maintenance

### Adding New Components

1.  Create a new CSS file for your component.
2.  Add an `@import` rule for your new file in `main.css`.
3.  Use existing variables and utility classes where possible.

### Updating Design Tokens

All design tokens (colors, fonts, etc.) are located in `variables.css`. Update the values in this file to apply changes globally.