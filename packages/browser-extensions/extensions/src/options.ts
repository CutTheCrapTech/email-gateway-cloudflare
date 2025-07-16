import { generateSecureRandomString } from "email-alias-core";
import browser from "webextension-polyfill";
import { loadSettings, saveSettings } from "./storage";

/**
 * A helper function to display a status message to the user.
 * The message automatically disappears after a few seconds.
 *
 * @param message - The text to display.
 * @param isError - If true, styles the message as an error. Defaults to false.
 */
function showStatusMessage(message: string, isError = false): void {
  const statusElement = document.getElementById("status-message");
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
  statusElement.classList.toggle("success", !isError);
  statusElement.classList.remove("hidden");

  setTimeout(() => {
    statusElement.classList.add("hidden");
  }, 3000);
}

/**
 * Displays the keyboard shortcuts for the extension.
 */
async function displayShortcuts(): Promise<void> {
  try {
    const commands = await browser.commands.getAll();
    const shortcutsContainer = document.getElementById("shortcut-list");

    if (!shortcutsContainer) {
      console.warn("Shortcuts container not found");
      return;
    }

    if (commands.length === 0) {
      shortcutsContainer.innerHTML = "<p>No keyboard shortcuts configured.</p>";
      return;
    }

    const shortcutsList = commands
      .map((command) => {
        const shortcut = command.shortcut || "Not set";
        const description = command.description || "No description";
        return `<li><strong>${shortcut}</strong>: ${description}</li>`;
      })
      .join("");

    shortcutsContainer.innerHTML = `
      <h3>Keyboard Shortcuts</h3>
      <ul>${shortcutsList}</ul>
      <p><em>You can customize these shortcuts in your browser's extension settings.</em></p>
    `;
  } catch (error) {
    console.error("Failed to load keyboard shortcuts:", error);
  }
}

/**
 * Main execution block that runs when the options page is fully loaded.
 */
document.addEventListener("DOMContentLoaded", () => {
  // --- Get references to DOM elements ---
  const domainInput = document.getElementById("domain") as HTMLInputElement;
  const tokenInput = document.getElementById("token") as HTMLInputElement;
  const defaultLabelInput = document.getElementById(
    "default-label",
  ) as HTMLInputElement;
  const saveButton = document.getElementById("save-btn") as HTMLButtonElement;

  // New Secret Key elements
  const generateKeyBtn = document.getElementById(
    "generate-key-btn",
  ) as HTMLButtonElement;
  const keyActions = document.getElementById("key-actions") as HTMLDivElement;
  const copyKeyBtn = document.getElementById(
    "copy-key-btn",
  ) as HTMLButtonElement;
  const viewKeyBtn = document.getElementById(
    "view-key-btn",
  ) as HTMLButtonElement;
  const backupConfirmedCheckbox = document.getElementById(
    "backup-confirmed",
  ) as HTMLInputElement;

  // Type guard to ensure all elements were found
  if (
    !domainInput ||
    !tokenInput ||
    !defaultLabelInput ||
    !saveButton ||
    !generateKeyBtn ||
    !keyActions ||
    !copyKeyBtn ||
    !viewKeyBtn ||
    !backupConfirmedCheckbox
  ) {
    console.error(
      "Could not find one or more required elements on the options page.",
    );
    return;
  }

  // --- State variable ---
  let isNewKeyGenerated = false;

  // --- Form Validation Function ---
  function validateForm(): void {
    const domain = domainInput.value.trim();
    const token = tokenInput.value.trim();

    // Check if required fields are filled
    const hasRequiredFields = domain && token;

    // Check if backup confirmation is needed and satisfied
    const needsBackupConfirmation = isNewKeyGenerated;
    const hasBackupConfirmation = backupConfirmedCheckbox.checked;

    // Enable save button only if all conditions are met
    const canSave =
      hasRequiredFields && (!needsBackupConfirmation || hasBackupConfirmation);

    saveButton.disabled = !canSave;

    // Toggle visibility of the copy button
    copyKeyBtn.classList.toggle("hidden", !token);
  }

  // Initialize save button as disabled
  saveButton.disabled = true;

  // --- Event Handlers ---

  // Add validation on input changes
  domainInput.addEventListener("input", validateForm);
  tokenInput.addEventListener("input", validateForm);
  backupConfirmedCheckbox.addEventListener("change", validateForm);

  generateKeyBtn.addEventListener("click", () => {
    const newKey = generateSecureRandomString(8);
    tokenInput.value = newKey;
    tokenInput.type = "text"; // Show the key
    keyActions.classList.remove("hidden");
    backupConfirmedCheckbox.checked = false;
    isNewKeyGenerated = true;
    showStatusMessage("New key generated. Please back it up now.", false);
    validateForm(); // Revalidate after generating key
  });

  viewKeyBtn.addEventListener("click", () => {
    const isPassword = tokenInput.type === "password";
    tokenInput.type = isPassword ? "text" : "password";
    viewKeyBtn.innerHTML = isPassword
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  });

  copyKeyBtn.addEventListener("click", () => {
    navigator.clipboard
      .writeText(tokenInput.value)
      .then(() => {
        showStatusMessage("Key copied to clipboard!", false);
      })
      .catch(() => {
        showStatusMessage("Failed to copy key.", true);
      });
  });

  // --- Main Logic ---

  async function loadAndDisplaySettings(): Promise<void> {
    try {
      const settings = await loadSettings();
      domainInput.value = settings.domain || "";
      tokenInput.value = settings.token || "";
      defaultLabelInput.value = settings.defaultLabel || "marketing";

      // Reset the new key generated state since we're loading existing settings
      isNewKeyGenerated = false;

      // Validate form after loading settings
      validateForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";
      showStatusMessage(`Error loading settings: ${message}`, true);
    }
  }

  saveButton.addEventListener("click", () => {
    void (async () => {
      const domain = domainInput.value.trim();
      const token = tokenInput.value.trim();
      const defaultLabel = defaultLabelInput.value.trim() || "marketing";

      if (!domain || !token) {
        showStatusMessage("Domain and Secret Key fields are required.", true);
        return;
      }

      if (isNewKeyGenerated && !backupConfirmedCheckbox.checked) {
        showStatusMessage(
          "Please confirm you have backed up the new secret key.",
          true,
        );
        return;
      }

      try {
        await saveSettings({
          domain,
          token,
          defaultLabel,
        });

        showStatusMessage("Settings saved successfully!");
        // After saving, reset the state
        isNewKeyGenerated = false;
        keyActions.classList.add("hidden");
        tokenInput.type = "password";
        validateForm(); // Revalidate after saving
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred.";
        showStatusMessage(`Error saving settings: ${message}`, true);
      }
    })();
  });

  // --- Initial Load ---
  void loadAndDisplaySettings();
  void displayShortcuts();
});
