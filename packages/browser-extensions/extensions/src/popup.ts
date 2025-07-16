import browser from "webextension-polyfill";
import { ApiError, generateEmailAlias } from "./api";
import { extractDomainForSource, getDefaultLabel } from "./domain";

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Element Selection ---
  const labelInput = document.getElementById(
    "label-input",
  ) as HTMLInputElement | null;
  const sourceInput = document.getElementById(
    "source-input",
  ) as HTMLInputElement | null;
  const generateBtn = document.getElementById(
    "generate-btn",
  ) as HTMLButtonElement | null;
  const errorContainer = document.getElementById(
    "error-container",
  ) as HTMLDivElement | null;

  // --- Type Guard ---
  if (!labelInput || !sourceInput || !generateBtn || !errorContainer) {
    const message =
      "A critical UI element is missing from popup.html and the extension cannot function.";
    console.error(message);
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.classList.remove("hidden");
    }
    return;
  }

  // --- Auto-fill Logic ---
  /**
   * Initializes auto-fill values for label and source inputs based on current tab and saved settings.
   * Also handles focus logic for the input fields.
   */
  const initializeAutoFill = async () => {
    try {
      // Get current active tab to extract domain from
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      let autoSource = "";
      if (tab?.url) {
        autoSource = extractDomainForSource(tab.url);
      }

      // Get default label
      const autoLabel = await getDefaultLabel();

      // Set auto-filled values with defaults
      if (labelInput && autoLabel) {
        labelInput.value = autoLabel;
        labelInput.defaultValue = autoLabel;
      }

      if (sourceInput && autoSource) {
        sourceInput.value = autoSource;
        sourceInput.defaultValue = autoSource;
      }

      // Focus logic: if we auto-filled both, focus source for easy editing
      // If only one is filled, focus the empty one
      if (autoLabel && autoSource) {
        sourceInput.focus();
        sourceInput.select();
      } else if (autoLabel && !autoSource) {
        sourceInput.focus();
      } else if (!autoLabel && autoSource) {
        labelInput.focus();
      } else {
        // Neither auto-filled, focus label first
        labelInput.focus();
      }
    } catch (error) {
      console.error("Error during auto-fill initialization:", error);
      // Don't show this as an error to user, just log it
      // Still focus the first input
      labelInput.focus();
    }
  };

  // --- UI Helper Functions ---

  /**
   * Displays an error message in the UI with optional settings button.
   * @param message The error message to display
   * @param showOptionsButton Whether to show a button to open settings
   */
  const showError = (message: string, showOptionsButton = false) => {
    errorContainer.innerHTML = showOptionsButton
      ? `${message} <button id="open-options-btn" style="margin-left: 8px;">Open Settings</button>`
      : message;
    errorContainer.classList.remove("hidden");

    // Add event listener for the options button if it was created
    if (showOptionsButton) {
      const optionsBtn = document.getElementById("open-options-btn");
      if (optionsBtn) {
        optionsBtn.addEventListener("click", () => {
          void browser.runtime.sendMessage({ action: "openOptionsPage" });
          window.close(); // Close the popup
        });
      }
    }
  };

  /**
   * Hides any currently displayed error message.
   */
  const hideError = () => {
    if (!errorContainer.classList.contains("hidden")) {
      errorContainer.classList.add("hidden");
      errorContainer.innerHTML = "";
    }
  };

  // --- Auto-fill functionality ---
  /**
   * Attempts to fill the currently focused email field on the active tab.
   * @param alias The email alias to fill into the field
   */
  const fillActiveEmailField = async (alias: string) => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        // Corrected message format to match content script (`dialog.ts`)
        await browser.tabs.sendMessage(tab.id, {
          type: "fill-email-field",
          alias: alias,
        });
      }
    } catch (error) {
      console.log(
        "Could not auto-fill field (this is normal if no email field is focused):",
        error,
      );
      // Don't show this as an error to the user since it's expected behavior
    }
  };

  // --- Core Async Logic ---

  /**
   * Handles the alias generation process including validation, API call, and result display.
   */
  const handleGeneration = async () => {
    const label = labelInput.value.trim();
    const source = sourceInput.value.trim();

    if (!label || !source) {
      showError("Both Label and Source fields are required.");
      return;
    }

    const aliasParts = [label, source];

    hideError();
    generateBtn.disabled = true;
    generateBtn.textContent = "Generating...";

    try {
      const alias = await generateEmailAlias(aliasParts);

      // Copy to clipboard
      await navigator.clipboard.writeText(alias);

      // Try to auto-fill the active email field
      await fillActiveEmailField(alias);

      // Provide feedback to the user
      generateBtn.textContent = "Copied & Filled!";
      setTimeout(() => {
        // Revert button text after a delay
        generateBtn.textContent = "Generate";
        // Close popup automatically after success
        window.close();
      }, 1500);
    } catch (error) {
      if (error instanceof ApiError) {
        // Check if the error is about missing domain/token configuration
        const isConfigError = error.message.includes(
          "Domain and Token are not configured",
        );
        showError(error.message, isConfigError);
      } else {
        console.error("An unexpected error occurred:", error);
        showError("An unexpected error occurred. Please check the console.");
      }
      // Re-enable button on error
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate";
    }
    // Note: `finally` block is removed because we now handle button state differently for success vs. error
  };

  // --- Event Listener Registration ---

  // Use simple, non-async listeners that call the core async logic.
  // The `void` operator correctly handles the returned promise.
  generateBtn.addEventListener("click", () => {
    void handleGeneration();
  });

  /**
   * Handles Enter key press to trigger alias generation.
   * @param event The keyboard event
   */
  const onEnterPress = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleGeneration();
    }
  };

  labelInput.addEventListener("keydown", onEnterPress);
  sourceInput.addEventListener("keydown", onEnterPress);

  // --- Initialize Auto-fill ---
  void initializeAutoFill();
});
