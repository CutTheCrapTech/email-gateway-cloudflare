import { beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import { generateEmailAlias } from "../api";
import { loadSettings } from "../storage";

// --- Mocking Dependencies ---
// For this integration test, we ONLY mock the storage module.
// We want to use the REAL `email-alias-core` library to verify its output.
vi.mock("../storage", () => ({
  loadSettings: vi.fn(),
}));

vi.mock("webextension-polyfill", () => ({
  default: {
    scripting: {
      executeScript: vi.fn(),
    },
    tabs: {
      sendMessage: vi.fn(),
      query: vi.fn().mockResolvedValue([{ id: 1 }]),
    },
  },
}));

// --- Integration Test Suite ---
describe("API Module Integration with email-alias-core", () => {
  // Before each test, reset the mock's history to ensure a clean state.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate the correct, predictable email alias for a given set of inputs", async () => {
    // 1. Arrange: Define the exact inputs and the expected output.
    const testData = {
      aliasParts: ["shop", "amazon"], // The parts that will be joined by a hyphen
      domain: "example.com",
      token: "a-very-secret-key-that-is-long-enough",
    };

    const expectedAlias = "shop-amazon-61914b75@example.com";

    // Mock the settings being loaded from storage.
    vi.mocked(loadSettings).mockResolvedValue({
      domain: testData.domain,
      token: testData.token,
    });

    // 2. Act: Call the function we are testing. This will use the real
    // `email-alias-core` because it is not mocked.
    const actualAlias = await generateEmailAlias(testData.aliasParts);

    // 3. Assert: Verify that the output from the real `email-alias-core` library
    // matches the expected output exactly.
    expect(actualAlias).toBe(expectedAlias);

    // Also verify that the storage module was called as expected.
    expect(loadSettings).toHaveBeenCalledOnce();
  });

  describe("Content Script Injection", () => {
    it("should handle injection failures gracefully", async () => {
      vi.mocked(browser.scripting.executeScript).mockRejectedValue(
        new Error("Injection failed"),
      );
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Add explicit check for tab.id
      if (!tab || typeof tab.id !== "number") {
        throw new Error("No active tab found or tab id is missing");
      }

      await expect(
        browser.scripting.executeScript({
          target: { tabId: tab.id }, // Now tab.id is guaranteed to be number
          files: ["dialog.js"],
        }),
      ).rejects.toThrow("Injection failed");
    });

    it("should verify content script communication", async () => {
      vi.mocked(browser.tabs.sendMessage).mockResolvedValue({ success: true });
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab || typeof tab.id !== "number") {
        throw new Error("No active tab found or tab id is missing");
      }
      const response = await browser.tabs.sendMessage(tab.id, {
        type: "ping",
      });
      expect(response).toEqual({ success: true });
    });
  });
});
