/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import browser from "webextension-polyfill";
import * as api from "../api";
import * as domain from "../domain";

// Mock the browser extension API
vi.mock("webextension-polyfill", () => ({
  default: {
    runtime: {
      sendMessage: vi.fn(),
    },
    tabs: {
      query: vi.fn(),
      sendMessage: vi.fn(),
    },
  },
}));

// Mock other dependencies
vi.mock("../api", () => ({
  generateEmailAlias: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

vi.mock("../domain", () => ({
  extractDomainForSource: vi.fn(),
  getDefaultLabel: vi.fn(),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe("popup.ts", () => {
  const mockBrowser = vi.mocked(browser);
  const mockApi = vi.mocked(api);
  const mockDomain = vi.mocked(domain);

  // This beforeEach is safe as it only resets mocks, not the DOM
  beforeEach(() => {
    vi.resetModules(); // Ensure the popup script is re-imported and re-run
    vi.clearAllMocks();

    // Setup mock implementations for each test
    vi.mocked(mockBrowser.tabs.query).mockResolvedValue([
      { id: 1, url: "https://www.example.com/page" } as browser.Tabs.Tab,
    ]);
    mockDomain.extractDomainForSource.mockReturnValue("example.com");
    mockDomain.getDefaultLabel.mockResolvedValue("shopping");
    mockApi.generateEmailAlias.mockResolvedValue(
      "shopping.example.com@test.com",
    );
  });

  const setupDOM = () => {
    document.body.innerHTML = `
      <div>
        <input id="label-input" />
        <input id="source-input" />
        <button id="generate-btn">Generate</button>
        <div id="error-container" class="hidden"></div>
      </div>
    `;
  };

  const loadAndRunPopup = async () => {
    // Import the script and then dispatch the DOMContentLoaded event
    await import("../popup");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    // Allow any microtasks from the script to run
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  it("should initialize and auto-fill the input fields", async () => {
    setupDOM();
    await loadAndRunPopup();

    const labelInput = document.getElementById(
      "label-input",
    ) as HTMLInputElement;
    const sourceInput = document.getElementById(
      "source-input",
    ) as HTMLInputElement;

    expect(mockDomain.extractDomainForSource).toHaveBeenCalledWith(
      "https://www.example.com/page",
    );
    expect(mockDomain.getDefaultLabel).toHaveBeenCalled();
    expect(labelInput.value).toBe("shopping");
    expect(sourceInput.value).toBe("example.com");
  });

  it("should generate an alias when the button is clicked", async () => {
    setupDOM();
    await loadAndRunPopup();

    const generateBtn = document.getElementById(
      "generate-btn",
    ) as HTMLButtonElement;
    const labelInput = document.getElementById(
      "label-input",
    ) as HTMLInputElement;
    const sourceInput = document.getElementById(
      "source-input",
    ) as HTMLInputElement;

    labelInput.value = "test-label";
    sourceInput.value = "test-source";

    generateBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0)); // Allow promises to resolve

    expect(mockApi.generateEmailAlias).toHaveBeenCalledWith([
      "test-label",
      "test-source",
    ]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "shopping.example.com@test.com",
    );
    expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: "fill-email-field",
      alias: "shopping.example.com@test.com",
    });
  });

  it("should show an error message if generation fails", async () => {
    const apiError = new api.ApiError("Test API Error");
    mockApi.generateEmailAlias.mockRejectedValue(apiError);

    setupDOM();
    await loadAndRunPopup();

    const generateBtn = document.getElementById(
      "generate-btn",
    ) as HTMLButtonElement;
    const errorContainer = document.getElementById(
      "error-container",
    ) as HTMLDivElement;
    const labelInput = document.getElementById(
      "label-input",
    ) as HTMLInputElement;
    const sourceInput = document.getElementById(
      "source-input",
    ) as HTMLInputElement;

    labelInput.value = "test-label";
    sourceInput.value = "test-source";

    generateBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0)); // Allow promises to resolve

    expect(errorContainer.textContent).toContain("Test API Error");
    expect(errorContainer.classList.contains("hidden")).toBe(false);
  });
});
