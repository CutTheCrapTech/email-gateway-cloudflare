import browser from "webextension-polyfill";

// Interfaces for messaging between background and content scripts
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
    ["fill-email-field", "check-email-fields", "ping"].includes(
      (message as { type: string }).type,
    )
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
      }
      if (message.type === "fill-email-field") {
        fillEmailField(message.alias);
        sendResponse({ success: true });
        return true; // Indicate we handled the message
      }
      if (message.type === "check-email-fields") {
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
  // Use computed style to check for visibility, which works in JSDOM
  const style = window.getComputedStyle(elem);
  return style.display !== "none" && style.visibility !== "hidden";
}
