import { generateEmailAlias as coreGenerateAlias } from "email-alias-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, generateEmailAlias } from "../api";
import { loadSettings } from "../storage";

// Mock the dependencies of api.ts to isolate the module for testing
vi.mock("../storage", () => ({
  loadSettings: vi.fn(),
}));
vi.mock("email-alias-core", () => ({
  generateEmailAlias: vi.fn(),
}));

describe("API Module: generateEmailAlias", () => {
  const validSettings = {
    domain: "example.com",
    token: "super-secret-token",
  };

  beforeEach(() => {
    // Reset mocks before each test to ensure test isolation
    vi.clearAllMocks();
  });

  it("should call the core library with the correct parameters when input is valid", async () => {
    // Arrange
    const aliasParts = ["shopping", "amazon"];
    vi.mocked(loadSettings).mockResolvedValue(validSettings);
    vi.mocked(coreGenerateAlias).mockResolvedValue("test-alias@example.com");

    // Act
    await generateEmailAlias(aliasParts);

    // Assert
    expect(coreGenerateAlias).toHaveBeenCalledOnce();
    expect(coreGenerateAlias).toHaveBeenCalledWith({
      aliasParts,
      domain: validSettings.domain,
      secretKey: validSettings.token,
    });
  });

  describe("Input Validation Errors", () => {
    const expectedError =
      "Invalid input: exactly two parts (Label and Source) are required.";

    it("should throw an ApiError if aliasParts array is empty", async () => {
      try {
        await generateEmailAlias([]);
        expect.fail("Expected function to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe(expectedError);
      }
    });

    it("should throw an ApiError if aliasParts array has only one element", async () => {
      try {
        await generateEmailAlias(["shopping"]);
        expect.fail("Expected function to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe(expectedError);
      }
    });

    it("should throw an ApiError if aliasParts array has more than two elements", async () => {
      try {
        await generateEmailAlias(["a", "b", "c"]);
        expect.fail("Expected function to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe(expectedError);
      }
    });

    it("should throw an ApiError if any part in the array is an empty string", async () => {
      const errorMessage = "Both Label and Source fields are required.";
      try {
        await generateEmailAlias(["shopping", ""]);
        expect.fail("Expected function to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe(errorMessage);
      }
    });

    it("should throw an ApiError if any part in the array is just whitespace", async () => {
      const errorMessage = "Both Label and Source fields are required.";
      try {
        await generateEmailAlias(["   ", "amazon"]);
        expect.fail("Expected function to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe(errorMessage);
      }
    });
  });

  describe("Configuration Validation Errors", () => {
    it("should throw an ApiError if settings are not configured", async () => {
      // Arrange
      vi.mocked(loadSettings).mockResolvedValue({});

      // Act & Assert
      try {
        await generateEmailAlias(["test", "case"]);
        expect.fail("Expected function to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toMatch(
          /Domain and Token are not configured/,
        );
      }
    });
  });

  describe("Core Library Error Handling", () => {
    it("should catch errors from email-alias-core and re-throw as an ApiError", async () => {
      // Arrange
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(loadSettings).mockResolvedValue(validSettings);
      const coreError = new Error("Invalid character in token");
      vi.mocked(coreGenerateAlias).mockRejectedValue(coreError);

      // Act & Assert
      await expect(generateEmailAlias(["test", "case"])).rejects.toThrow(
        `Failed to generate alias: ${coreError.message}`,
      );
      consoleSpy.mockRestore();
    });

    it("should handle special characters in alias parts", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(loadSettings).mockResolvedValue({
        domain: "example.com",
        token: "secret",
      });
      await expect(
        generateEmailAlias(["shopping!", "amazon$"]),
      ).rejects.toThrow("Failed to generate alias: Invalid character in token");
      consoleSpy.mockRestore();
    });

    it("should handle very long alias parts", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(loadSettings).mockResolvedValue({
        domain: "example.com",
        token: "secret",
      });
      const longString = "a".repeat(100);
      await expect(generateEmailAlias([longString, "service"])).rejects.toThrow(
        "Failed to generate alias: Invalid character in token",
      );
      consoleSpy.mockRestore();
    });

    it("should reject invalid tokens", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(loadSettings).mockResolvedValue({
        domain: "example.com",
        token: "short", // Too short
      });
      await expect(generateEmailAlias(["test", "case"])).rejects.toThrow(
        "Failed to generate alias",
      );
      consoleSpy.mockRestore();
    });
  });
});
