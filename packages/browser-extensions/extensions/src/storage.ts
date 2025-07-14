import browser from "webextension-polyfill";

/**
 * Defines the structure for the settings object that will be stored.
 */
export interface ExtensionSettings {
  domain?: string;
  token?: string;
  defaultLabel?: string;
  keyboardShortcuts?: {
    openPopup?: string;
    fillCurrentField?: string;
  };
}

// A single key to store all settings under, to avoid cluttering the storage area.
const SETTINGS_KEY = "extension_settings";

/**
 * Saves the provided settings to `browser.storage.sync`.
 * Sync storage is used to automatically sync settings across a user's devices.
 *
 * @param settings - The settings object to save.
 * @returns A promise that resolves when the operation is complete.
 * @throws Will re-throw any error encountered during the save operation.
 */
export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  try {
    await browser.storage.sync.set({ [SETTINGS_KEY]: settings });
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw new Error("Could not save settings to browser storage.");
  }
}

/**
 * Loads settings from `browser.storage.sync`.
 *
 * @returns A promise that resolves to the loaded settings object.
 *          If no settings are found, it returns an empty object.
 * @throws Will re-throw any error encountered during the load operation.
 */
export async function loadSettings(): Promise<ExtensionSettings> {
  try {
    const storageResult = await browser.storage.sync.get(SETTINGS_KEY);
    // The result from the storage API is an object like: { extension_settings: { ... } }
    // We explicitly cast the result to our expected type to satisfy the linter,
    // and return it, or an empty object if it's not found.
    return (storageResult[SETTINGS_KEY] as ExtensionSettings) || {};
  } catch (error) {
    console.error("Failed to load settings:", error);
    throw new Error("Could not load settings from browser storage.");
  }
}
