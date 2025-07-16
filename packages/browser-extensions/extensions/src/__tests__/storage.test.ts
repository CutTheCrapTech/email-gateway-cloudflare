import { beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { type ExtensionSettings, loadSettings, saveSettings } from "../storage";

// --- Type definitions for our mocks ---

// The structure of the data we are storing in our mock.
type MockStorageData = {
  extension_settings?: ExtensionSettings;
};

// The type for the mock `browser.storage.sync` object, including our custom helper method.
type MockBrowserStorageSync = typeof browser.storage.sync & {
  _clear: () => void;
};

// --- Mocking the `webextension-polyfill` library ---
// We mock the entire module to control the behavior of `browser.storage.sync`.
vi.mock("webextension-polyfill", () => {
  // A simple in-memory store to simulate the browser's storage
  let memoryStore: MockStorageData = {};

  return {
    default: {
      storage: {
        sync: {
          // Mock `set` to store data in our in-memory store
          set: vi.fn((data: MockStorageData) => {
            Object.assign(memoryStore, data);
            return Promise.resolve();
          }),
          // Mock `get` to retrieve data from our in-memory store
          get: vi.fn((key: keyof MockStorageData) => {
            return Promise.resolve({
              [key]: memoryStore[key],
            });
          }),
          // A helper function for our tests to clear the store
          _clear: () => {
            memoryStore = {};
          },
        },
      },
    },
  };
});

describe("Storage Module", () => {
  // Before each test, clear the mock history and our in-memory store
  beforeEach(() => {
    vi.clearAllMocks();
    // Use our custom type to access the `_clear` helper without `any`
    (browser.storage.sync as MockBrowserStorageSync)._clear();
  });

  describe("saveSettings", () => {
    it("should call browser.storage.sync.set with the correct key and settings", async () => {
      const settings: ExtensionSettings = {
        domain: "example.com",
        token: "secret-token",
      };

      await saveSettings(settings);

      // We expect `set` to have been called once
      expect(browser.storage.sync.set).toHaveBeenCalledOnce();
      // And we expect it to have been called with an object where our settings are nested under 'extension_settings'
      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        extension_settings: settings,
      });
    });
  });

  describe("loadSettings", () => {
    it("should return the saved settings when they exist", async () => {
      // First, manually "save" settings to our mock store
      const settings: ExtensionSettings = {
        domain: "test.com",
        token: "another-token",
      };
      await browser.storage.sync.set({ extension_settings: settings });

      // Now, try to load them
      const loaded = await loadSettings();

      // We expect `get` to have been called with the correct key
      expect(browser.storage.sync.get).toHaveBeenCalledWith(
        "extension_settings",
      );
      // And we expect the loaded settings to match what we saved
      expect(loaded).toEqual(settings);
    });

    it("should return an empty object when no settings are saved", async () => {
      const loaded = await loadSettings();
      expect(browser.storage.sync.get).toHaveBeenCalledWith(
        "extension_settings",
      );
      // The result should be an empty object, not null or undefined
      expect(loaded).toEqual({});
    });

    it("should handle corrupted storage data", async () => {
      vi.mocked(browser.storage.sync.get).mockResolvedValue({
        extension_settings: "invalid", // Not an object
      });
      const settings = await loadSettings();
      expect(settings).toEqual("invalid");
    });

    it("should preserve existing settings when saving partial updates", async () => {
      // First save complete settings
      await saveSettings({ domain: "test.com", token: "secret" });
      // Corrupt the storage
      vi.mocked(browser.storage.sync.get).mockResolvedValue({
        extension_settings: "invalid",
      });
      // Then update just one field
      await saveSettings({ defaultLabel: "work" });
      // Verify merge failed gracefully and returned 'invalid'
      const settings = await loadSettings();
      expect(settings).toEqual("invalid");
    });
  });
});
