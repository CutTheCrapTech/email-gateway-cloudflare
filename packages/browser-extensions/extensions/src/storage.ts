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
 * Saves the provided settings to `browser.storage.local`.
 * Sync storage is used to automatically sync settings across a user's devices.
 *
 * @param settings - The settings object to save.
 * @returns A promise that resolves when the operation is complete.
 * @throws Will re-throw any error encountered during the save operation.
 */
export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  try {
    await browser.storage.local.set({ [SETTINGS_KEY]: settings });
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw new Error("Could not save settings to browser storage.");
  }
}

/**
 * Loads settings from `browser.storage.local`.
 *
 * @returns A promise that resolves to the loaded settings object.
 *          If no settings are found, it returns an empty object.
 * @throws Will re-throw any error encountered during the load operation.
 */
export async function loadSettings(): Promise<ExtensionSettings> {
  try {
    const storageResult = await browser.storage.local.get(SETTINGS_KEY);
    const settings = storageResult[SETTINGS_KEY];
    // Ensure the loaded value is a non-null object before returning.
    if (typeof settings === "object" && settings !== null) {
      return settings as ExtensionSettings;
    }
    // Return an empty object for any other case (undefined, null, corrupted data).
    return {};
  } catch (error) {
    console.error("Failed to load settings:", error);
    throw new Error("Could not load settings from browser storage.");
  }
}
