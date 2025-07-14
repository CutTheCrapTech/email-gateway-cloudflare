# CSS System Documentation

## Overview

The Email Alias Extensions project uses a modular CSS architecture designed for maintainability, scalability, and consistency across different components. The CSS system is organized into focused modules that can be imported individually or as a complete system.

## Architecture

### File Organization

```
packages/common/public/css/
├── main.css          # Main entry point that imports all modules
├── variables.css     # CSS custom properties and design tokens
├── base.css          # Typography, reset, and fundamental styles
├── layout.css        # Grid, flexbox utilities, and responsive design
├── forms.css         # Form elements and validation states
├── buttons.css       # Button variants and interactions
├── components.css    # Reusable UI components
├── popup.css         # Extension popup specific styles
├── dialog.css        # In-page dialog styling
├── shortcuts.css     # Keyboard shortcut interface styles
└── toast.css         # Toast notification styling
```

### Import Strategy

The system uses CSS `@import` statements for modular loading:

```css
/* main.css - imports all modules in dependency order */
@import url("./variables.css");
@import url("./base.css");
@import url("./layout.css");
/* ... additional imports */
```

## Design System

### Color Palette

The color system uses CSS custom properties for theming and supports automatic dark/light mode switching:

```css
:root {
  /* Light Theme */
  --background-body: #f8f9fa;
  --background-card: #ffffff;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --button-primary: #0d6efd;
  --border-color: #dee2e6;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark Theme Overrides */
    --background-body: #1a1d23;
    --background-card: #2d3748;
    --text-primary: #f7fafc;
    --text-secondary: #a0aec0;
    --button-primary: #3182ce;
    --border-color: #4a5568;
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

```css
/* Margin utilities */
.m-0 { margin: 0; }
.m-1 { margin: 0.25rem; }
.m-2 { margin: 0.5rem; }
.m-3 { margin: 1rem; }
.m-4 { margin: 1.5rem; }
.m-5 { margin: 3rem; }

/* Padding utilities */
.p-0 { padding: 0; }
.p-1 { padding: 0.25rem; }
/* ... similar pattern for p-2 through p-5 */
```

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

```css
/* Section containers */
.section {
  background-color: var(--background-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0;
  box-shadow: 0 1px 3px var(--shadow);
}

/* Flexbox utilities */
.d-flex { display: flex; }
.flex-column { flex-direction: column; }
.justify-content-center { justify-content: center; }
.align-items-center { align-items: center; }

/* Grid utilities */
.row {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -0.5rem;
}

.col {
  flex: 1;
  padding: 0 0.5rem;
}
```

## Toast Notification System

### Structure

```css
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  pointer-events: none;
  max-width: 320px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 8px;
  border-left: 4px solid;
  box-shadow: 0 4px 12px var(--toast-shadow);
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s ease;
}
```

### Toast Variants

```css
.toast.success {
  background-color: var(--toast-success-bg);
  border-left-color: var(--toast-success-border);
  color: var(--toast-success-text);
}

.toast.error {
  background-color: var(--toast-error-bg);
  border-left-color: var(--toast-error-border);
  color: var(--toast-error-text);
}

.toast.info {
  background-color: var(--toast-info-bg);
  border-left-color: var(--toast-info-border);
  color: var(--toast-info-text);
}
```

### Animations

```css
@keyframes toastSlideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toastSlideOut {
  from {
    transform: translateX(0);
    opacity: 1;
    max-height: 100px;
    margin-bottom: 8px;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
    max-height: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
}

.toast {
  animation: toastSlideIn 0.3s ease-out forwards;
}

.toast.removing {
  animation: toastSlideOut 0.3s ease-in forwards;
}
```

## Responsive Design

### Breakpoints

```css
/* Mobile-first approach */
@media (max-width: 768px) {
  body {
    padding: 1rem;
  }

  .section {
    padding: 0.75rem;
  }
}

@media (max-width: 480px) {
  body.options-page {
    max-width: 100%;
    padding: 0.5rem;
  }
}
```

### Mobile Optimizations

```css
@media (max-width: 768px) {
  /* Stack form elements vertically */
  .shortcut-input-container {
    flex-direction: column;
    align-items: stretch;
  }

  /* Full-width buttons on mobile */
  .result-box {
    flex-direction: column;
    align-items: stretch;
  }

  #copy-btn {
    width: 100%;
  }
}
```

## Accessibility Features

### High Contrast Support

```css
@media (prefers-contrast: high) {
  .result-box {
    border-width: 2px;
  }

  .popup-status {
    border-width: 2px;
  }

  #alias-result {
    font-weight: bold;
  }
}
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .toast {
    animation: none;
    transform: translateX(0);
    opacity: 1;
  }
}
```

### Focus Management

```css
button:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
}
```

## Component-Specific Styles

### Popup Component

```css
/* Popup-specific body adjustments */
body {
  width: 320px;
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
}

.result-box {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.6rem;
  background-color: var(--background-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  margin-top: 0.5rem;
}

#alias-result {
  flex: 1;
  font-family: "Courier New", monospace;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-all;
  font-size: 0.9rem;
  line-height: 1.3;
}
```

### Dialog Component

```css
.alias-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  animation: dialogFadeIn 0.2s ease-out;
}

.alias-dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--dialog-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
}

.alias-dialog-content {
  background: var(--dialog-background);
  color: var(--dialog-text-primary);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 420px;
  max-width: 90vw;
  animation: dialogSlideIn 0.3s ease-out;
}
```

## Best Practices

### 1. CSS Custom Properties Usage

```css
/* Good: Use semantic custom properties */
.error-message {
  color: var(--text-error);
  background-color: var(--background-error);
  border-color: var(--border-error);
}

/* Avoid: Hard-coded values */
.error-message {
  color: #dc3545;
  background-color: #f8d7da;
  border-color: #f5c6cb;
}
```

### 2. Component Isolation

```css
/* Good: Scoped component styles */
.toast {
  /* Toast-specific styles */
}

.toast .toast-message {
  /* Child element styles */
}

/* Avoid: Global styles that might conflict */
.message {
  /* Too generic, could conflict */
}
```

### 3. Responsive Design

```css
/* Good: Mobile-first responsive design */
.component {
  /* Mobile styles first */
  padding: 0.5rem;
}

@media (min-width: 768px) {
  .component {
    /* Desktop enhancements */
    padding: 1rem;
  }
}
```

### 4. Performance Considerations

```css
/* Good: Use transform for animations */
.toast {
  transform: translateX(100%);
  transition: transform 0.3s ease;
}

/* Avoid: Animating layout properties */
.toast {
  right: -100%;
  transition: right 0.3s ease;
}
```

## Integration

### Using the CSS System

1. **Full System**: Import `style.css` for complete system
2. **Modular**: Import specific modules as needed
3. **Custom**: Extend with component-specific styles

```html
<!-- Full system -->
<link rel="stylesheet" href="style.css" />

<!-- Or modular approach -->
<link rel="stylesheet" href="css/variables.css" />
<link rel="stylesheet" href="css/base.css" />
<link rel="stylesheet" href="css/components.css" />
```

### Extension Integration

The CSS system is automatically loaded with each component:

- **Popup**: `style.css` included in `popup.html`
- **Options**: `style.css` included in `options.html`
- **Dialog**: `dialog.css` loaded dynamically
- **Toast**: `toast.css` loaded when first toast is shown

## Maintenance

### Adding New Components

1. Create component-specific CSS file
2. Add import to `main.css`
3. Follow existing naming conventions
4. Use design system tokens
5. Add responsive considerations
6. Include accessibility features

### Updating Design Tokens

1. Modify values in `variables.css`
2. Test across all components
3. Verify dark mode compatibility
4. Check accessibility compliance

### Performance Optimization

1. Use CSS custom properties for dynamic values
2. Minimize specificity conflicts
3. Optimize for critical rendering path
4. Consider CSS containment for complex components
