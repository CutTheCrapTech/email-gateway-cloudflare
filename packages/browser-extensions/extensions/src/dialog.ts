import browser from "webextension-polyfill";
import { ApiError, generateEmailAlias } from "./api";
import { extractDomainForSource, getDefaultLabel } from "./domain";
import { loadSettings } from "./storage";

// Interfaces for messaging between background and content scripts
interface ShowAliasDialogMessage {
  type: "show-alias-dialog";
}

interface FillEmailFieldMessage {
  type: "fill-email-field";
  alias: string;
}

interface CheckEmailFieldsMessage {
  type: "check-email-fields";
}

interface EmailFieldsResponse {
  hasEmailFields: boolean;
}

// Define response types
interface SuccessResponse {
  success: true;
}

interface ErrorResponse {
  success: false;
  error: string;
}

type MessageResponse = SuccessResponse | ErrorResponse | EmailFieldsResponse;

// Define ping message type
interface PingMessage {
  type: "ping";
}

type ContentMessage =
  | ShowAliasDialogMessage
  | FillEmailFieldMessage
  | CheckEmailFieldsMessage
  | PingMessage;

/**
 * Type guard to check if a message is a valid ContentMessage.
 * @param message The message to check.
 * @returns True if the message is a ContentMessage, false otherwise.
 */
function isContentMessage(message: unknown): message is ContentMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    typeof (message as { type: unknown }).type === "string" &&
    [
      "show-alias-dialog",
      "fill-email-field",
      "check-email-fields",
      "ping",
    ].includes((message as { type: string }).type)
  );
}

/**
 * Handles messages from the background script and other extension components.
 * Processes different message types and responds appropriately.
 * @param message The incoming message to handle
 * @param _sender Information about the sender (unused)
 * @param sendResponse Callback function to send a response
 * @returns True to indicate the response will be sent asynchronously
 */
browser.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    if (isContentMessage(message)) {
      if (message.type === "ping") {
        sendResponse({ success: true });
        return true; // Indicate we handled the message
      } else if (message.type === "show-alias-dialog") {
        void showAliasGenerationDialog();
        sendResponse({ success: true });
        return true; // Indicate we handled the message
      } else if (message.type === "fill-email-field") {
        fillEmailField(message.alias);
        sendResponse({ success: true });
        return true; // Indicate we handled the message
      } else if (message.type === "check-email-fields") {
        // Check if there are email fields on the page
        const emailInputs = findAllEmailInputs();
        const response: EmailFieldsResponse = {
          hasEmailFields: emailInputs.length > 0,
        };
        sendResponse(response);
        return true; // Indicate we handled the message
      }
    }

    // For unknown messages, send error response
    sendResponse({ success: false, error: "Unknown message type" });
    return true; // Indicate we handled the message
  },
);

/**
 * A comprehensive check to determine if an input element is an email field.
 * This function checks various attributes to identify fields intended for email addresses.
 * @param element The HTMLInputElement to check.
 * @returns True if the element is likely an email input field, false otherwise.
 */
function isEmailInput(element: HTMLInputElement): boolean {
  if (!(element instanceof HTMLInputElement)) {
    return false;
  }

  // Check for visibility and disabled/readonly state
  if (!isVisible(element) || element.disabled || element.readOnly) {
    return false;
  }

  const type = element.type.toLowerCase();
  const id = element.id.toLowerCase();
  const name = element.name.toLowerCase();
  const placeholder = element.placeholder.toLowerCase();
  const autocomplete = (
    element.getAttribute("autocomplete") || ""
  ).toLowerCase();
  const className = element.className.toLowerCase();

  // Primary check: type="email" is a strong indicator.
  if (type === "email") {
    return true;
  }

  // Check autocomplete attribute, which is a modern standard.
  if (autocomplete.includes("email") || autocomplete === "username") {
    return true;
  }

  // For type="text" or other types, check common naming conventions.
  const keywords = ["email", "e-mail", "mail", "login", "user", "username"];
  const searchString = `${id} ${name} ${placeholder} ${className}`;

  if (keywords.some((keyword) => searchString.includes(keyword))) {
    // Avoid password fields that might contain 'user'
    if (type === "password") {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Finds all email input fields on the page.
 * @returns Array of HTMLInputElement that are email fields.
 */
export function findAllEmailInputs(): HTMLInputElement[] {
  const inputs = Array.from(document.querySelectorAll("input"));
  return inputs.filter(isEmailInput);
}

/**
 * Finds the most likely email input field on the page using a scoring system.
 * @returns The best HTMLInputElement or null if none is found.
 */
export function findBestEmailInput(): HTMLInputElement | null {
  const emailInputs = findAllEmailInputs();

  if (emailInputs.length === 0) return null;
  if (emailInputs.length === 1) return emailInputs[0] || null;

  // Score each input to find the best one
  let bestInput: HTMLInputElement | null = emailInputs[0] || null;
  if (!bestInput) return null;
  let bestScore = 0;

  for (const input of emailInputs) {
    let score = 0;

    // Higher score for type="email"
    if (input.type.toLowerCase() === "email") {
      score += 10;
    }

    // Higher score for visible inputs
    if (isVisible(input)) {
      score += 5;
    }

    // Higher score for inputs that are currently focused or recently focused
    if (input === document.activeElement) {
      score += 8;
    }

    // Higher score for inputs with email-specific autocomplete
    const autocomplete = (
      input.getAttribute("autocomplete") || ""
    ).toLowerCase();
    if (autocomplete.includes("email")) {
      score += 7;
    }

    // Higher score for inputs with specific names/ids
    const id = input.id.toLowerCase();
    const name = input.name.toLowerCase();
    if (id.includes("email") || name.includes("email")) {
      score += 6;
    }

    // Prefer inputs that are in forms (more likely to be actual form fields)
    if (input.closest("form")) {
      score += 3;
    }

    // Prefer inputs that are not hidden or have small dimensions
    const rect = input.getBoundingClientRect();
    if (rect.width > 50 && rect.height > 20) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestInput = input;
    }
  }

  return bestInput;
}

/**
 * Fills the best available email field with the provided alias.
 * @param alias The email alias to fill in the input field.
 */
function fillEmailField(alias: string): void {
  const emailInput = findBestEmailInput();
  if (emailInput) {
    emailInput.value = alias;
    // Dispatch events to ensure frameworks like React or Vue detect the change.
    emailInput.dispatchEvent(new Event("input", { bubbles: true }));
    emailInput.dispatchEvent(new Event("change", { bubbles: true }));
    emailInput.focus();
  }
}

/**
 * Checks if an element is currently visible on the page.
 * @param elem The element to check.
 * @returns True if the element is visible, false otherwise.
 */
function isVisible(elem: HTMLElement): boolean {
  return !!(
    elem.offsetWidth ||
    elem.offsetHeight ||
    elem.getClientRects().length
  );
}

/**
 * Gets a user-friendly description of the email field that will be filled.
 * @returns Description string or null if no field found.
 */
function getEmailFieldDescription(): string | null {
  const emailInput = findBestEmailInput();
  if (!emailInput) return null;

  // Try to get a meaningful description
  const placeholder = emailInput.placeholder;
  const label = emailInput.labels?.[0]?.textContent?.trim();
  const id = emailInput.id;
  const name = emailInput.name;

  if (label) return `"${label}" field`;
  if (placeholder) return `"${placeholder}" field`;
  if (id) return `${id} field`;
  if (name) return `${name} field`;

  return "email field";
}

/**
 * Fetches the dialog content, injects it into the page, and sets up all event listeners.
 */
async function showAliasGenerationDialog(): Promise<void> {
  // Remove any existing dialog to prevent duplicates
  const existingDialog = document.querySelector(".alias-dialog");
  if (existingDialog) {
    existingDialog.remove();
  }

  try {
    // Check if extension is configured before proceeding
    let settings: { domain?: string; token?: string };
    try {
      settings = await loadSettings();
    } catch (storageError) {
      console.error("Failed to access storage:", storageError);
      alert(
        "Could not access extension settings. Please try refreshing the page or check extension permissions.",
      );
      return;
    }

    if (!settings.domain || !settings.token) {
      alert(
        "Email Alias Generator is not configured. Please click on the extension icon and configure your domain and secret key first.",
      );
      // Try to open options page
      try {
        await browser.runtime.sendMessage({ action: "openOptionsPage" });
      } catch {
        console.log("Could not open options page automatically");
      }
      return;
    }
    // Fetch the HTML and CSS for the dialog from the extension's public resources.
    const [dialogHtml, dialogCss, componentsCss, variablesCss] =
      await Promise.all([
        fetch(browser.runtime.getURL("dialog.html")).then((res) => {
          if (!res.ok) {
            throw new Error(
              `Failed to fetch dialog.html: ${res.status} ${res.statusText}`,
            );
          }
          return res.text();
        }),
        fetch(browser.runtime.getURL("css/dialog.css")).then((res) => {
          if (!res.ok) {
            throw new Error(
              `Failed to fetch css/dialog.css: ${res.status} ${res.statusText}`,
            );
          }
          return res.text();
        }),
        fetch(browser.runtime.getURL("css/components.css")).then((res) => {
          if (!res.ok) {
            throw new Error(
              `Failed to fetch css/components.css: ${res.status} ${res.statusText}`,
            );
          }
          return res.text();
        }),
        fetch(browser.runtime.getURL("css/variables.css")).then((res) => {
          if (!res.ok) {
            throw new Error(
              `Failed to fetch css/variables.css: ${res.status} ${res.statusText}`,
            );
          }
          return res.text();
        }),
      ]);

    // Inject the fetched CSS into the document's head
    const variablesStyle = document.createElement("style");
    variablesStyle.textContent = variablesCss;
    document.head.appendChild(variablesStyle);

    const dialogStyle = document.createElement("style");
    dialogStyle.textContent = dialogCss;
    document.head.appendChild(dialogStyle);

    const componentsStyle = document.createElement("style");
    componentsStyle.textContent = componentsCss;
    document.head.appendChild(componentsStyle);

    // Create a container for the dialog and inject the fetched HTML
    const dialog = document.createElement("div");
    dialog.className = "alias-dialog";
    dialog.innerHTML = dialogHtml;
    document.body.appendChild(dialog);

    // Auto-fill values using shared utilities
    const autoSource = extractDomainForSource(); // Uses current page's URL
    const autoLabel = await getDefaultLabel(); // Gets from storage or default

    // Get dialog elements
    const labelInput = dialog.querySelector("#alias-label") as HTMLInputElement;
    const sourceInput = dialog.querySelector(
      "#alias-source",
    ) as HTMLInputElement;
    const generateBtn = dialog.querySelector(
      "#alias-generate-btn",
    ) as HTMLButtonElement;
    const cancelBtn = dialog.querySelector(
      "#alias-cancel-btn",
    ) as HTMLButtonElement;
    const closeBtn = dialog.querySelector(
      ".alias-dialog-close",
    ) as HTMLButtonElement;
    const errorDiv = dialog.querySelector(
      "#alias-dialog-error",
    ) as HTMLDivElement;
    const labelHint = dialog.querySelector("#label-hint") as HTMLDivElement;
    const sourceHint = dialog.querySelector("#source-hint") as HTMLDivElement;

    // Add field preview if available
    const fieldDescription = getEmailFieldDescription();
    if (fieldDescription) {
      const previewDiv = document.createElement("div");
      previewDiv.className = "field-preview";
      previewDiv.innerHTML = `
        <div style="margin-bottom: 12px; padding: 8px 12px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 4px; font-size: 13px; color: #0369a1;">
          <strong>Will fill:</strong> ${fieldDescription}
        </div>
      `;
      const form = dialog.querySelector(".alias-dialog-content form");
      if (form) {
        form.insertBefore(previewDiv, form.firstChild);
      }
    }

    // Set auto-filled values
    if (labelInput) {
      labelInput.value = autoLabel;
      labelInput.defaultValue = autoLabel;
    }
    if (sourceInput) {
      sourceInput.value = autoSource;
      sourceInput.defaultValue = autoSource;
    }

    // Helper functions
    const closeDialog = () => {
      dialog.remove();
      variablesStyle.remove();
      dialogStyle.remove();
      componentsStyle.remove();
    };

    const showError = (message: string) => {
      errorDiv.textContent = message;
      errorDiv.classList.remove("hidden");
    };

    const hideError = () => {
      errorDiv.classList.add("hidden");
      errorDiv.textContent = "";
    };

    // Auto-fill hint interactions
    const setupHintInteraction = (
      input: HTMLInputElement,
      hint: HTMLDivElement,
    ) => {
      if (!input || !hint) return;

      const updateHintVisibility = () => {
        // Show hint only when field contains the auto-filled default value
        // This tells the user "we auto-filled this, you can change it"
        if (input.value === input.defaultValue && input.defaultValue) {
          hint.classList.remove("hidden");
        } else {
          hint.classList.add("hidden");
        }
      };

      // Hide hint immediately when user focuses (about to customize)
      input.addEventListener("focus", () => {
        hint.classList.add("hidden");
      });

      // Check if we should show hint again when user finishes editing
      input.addEventListener("blur", updateHintVisibility);

      // Hide hint in real-time as user types (immediate feedback)
      input.addEventListener("input", updateHintVisibility);

      // Clicking hint focuses field and selects auto-filled value for easy replacement
      hint.addEventListener("click", () => {
        input.focus();
        input.select();
      });

      // Initially show hint for auto-filled values
      updateHintVisibility();
    };

    setupHintInteraction(labelInput, labelHint);
    setupHintInteraction(sourceInput, sourceHint);

    // Event listeners
    closeBtn.addEventListener("click", closeDialog);
    cancelBtn.addEventListener("click", closeDialog);

    dialog.addEventListener("click", (e) => {
      if (
        (e.target as HTMLElement)?.classList.contains("alias-dialog-overlay")
      ) {
        closeDialog();
      }
    });

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDialog();
        document.removeEventListener("keydown", handleKeydown);
      }
    };
    document.addEventListener("keydown", handleKeydown);

    const showSuccessMessage = (message: string) => {
      // Create a temporary success message
      const successDiv = document.createElement("div");
      successDiv.textContent = message;
      successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
      `;
      document.body.appendChild(successDiv);

      // Remove after 3 seconds
      setTimeout(() => {
        if (successDiv.parentNode) {
          successDiv.remove();
        }
      }, 3000);
    };

    const handleGenerate = async () => {
      const label = labelInput.value.trim();
      const source = sourceInput.value.trim();

      if (!label || !source) {
        showError("Both Label and Source fields are required.");
        return;
      }

      hideError();
      generateBtn.disabled = true;
      generateBtn.textContent = "Generating...";

      try {
        const alias = await generateEmailAlias([label, source]);
        const emailInput = findBestEmailInput();

        if (emailInput) {
          // Fill the email field if available
          fillEmailField(alias);
          closeDialog();
        } else {
          // No email field found - copy to clipboard instead
          try {
            await navigator.clipboard.writeText(alias);
            showSuccessMessage(`Email alias copied to clipboard: ${alias}`);
            closeDialog();
          } catch (clipboardError) {
            console.error("Failed to copy to clipboard:", clipboardError);
            showError(
              `Generated alias: ${alias}\n(Could not copy to clipboard)`,
            );
          }
        }
      } catch (error) {
        if (error instanceof ApiError) {
          showError(error.message);
        } else {
          console.error("An unexpected error occurred:", error);
          showError("An unexpected error occurred. Please check the console.");
        }
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate Alias";
      }
    };

    generateBtn.addEventListener("click", () => void handleGenerate());

    [labelInput, sourceInput].forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void handleGenerate();
        }
      });
    });

    // Focus logic: if we auto-filled both, focus source for easy editing
    if (autoLabel && autoSource) {
      sourceInput.focus();
      sourceInput.select();
    } else if (!autoLabel) {
      labelInput.focus();
    } else {
      sourceInput.focus();
    }
  } catch (error) {
    console.error("Failed to create or show alias generation dialog:", error);
    let errorMessage = "Error: Could not load the alias generation dialog.";

    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch")) {
        errorMessage +=
          " Failed to load dialog resources. Please check if the extension is properly installed and try refreshing the page.";
      } else {
        errorMessage += ` Details: ${error.message}`;
      }
    }

    alert(
      errorMessage +
        " Check extension permissions and console for more details.",
    );
  }
}
