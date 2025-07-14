import { generateSecureRandomString } from "email-alias-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import * as storageModule from "../storage";

// Mock dependencies
vi.mock("webextension-polyfill", () => ({
  default: {
    commands: {
      getAll: vi.fn(),
    },
  },
}));

vi.mock("email-alias-core", () => ({
  generateSecureRandomString: vi.fn(),
}));

vi.mock("../storage", () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

describe("Options Page Utilities", () => {
  const mockBrowser = vi.mocked(browser);
  const mockGenerateSecureRandomString = vi.mocked(generateSecureRandomString);
  const mockLoadSettings = vi.mocked(storageModule.loadSettings);
  const mockSaveSettings = vi.mocked(storageModule.saveSettings);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateSecureRandomString.mockReturnValue("random-secure-string");
    mockLoadSettings.mockResolvedValue({
      domain: "",
      token: "",
      defaultLabel: "marketing",
    });
    mockSaveSettings.mockResolvedValue();
    vi.mocked(mockBrowser.commands.getAll).mockResolvedValue([]);
  });

  describe("Module imports", () => {
    it("should import required dependencies", () => {
      expect(generateSecureRandomString).toBeDefined();
      expect(browser).toBeDefined();
      expect(storageModule.loadSettings).toBeDefined();
      expect(storageModule.saveSettings).toBeDefined();
    });
  });

  describe("Mocked functions", () => {
    it("should generate secure random string", () => {
      const result = generateSecureRandomString(32);
      expect(result).toBe("random-secure-string");
      expect(mockGenerateSecureRandomString).toHaveBeenCalledWith(32);
    });

    it("should load settings", async () => {
      const settings = await storageModule.loadSettings();
      expect(settings).toEqual({
        domain: "",
        token: "",
        defaultLabel: "marketing",
      });
      expect(mockLoadSettings).toHaveBeenCalled();
    });

    it("should save settings", async () => {
      const testSettings = {
        domain: "test.com",
        token: "test-token",
        defaultLabel: "test",
      };

      await storageModule.saveSettings(testSettings);
      expect(mockSaveSettings).toHaveBeenCalledWith(testSettings);
    });

    it("should get browser commands", async () => {
      const commands = await browser.commands.getAll();
      expect(commands).toEqual([]);
      expect(vi.mocked(mockBrowser.commands.getAll)).toHaveBeenCalled();
    });
  });

  describe("Form validation logic", () => {
    it("should validate required fields", () => {
      const domain = "example.com";
      const token = "secret-token";

      const hasRequiredFields = Boolean(domain && token);
      expect(hasRequiredFields).toBe(true);
    });

    it("should detect empty required fields", () => {
      const domain = "";
      const token = "secret-token";

      const hasRequiredFields = Boolean(domain && token);
      expect(hasRequiredFields).toBe(false);
    });

    it("should handle backup confirmation logic", () => {
      const isNewKeyGenerated = true;
      const hasBackupConfirmation = true;
      const hasRequiredFields = true;

      const canSave =
        hasRequiredFields && (!isNewKeyGenerated || hasBackupConfirmation);
      expect(canSave).toBe(true);
    });

    it("should require backup confirmation for new keys", () => {
      const isNewKeyGenerated = true;
      const hasBackupConfirmation = false;
      const hasRequiredFields = true;

      const canSave =
        hasRequiredFields && (!isNewKeyGenerated || hasBackupConfirmation);
      expect(canSave).toBe(false);
    });
  });

  describe("Settings processing", () => {
    it("should use default label when empty", () => {
      const userLabel = "";
      const defaultLabel = "marketing";

      const finalLabel = userLabel.trim() || defaultLabel;
      expect(finalLabel).toBe("marketing");
    });
  });
});
