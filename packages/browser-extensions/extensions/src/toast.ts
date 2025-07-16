/**
 * Toast notification system for the email alias extension.
 * Provides a clean API for showing success, error, and info messages.
 */

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  /** The message to display */
  message: string;
  /** The type of toast (affects styling) */
  type: ToastType;
  /** Auto-dismiss duration in milliseconds (0 = no auto-dismiss) */
  duration?: number;
  /** Whether to show a close button */
  closable?: boolean;
}

export interface Toast {
  id: string;
  element: HTMLElement;
  timeoutId?: number;
}

class ToastManager {
  private container: HTMLElement | null = null;
  private toasts: Map<string, Toast> = new Map();
  private toastCounter = 0;

  /**
   * Reset the toast manager state (for testing)
   */
  reset(): void {
    // Clear all timeouts
    for (const toast of this.toasts.values()) {
      if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
      }
    }

    // Clear the toast map
    this.toasts.clear();

    // Remove container from DOM if it exists
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    // Reset container reference
    this.container = null;

    // Reset counter
    this.toastCounter = 0;
  }

  /**
   * Initialize the toast system by creating the container element
   */
  private ensureContainer(): void {
    if (this.container) return;

    this.container = document.createElement("div");
    this.container.className = "toast-container";
    document.body.appendChild(this.container);

    // Load toast CSS if not already loaded
    if (!document.querySelector('link[href*="toast.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "css/toast.css";
      document.head.appendChild(link);
    }
  }

  /**
   * Show a toast notification
   */
  show(options: ToastOptions): string {
    this.ensureContainer();

    const toastId = `toast-${++this.toastCounter}`;
    const element = this.createToastElement(toastId, options);

    if (this.container) {
      this.container.appendChild(element);
    }

    const toast: Toast = { id: toastId, element };

    // Set up auto-dismiss
    if (options.duration && options.duration > 0) {
      toast.timeoutId = window.setTimeout(() => {
        this.dismiss(toastId);
      }, options.duration);
    }

    this.toasts.set(toastId, toast);
    return toastId;
  }

  /**
   * Dismiss a specific toast
   */
  dismiss(toastId: string): void {
    const toast = this.toasts.get(toastId);
    if (!toast) return;

    // Clear timeout if exists
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }

    // Add removing class for animation
    toast.element.classList.add("removing");

    // Remove from DOM after animation
    setTimeout(() => {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      this.toasts.delete(toastId);
    }, 300); // Match CSS animation duration
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    for (const toastId of this.toasts.keys()) {
      this.dismiss(toastId);
    }
  }

  /**
   * Create the toast DOM element
   */
  private createToastElement(
    toastId: string,
    options: ToastOptions,
  ): HTMLElement {
    const toast = document.createElement("div");
    toast.className = `toast ${options.type}`;
    toast.setAttribute("data-toast-id", toastId);

    // Icon
    const icon = document.createElement("span");
    icon.className = "toast-icon";
    toast.appendChild(icon);

    // Message
    const message = document.createElement("span");
    message.className = "toast-message";
    message.textContent = options.message;
    toast.appendChild(message);

    // Close button (if closable)
    if (options.closable !== false) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "toast-close";
      closeBtn.setAttribute("aria-label", "Close notification");
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.dismiss(toastId);
      });
      toast.appendChild(closeBtn);
    }

    // Progress bar for auto-dismiss
    if (options.duration && options.duration > 0) {
      const progress = document.createElement("div");
      progress.className = "toast-progress";
      progress.style.width = "100%";
      progress.style.animationDuration = `${options.duration}ms`;
      toast.appendChild(progress);

      // Animate progress bar
      setTimeout(() => {
        progress.style.width = "0%";
        progress.style.transition = `width ${options.duration}ms linear`;
      }, 10);
    }

    // Click to dismiss
    toast.addEventListener("click", () => {
      this.dismiss(toastId);
    });

    return toast;
  }
}

// Create singleton instance
const toastManager = new ToastManager();

/**
 * Show a success toast notification
 */
export function showSuccessToast(
  message: string,
  duration = 4000,
  closable = true,
): string {
  return toastManager.show({
    message,
    type: "success",
    duration,
    closable,
  });
}

/**
 * Show an error toast notification
 */
export function showErrorToast(
  message: string,
  duration = 6000,
  closable = true,
): string {
  return toastManager.show({
    message,
    type: "error",
    duration,
    closable,
  });
}

/**
 * Show an info toast notification
 */
export function showInfoToast(
  message: string,
  duration = 4000,
  closable = true,
): string {
  return toastManager.show({
    message,
    type: "info",
    duration,
    closable,
  });
}

/**
 * Show a custom toast notification
 */
export function showToast(options: ToastOptions): string {
  return toastManager.show(options);
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(toastId: string): void {
  toastManager.dismiss(toastId);
}

/**
 * Dismiss all active toasts
 */
export function dismissAllToasts(): void {
  toastManager.dismissAll();
}

/**
 * Check if toast notifications are supported in the current environment
 */
export function isToastSupported(): boolean {
  return typeof document !== "undefined" && typeof window !== "undefined";
}

/**
 * Reset toast manager state (for testing)
 */
export function resetToastManager(): void {
  toastManager.reset();
}
