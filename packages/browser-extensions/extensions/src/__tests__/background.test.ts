import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import type { MessageResponse } from "../background";
import * as aliasGenerator from "../background-alias-generator";
import * as storage from "../storage";

// Mock the browser extension API
vi.mock("webextension-polyfill", () => ({
  default: {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn() },
      openOptionsPage: vi.fn(),
      sendMessage: vi.fn(),
    },
    commands: {
      onCommand: { addListener: vi.fn() },
      getAll: vi.fn(),
    },
    contextMenus: {
      create: vi.fn(),
      onClicked: { addListener: vi.fn() },
    },
    tabs: {
      query: vi.fn(() => Promise.resolve([] as browser.Tabs.Tab[])),
      sendMessage: vi.fn(() => Promise.resolve({ success: true })),
      get: vi.fn(() => Promise.resolve({} as browser.Tabs.Tab)),
    },
    notifications: {
      create: vi.fn(),
    },
    scripting: {
      executeScript: vi.fn(),
    },
  },
}));

// Mock other dependencies
vi.mock("../storage", () => ({
  loadSettings: vi.fn(),
}));

vi.mock("../background-alias-generator", () => ({
  generateAliasForBackgroundWithUrl: vi.fn(),
}));

describe("background.ts", () => {
  const mockBrowser = vi.mocked(browser);
  const mockLoadSettings = vi.mocked(storage.loadSettings);
  const mockGenerateAlias = vi.mocked(
    aliasGenerator.generateAliasForBackgroundWithUrl,
  );

  beforeEach(async () => {
    // Reset mocks before each test to ensure a clean state
    vi.clearAllMocks();

    // Mock default return values
    mockLoadSettings.mockResolvedValue({
      domain: "example.com",
      token: "secret-token",
      defaultLabel: "test",
    });
    mockGenerateAlias.mockResolvedValue("alias@example.com");
    (mockBrowser.tabs.query as Mock).mockResolvedValue([
      { id: 1, url: "https://example.com" },
    ]);
    (mockBrowser.tabs.get as Mock).mockResolvedValue({
      id: 1,
      url: "https://example.com",
    } as browser.Tabs.Tab);
    (mockBrowser.tabs.sendMessage as Mock).mockResolvedValue({
      success: true,
    });

    // Dynamically import the module to run its setup code
    await import("../background");
  });

  afterEach(() => {
    // Reset modules to ensure the background script is re-initialized for each test
    vi.resetModules();
  });

  it("should add all event listeners on initialization", () => {
    expect(mockBrowser.runtime.onInstalled.addListener).toHaveBeenCalledTimes(
      1,
    );
    expect(mockBrowser.commands.onCommand.addListener).toHaveBeenCalledTimes(1);
    expect(
      mockBrowser.contextMenus.onClicked.addListener,
    ).toHaveBeenCalledTimes(1);
    expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
  });

  describe("onInstalled listener", () => {
    it("should open options page and create context menu on first install", () => {
      // Capture the callback passed to onInstalled.addListener
      const onInstalledCallback = vi.mocked(
        mockBrowser.runtime.onInstalled.addListener,
      ).mock.calls[0]?.[0] as (
        details: browser.Runtime.OnInstalledDetailsType,
      ) => void;

      // Simulate the 'install' event
      onInstalledCallback({ reason: "install", temporary: false });

      // Verify that the options page was opened
      expect(mockBrowser.runtime.openOptionsPage).toHaveBeenCalledTimes(1);

      // Verify that the context menu was created
      expect(mockBrowser.contextMenus.create).toHaveBeenCalledTimes(1);
      expect(mockBrowser.contextMenus.create).toHaveBeenCalledWith({
        id: "generate-email-alias",
        title: "Generate Email Alias",
        contexts: expect.any(Array),
        documentUrlPatterns: ["http://*/*", "https://*/*"],
      });
    });

    it("should not open options page on update", () => {
      // Capture the callback
      const onInstalledCallback = vi.mocked(
        mockBrowser.runtime.onInstalled.addListener,
      ).mock.calls[0]?.[0] as (
        details: browser.Runtime.OnInstalledDetailsType,
      ) => void;

      // Simulate the 'update' event
      onInstalledCallback({
        reason: "update",
        previousVersion: "1.0",
        temporary: false,
      });

      // Verify that the options page was NOT opened
      expect(mockBrowser.runtime.openOptionsPage).not.toHaveBeenCalled();
    });
  });

  describe("onCommand listener", () => {
    let onCommandCallback: (command: string) => Promise<void>;

    beforeEach(() => {
      onCommandCallback = vi.mocked(mockBrowser.commands.onCommand.addListener)
        .mock.calls[0]?.[0] as (
        command: string,
        tab?: browser.Tabs.Tab,
      ) => Promise<void>;
    });

    it("should handle 'fill-current-field' command successfully", async () => {
      // Mock that the content script is available
      vi.mocked(browser.tabs.sendMessage).mockResolvedValue({ success: true });

      await onCommandCallback("fill-current-field");

      // Verify settings were loaded
      expect(mockLoadSettings).toHaveBeenCalledTimes(1);
      // Verify alias was generated
      expect(mockGenerateAlias).toHaveBeenCalledWith("https://example.com");
      // Verify message was sent to the content script
      expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: "fill-email-field",
        alias: "alias@example.com",
      });
      // Verify no notification was shown
      expect(mockBrowser.notifications.create).not.toHaveBeenCalled();
    });

    it("should open options page if settings are not configured", async () => {
      // Mock that settings are not configured
      mockLoadSettings.mockResolvedValue({
        domain: "",
        token: "",
        defaultLabel: "",
      });

      await onCommandCallback("fill-current-field");

      // Verify notification was shown
      expect(mockBrowser.notifications.create).toHaveBeenCalledTimes(1);
      // Verify options page was opened
      expect(mockBrowser.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
      // Verify no alias was generated or message sent
      expect(mockGenerateAlias).not.toHaveBeenCalled();
      expect(mockBrowser.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("onMessage listener", () => {
    let onMessageCallback: (
      message: unknown,
      sender: browser.Runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void,
    ) => void;

    beforeEach(() => {
      onMessageCallback = vi.mocked(mockBrowser.runtime.onMessage.addListener)
        .mock.calls[0]?.[0] as (
        message: unknown,
        sender: browser.Runtime.MessageSender,
        sendResponse: (response: MessageResponse) => void,
      ) => void;
    });

    it("should handle 'openOptionsPage' message", () => {
      onMessageCallback({ action: "openOptionsPage" }, {}, () => {});
      expect(mockBrowser.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
    });

    it("should handle 'getCommands' message", async () => {
      const sendResponse = vi.fn<() => void>();
      const mockCommands = [{ name: "test-command", shortcut: "Ctrl+Shift+Y" }];
      vi.mocked(browser.commands.getAll).mockResolvedValue(
        mockCommands as browser.Commands.Command[],
      );

      // The listener returns a promise, so we need to await it
      await onMessageCallback({ action: "getCommands" }, {}, sendResponse);

      expect(browser.commands.getAll).toHaveBeenCalledTimes(1);
      expect(sendResponse).toHaveBeenCalledWith({ commands: mockCommands });
    });

    it("should handle 'ping' message", () => {
      const sendResponse = vi.fn<() => void>();
      onMessageCallback({ type: "ping" }, {}, sendResponse);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it("should handle unknown messages", () => {
      const sendResponse = vi.fn<() => void>();
      onMessageCallback({ action: "unknown" }, {}, sendResponse);
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Unknown action",
      });
    });
  });
});
