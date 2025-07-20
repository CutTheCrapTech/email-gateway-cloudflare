import browser from "webextension-polyfill";
import { generateAliasForBackgroundWithUrl } from "./background-alias-generator";
import { ApiError } from "./errors";
import { loadSettings } from "./storage";

// Define message types
interface OpenOptionsMessage {
  action: "openOptionsPage";
}

interface FillEmailFieldMessage {
  type: "fill-email-field";
  alias: string;
  source?: "keyboard-shortcut";
}

interface GetCommandsMessage {
  action: "getCommands";
}

interface CommandsResponse {
  commands: browser.Commands.Command[];
}

type ExtensionMessage = OpenOptionsMessage | GetCommandsMessage;

/**
 * This background script is the extension's event handler.
 * It runs in the background and listens for important browser events.
 */

// Listen for the `onInstalled` event, which fires when the extension is installed,
// updated, or the browser is updated.
browser.runtime.onInstalled.addListener((details) => {
  // The `details` object contains information about the event.
  // We are only interested in the 'install' reason.
  if (details.reason === "install") {
    console.log("Extension successfully installed. Opening options page...");
    // This is a browser API call that opens the extension's options page.
    // The options page is defined in the `manifest.json` file.
    // We use `void` to explicitly mark the promise as intentionally unhandled.
    void browser.runtime.openOptionsPage();
  }

  // Create context menu item for generating aliases - show on all contexts
  // This allows users to right-click anywhere on a page and access the feature
  void browser.contextMenus.create({
    id: "generate-email-alias",
    title: "Generate Email Alias",
    contexts: [
      "page",
      "frame",
      "selection",
      "link",
      "editable",
      "image",
      "video",
      "audio",
    ],
    documentUrlPatterns: ["http://*/*", "https://*/*"],
  });
});

// Handle keyboard shortcuts defined in manifest.json
browser.commands.onCommand.addListener(async (command) => {
  console.log("Keyboard command received:", command);

  const [activeTab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.id) {
    console.error("No active tab found");
    return;
  }

  const tabId = activeTab.id;

  switch (command) {
    case "fill-current-field":
      await handleFillCurrentFieldCommand(tabId);
      break;
    default:
      console.warn("Unknown command:", command);
  }
});

async function handleFillCurrentFieldCommand(tabId: number): Promise<void> {
  try {
    const settings = await loadSettings();

    if (!settings.domain || !settings.token) {
      await showNotification(
        "Please configure domain and secret key in extension options first.",
        true,
      );
      await browser.runtime.openOptionsPage();
      return;
    }

    const tab = await browser.tabs.get(tabId);
    const alias = await generateAliasForBackgroundWithUrl(tab.url);

    // Ask the content script to copy the alias to the clipboard
    await browser.scripting.executeScript({
      target: { tabId },
      func: (text: string) => {
        navigator.clipboard.writeText(text);
      },
      args: [alias],
    });

    const scriptLoaded = await ensureContentScriptLoaded(tabId);

    if (!scriptLoaded) {
      await showNotification(
        "This page doesn't support the extension. Try refreshing the page.",
        true,
      );
      return;
    }

    await browser.tabs.sendMessage(tabId, {
      type: "fill-email-field",
      alias: alias,
    } as FillEmailFieldMessage);
  } catch (error) {
    console.error("Failed to handle fill-current-field command:", error);
    const errorMessage =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Failed to fill email field. Please try again.";
    await showNotification(errorMessage, true);
  }
}

/**
 * Show a user-friendly notification with enhanced styling and error handling
 */
async function showNotification(
  message: string,
  isError = false,
): Promise<void> {
  try {
    const iconUrl = isError ? "icons/icon48.png" : "icons/icon48.png";
    const title = isError
      ? "Email Alias Generator - Error"
      : "Email Alias Generator";

    await browser.notifications.create({
      type: "basic",
      iconUrl: iconUrl,
      title: title,
      message: message,
      priority: isError ? 2 : 1,
    });
  } catch (error) {
    console.error("Failed to show notification:", error);
    // Fallback: try to show a simple alert in content script if possible
    try {
      const [activeTab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (activeTab?.id) {
        await browser.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: (msg: string) => {
            console.log(`Extension: ${msg}`);
          },
          args: [message],
        });
      }
    } catch (fallbackError) {
      console.error("Fallback notification also failed:", fallbackError);
    }
  }
}

/**
 * Type guard to check if an object is a valid ping response.
 * @param obj The object to check
 * @returns True if the object matches the ping response structure
 */
function isPingResponse(obj: unknown): obj is { success?: boolean } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    ("success" in obj ? typeof obj.success === "boolean" : true)
  );
}

/**
 * Checks if the content script is available on a given tab.
 * @param tabId The ID of the tab to check
 * @returns Promise that resolves to true if content script is available
 */
async function isContentScriptAvailable(tabId: number): Promise<boolean> {
  try {
    const response: unknown = await browser.tabs.sendMessage(tabId, {
      type: "ping",
    });

    return isPingResponse(response) && Boolean(response.success);
  } catch {
    return false;
  }
}

/**
 * Ensures the content script is loaded on a tab, injecting it if necessary.
 * @param tabId The ID of the tab to check/inject
 * @returns Promise that resolves to true if script is loaded successfully
 */
async function ensureContentScriptLoaded(tabId: number): Promise<boolean> {
  try {
    // First check if it's already loaded
    if (await isContentScriptAvailable(tabId)) {
      return true;
    }

    // Try to inject the content script
    await browser.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });

    // Wait a moment for script to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    return await isContentScriptAvailable(tabId);
  } catch {
    console.error("Failed to inject content script");
    return false;
  }
}

// Handle context menu clicks
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "generate-email-alias" && tab?.id !== undefined) {
    const tabId = tab.id;
    // Reuse the same logic as the "fill-current-field" keyboard shortcut
    void handleFillCurrentFieldCommand(tabId);
  }
});

// Define response types
interface SuccessResponse {
  success: true;
}

interface ErrorResponse {
  success: false;
  error: string;
}

export type MessageResponse =
  | SuccessResponse
  | ErrorResponse
  | CommandsResponse;

// Define ping message type
interface PingMessage {
  type: "ping";
}

/**
 * Type guard to check if a message is a PingMessage.
 * @param message The message to check
 * @returns True if the message is a PingMessage
 */
function isPingMessage(message: unknown): message is PingMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    (message as { type: unknown }).type === "ping"
  );
}

/**
 * Type guard to check if a message is a GetCommandsMessage.
 * @param message The message to check
 * @returns True if the message is a GetCommandsMessage
 */
function isGetCommandsMessage(message: unknown): message is GetCommandsMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "action" in message &&
    (message as { action: unknown }).action === "getCommands"
  );
}

/**
 * Type guard to check if a message is a valid ExtensionMessage.
 * @param message The message to check
 * @returns True if the message is an ExtensionMessage
 */
function isExtensionMessage(message: unknown): message is ExtensionMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "action" in message &&
    typeof (message as { action: unknown }).action === "string"
  );
}

// Handle messages from popup/content scripts
browser.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    // Handle ping messages for content script availability check
    if (isPingMessage(message)) {
      sendResponse({ success: true });
      return true; // Indicate we handled the message
    }

    // Handle getCommands message to return current keyboard shortcuts
    if (isGetCommandsMessage(message)) {
      void (async () => {
        try {
          const commands = await browser.commands.getAll();
          sendResponse({ commands } as CommandsResponse);
        } catch (error) {
          console.error("Failed to get commands:", error);
          sendResponse({
            success: false,
            error: "Failed to get keyboard shortcuts",
          });
        }
      })();
      return true; // Keep message channel open for async response
    }

    if (!isExtensionMessage(message)) {
      sendResponse({ success: false, error: "Invalid message format" });
      return true; // Indicate we handled the message
    }

    if (message.action === "openOptionsPage") {
      void browser.runtime.openOptionsPage();
      sendResponse({ success: true });
      return true; // Indicate we handled the message
    }

    // Unknown message
    sendResponse({ success: false, error: "Unknown action" });
    return true; // Indicate we handled the message
  },
);
