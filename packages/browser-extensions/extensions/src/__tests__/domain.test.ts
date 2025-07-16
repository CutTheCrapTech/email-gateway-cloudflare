import psl from "psl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractDomainForSource, getDefaultLabel } from "../domain";
import { loadSettings } from "../storage";

declare global {
  interface Global {
    window?: unknown;
    location?: unknown;
  }
}

// Mock the dependencies
vi.mock("../storage", () => ({
  loadSettings: vi.fn(),
}));

vi.mock("psl", () => ({
  default: {
    parse: vi.fn(),
  },
}));

// Mock browser extension API
vi.mock("webextension-polyfill", () => ({
  default: {
    storage: {
      sync: {
        get: vi.fn(),
      },
    },
  },
}));

describe("Domain Module", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Reset global objects
    delete (global as Global).window;
    delete (global as Global).location;
  });

  describe("extractDomainForSource", () => {
    it("should extract domain from provided URL", () => {
      vi.mocked(psl.parse).mockReturnValue({
        tld: "com",
        domain: "example.com",
        subdomain: "www",
        sld: "example",
        listed: true,
        input: "www.example.com",
        error: undefined,
      });

      const result = extractDomainForSource("https://www.example.com/path");
      expect(result).toBe("example");
    });

    it("should extract domain from current page when no URL provided", () => {
      // Mock window.location
      Object.defineProperty(global, "window", {
        value: {
          location: {
            hostname: "subdomain.example.com",
          },
        },
        writable: true,
        configurable: true,
      });

      vi.mocked(psl.parse).mockReturnValue({
        tld: "com",
        domain: "example.com",
        subdomain: "subdomain",
        sld: "example",
        listed: true,
        input: "subdomain.example.com",
        error: undefined,
      });

      const result = extractDomainForSource();
      expect(result).toBe("example");
    });

    it("should remove www subdomain before processing", () => {
      vi.mocked(psl.parse).mockReturnValue({
        tld: "com",
        domain: "google.com",
        subdomain: null,
        sld: "google",
        listed: true,
        input: "google.com",
        error: undefined,
      });

      const result = extractDomainForSource("https://www.google.com");
      expect(result).toBe("google");
      expect(psl.parse).toHaveBeenCalledWith("google.com");
    });

    it("should handle complex TLDs using psl", () => {
      vi.mocked(psl.parse).mockReturnValue({
        tld: "co.uk",
        domain: "example.co.uk",
        subdomain: "subdomain",
        sld: "example",
        listed: true,
        input: "subdomain.example.co.uk",
        error: undefined,
      });

      const result = extractDomainForSource("https://subdomain.example.co.uk");
      expect(result).toBe("example");
    });

    it("should handle public suffixes with subdomain fallback", () => {
      vi.mocked(psl.parse).mockReturnValue({
        tld: "herokuapp.com",
        domain: "myapp.herokuapp.com",
        subdomain: "myapp.herokuapp",
        sld: null,
        listed: true,
        input: "myapp.herokuapp.com",
        error: undefined,
      });

      const result = extractDomainForSource("https://myapp.herokuapp.com");
      expect(result).toBe("myapp");
    });

    it("should handle AWS services correctly", () => {
      vi.mocked(psl.parse).mockReturnValue({
        tld: "amazonaws.com",
        domain: "s3.amazonaws.com",
        subdomain: null,
        sld: null,
        listed: true,
        input: "s3.amazonaws.com",
        error: undefined,
      });

      const result = extractDomainForSource("https://s3.amazonaws.com");
      expect(result).toBe("amazonaws");
    });

    it("should fallback to simple split when psl fails", () => {
      vi.mocked(psl.parse).mockReturnValue({
        error: {
          code: "DOMAIN_TOO_SHORT",
          message: "Parse error",
        },
        input: "test.example.com",
      });

      const result = extractDomainForSource("https://test.example.com");
      expect(result).toBe("example");
    });

    it("should handle single part domains", () => {
      vi.mocked(psl.parse).mockReturnValue({
        error: {
          code: "DOMAIN_TOO_SHORT",
          message: "Parse error",
        },
        input: "localhost",
      });

      const result = extractDomainForSource("https://localhost");
      expect(result).toBe("localhost");
    });

    it("should return empty string on invalid URL", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = extractDomainForSource("invalid-url");
      expect(result).toBe("");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error extracting domain for source:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("should handle edge cases with empty domain parts", () => {
      vi.mocked(psl.parse).mockReturnValue({
        tld: "com",
        domain: "example.com",
        subdomain: null,
        sld: null,
        listed: true,
        input: "..example.com",
        error: undefined,
      });

      const result = extractDomainForSource("https://..example.com");
      expect(result).toBe("example");
    });

    it("should handle GitHub Pages domains", () => {
      vi.mocked(psl.parse).mockReturnValue({
        tld: "github.io",
        domain: "username.github.io",
        subdomain: "username.github",
        sld: null,
        listed: true,
        input: "username.github.io",
        error: undefined,
      });

      const result = extractDomainForSource("https://username.github.io");
      expect(result).toBe("username");
    });
  });

  describe("getDefaultLabel", () => {
    it("should return label from stored settings", async () => {
      vi.mocked(loadSettings).mockResolvedValue({
        defaultLabel: "custom-label",
      });

      const result = await getDefaultLabel();
      expect(result).toBe("custom-label");
    });

    it("should return default 'marketing' when no stored settings", async () => {
      vi.mocked(loadSettings).mockResolvedValue({});

      const result = await getDefaultLabel();
      expect(result).toBe("marketing");
    });

    it("should return default 'marketing' when defaultLabel is not a string", async () => {
      vi.mocked(loadSettings).mockResolvedValue({
        defaultLabel: 123 as unknown as string, // Not a string
      });

      const result = await getDefaultLabel();
      expect(result).toBe("marketing");
    });

    it("should return default 'marketing' when browser storage is unavailable", async () => {
      // Temporarily mock browser as undefined
      vi.doMock("webextension-polyfill", () => ({
        default: undefined,
      }));

      // Re-import the module to get the new mock
      const { getDefaultLabel } = await import("../domain");

      const result = await getDefaultLabel();
      expect(result).toBe("marketing");
    });

    it("should handle loadSettings error and return default", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(loadSettings).mockRejectedValue(new Error("Storage error"));

      const result = await getDefaultLabel();
      expect(result).toBe("marketing");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error getting default label:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("should handle browser storage without storage property", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Temporarily mock browser without storage
      vi.doMock("webextension-polyfill", () => ({
        default: {},
      }));

      // Re-import the module to get the new mock
      const { getDefaultLabel } = await import("../domain");

      const result = await getDefaultLabel();
      expect(result).toBe("marketing");

      consoleSpy.mockRestore();
    });

    it("should handle empty string defaultLabel", async () => {
      vi.mocked(loadSettings).mockResolvedValue({
        defaultLabel: "",
      });

      const result = await getDefaultLabel();
      expect(result).toBe("marketing");
    });

    it("should handle whitespace-only defaultLabel", async () => {
      vi.mocked(loadSettings).mockResolvedValue({
        defaultLabel: "   ",
      });

      const result = await getDefaultLabel();
      expect(result).toBe("   ");
    });
  });
});
