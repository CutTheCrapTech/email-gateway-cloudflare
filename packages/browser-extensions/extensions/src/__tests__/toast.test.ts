import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dismissAllToasts,
  dismissToast,
  isToastSupported,
  resetToastManager,
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showToast,
} from "../toast";

describe("Toast Notification System", () => {
  beforeEach(() => {
    // Reset toast manager state first
    resetToastManager();

    // Clean up DOM before each test
    document.body.innerHTML = "";
    document.head.innerHTML = "";

    // Mock CSS loading by adding a fake stylesheet
    const mockCSSLink = document.createElement("link");
    mockCSSLink.rel = "stylesheet";
    mockCSSLink.href = "css/toast.css";
    document.head.appendChild(mockCSSLink);

    // Reset timers
    vi.clearAllTimers();
  });

  afterEach(() => {
    // Reset toast manager state
    resetToastManager();

    // Clean up DOM
    document.body.innerHTML = "";
    document.head.innerHTML = "";

    vi.clearAllTimers();
  });

  describe("isToastSupported", () => {
    it("should return true when document and window are available", () => {
      expect(isToastSupported()).toBe(true);
    });

    it("should return false when document is not available", () => {
      const originalDocument = global.document;
      // @ts-ignore
      global.document = undefined;

      expect(isToastSupported()).toBe(false);

      global.document = originalDocument;
    });

    it("should return false when window is not available", () => {
      const originalWindow = global.window;
      // @ts-ignore
      global.window = undefined;

      expect(isToastSupported()).toBe(false);

      global.window = originalWindow;
    });
  });

  describe("showSuccessToast", () => {
    it("should create a success toast with default options", () => {
      const toastId = showSuccessToast("Success message");

      expect(toastId).toMatch(/^toast-\d+$/);

      const container = document.querySelector(".toast-container");
      expect(container).toBeTruthy();

      const toast = document.querySelector(".toast.success");
      expect(toast).toBeTruthy();
      expect(toast?.textContent).toContain("Success message");
    });

    it("should create a success toast with custom duration", () => {
      const toastId = showSuccessToast("Success message", 2000);

      expect(toastId).toMatch(/^toast-\d+$/);

      const toast = document.querySelector(".toast.success");
      expect(toast).toBeTruthy();
    });

    it("should create a non-closable success toast", () => {
      showSuccessToast("Success message", 4000, false);

      const closeButton = document.querySelector(".toast-close");
      expect(closeButton).toBeFalsy();
    });
  });

  describe("showErrorToast", () => {
    it("should create an error toast with default options", () => {
      const toastId = showErrorToast("Error message");

      expect(toastId).toMatch(/^toast-\d+$/);

      const container = document.querySelector(".toast-container");
      expect(container).toBeTruthy();

      const toast = document.querySelector(".toast.error");
      expect(toast).toBeTruthy();
      expect(toast?.textContent).toContain("Error message");
    });

    it("should create an error toast with custom duration", () => {
      const toastId = showErrorToast("Error message", 2000);

      expect(toastId).toMatch(/^toast-\d+$/);

      const toast = document.querySelector(".toast.error");
      expect(toast).toBeTruthy();
    });
  });

  describe("showInfoToast", () => {
    it("should create an info toast with default options", () => {
      const toastId = showInfoToast("Info message");

      expect(toastId).toMatch(/^toast-\d+$/);

      const container = document.querySelector(".toast-container");
      expect(container).toBeTruthy();

      const toast = document.querySelector(".toast.info");
      expect(toast).toBeTruthy();
      expect(toast?.textContent).toContain("Info message");
    });

    it("should create an info toast with custom duration", () => {
      const toastId = showInfoToast("Info message", 2000);

      expect(toastId).toMatch(/^toast-\d+$/);

      const toast = document.querySelector(".toast.info");
      expect(toast).toBeTruthy();
    });
  });

  describe("showToast", () => {
    it("should create a custom toast with all options", () => {
      const toastId = showToast({
        message: "Custom message",
        type: "success",
        duration: 5000,
        closable: true,
      });

      expect(toastId).toMatch(/^toast-\d+$/);

      const toast = document.querySelector(".toast.success");
      expect(toast).toBeTruthy();
      expect(toast?.textContent).toContain("Custom message");

      const closeButton = document.querySelector(".toast-close");
      expect(closeButton).toBeTruthy();
    });

    it("should create a toast without auto-dismiss when duration is 0", () => {
      const toastId = showToast({
        message: "Persistent message",
        type: "info",
        duration: 0,
      });

      expect(toastId).toMatch(/^toast-\d+$/);

      const toast = document.querySelector(".toast.info");
      expect(toast).toBeTruthy();

      const progressBar = toast?.querySelector(".toast-progress");
      expect(progressBar).toBeFalsy();
    });

    it("should create a toast with progress bar when duration is set", () => {
      const toastId = showToast({
        message: "Timed message",
        type: "info",
        duration: 3000,
      });

      expect(toastId).toMatch(/^toast-\d+$/);

      const toast = document.querySelector(".toast.info");
      expect(toast).toBeTruthy();

      const progressBar = toast?.querySelector(".toast-progress");
      expect(progressBar).toBeTruthy();
    });

    it("should add toast-icon with correct content", () => {
      showToast({
        message: "Test message",
        type: "success",
      });

      const icon = document.querySelector(".toast-icon");
      expect(icon).toBeTruthy();
    });
  });

  describe("dismissToast", () => {
    it("should dismiss a specific toast", () => {
      const toastId = showSuccessToast("Test message");

      const toast = document.querySelector(".toast");
      expect(toast).toBeTruthy();

      dismissToast(toastId);

      // Check if removing class is added (for animation)
      expect(toast?.classList.contains("removing")).toBe(true);
    });

    it("should handle dismissing non-existent toast gracefully", () => {
      expect(() => dismissToast("non-existent-id")).not.toThrow();
    });

    it("should clear timeout when dismissing toast early", () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const toastId = showSuccessToast("Test message", 5000);
      dismissToast(toastId);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("dismissAllToasts", () => {
    it("should dismiss all active toasts", () => {
      showSuccessToast("Message 1");
      showErrorToast("Message 2");
      showInfoToast("Message 3");

      const toasts = document.querySelectorAll(".toast");
      expect(toasts.length).toBe(3);

      dismissAllToasts();

      // All toasts should have removing class
      toasts.forEach((toast) => {
        expect(toast.classList.contains("removing")).toBe(true);
      });
    });

    it("should handle dismissing when no toasts exist", () => {
      expect(() => dismissAllToasts()).not.toThrow();
    });
  });

  describe("toast interactions", () => {
    it("should dismiss toast when close button is clicked", () => {
      showSuccessToast("Test message");

      const closeButton = document.querySelector(".toast-close");
      expect(closeButton).toBeTruthy();

      // Simulate click
      closeButton?.dispatchEvent(new Event("click"));

      const toast = document.querySelector(".toast");
      expect(toast?.classList.contains("removing")).toBe(true);
    });

    it("should dismiss toast when toast itself is clicked", () => {
      showSuccessToast("Test message");

      const toast = document.querySelector(".toast");
      expect(toast).toBeTruthy();

      // Simulate click
      toast?.dispatchEvent(new Event("click"));

      expect(toast?.classList.contains("removing")).toBe(true);
    });

    it("should prevent event bubbling when close button is clicked", () => {
      showSuccessToast("Test message");

      let closeButtonClicked = false;
      let toastClicked = false;

      const toast = document.querySelector(".toast");
      const closeButton = document.querySelector(".toast-close");

      toast?.addEventListener("click", () => {
        toastClicked = true;
      });

      closeButton?.addEventListener("click", (e) => {
        closeButtonClicked = true;
        e.stopPropagation();
      });

      // Simulate close button click
      const clickEvent = new Event("click", { bubbles: true });
      closeButton?.dispatchEvent(clickEvent);

      expect(closeButtonClicked).toBe(true);
      expect(toastClicked).toBe(false);
    });
  });

  describe("auto-dismiss functionality", () => {
    it("should auto-dismiss toast after specified duration", () => {
      vi.useFakeTimers();

      showSuccessToast("Test message", 1000);

      const toast = document.querySelector(".toast");
      expect(toast).toBeTruthy();
      expect(toast?.classList.contains("removing")).toBe(false);

      // Fast forward time
      vi.advanceTimersByTime(1000);

      expect(toast?.classList.contains("removing")).toBe(true);

      vi.useRealTimers();
    });

    it("should not auto-dismiss when duration is 0", () => {
      vi.useFakeTimers();

      showToast({
        message: "Persistent message",
        type: "info",
        duration: 0,
      });

      const toast = document.querySelector(".toast");
      expect(toast).toBeTruthy();

      // Fast-forward time significantly
      vi.advanceTimersByTime(10000);

      // Toast should still be there
      expect(toast?.classList.contains("removing")).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("toast container creation", () => {
    it("should create toast container when first toast is shown", () => {
      expect(document.querySelector(".toast-container")).toBeFalsy();

      showSuccessToast("Test message");

      const container = document.querySelector(".toast-container");
      expect(container).toBeTruthy();
      expect(container?.parentElement).toBe(document.body);
    });

    it("should reuse existing toast container", () => {
      showSuccessToast("Message 1");
      showSuccessToast("Message 2");

      const containers = document.querySelectorAll(".toast-container");
      expect(containers.length).toBe(1);
    });
  });

  describe("toast content structure", () => {
    it("should create proper toast structure", () => {
      showSuccessToast("Test message");

      const toast = document.querySelector(".toast");
      expect(toast).toBeTruthy();

      const icon = toast?.querySelector(".toast-icon");
      expect(icon).toBeTruthy();

      const message = toast?.querySelector(".toast-message");
      expect(message).toBeTruthy();
      expect(message?.textContent).toBe("Test message");

      const closeButton = toast?.querySelector(".toast-close");
      expect(closeButton).toBeTruthy();
    });

    it("should set correct data attribute", () => {
      const toastId = showSuccessToast("Test message");

      const toast = document.querySelector(".toast");
      expect(toast?.getAttribute("data-toast-id")).toBe(toastId);
    });

    it("should include progress bar for timed toasts", () => {
      showSuccessToast("Test message", 5000);

      const toast = document.querySelector(".toast");
      const progressBar = toast?.querySelector(".toast-progress");
      expect(progressBar).toBeTruthy();
    });
  });
});
