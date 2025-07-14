/**
 * @license MIT
 * @copyright 2025 karteekiitg
 */

import { jest } from "@jest/globals";

describe("crypto.ts", () => {
  const originalGlobalThisCrypto = globalThis.crypto;
  const originalWindowCrypto = globalThis.window?.crypto;
  const originalSelfCrypto = globalThis.self?.crypto;
  const originalGlobalRequire = global.require;

  // Mock SubtleCrypto for testing
  const createMockSubtleCrypto = () => ({
    importKey: jest.fn(),
    sign: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    digest: jest.fn(),
    generateKey: jest.fn(),
    deriveKey: jest.fn(),
    deriveBits: jest.fn(),
    exportKey: jest.fn(),
    wrapKey: jest.fn(),
    unwrapKey: jest.fn(),
    verify: jest.fn(),
  });

  // Mock getRandomValues for testing
  const createMockGetRandomValues = () =>
    jest.fn().mockImplementation((...args: unknown[]) => {
      const array = args[0] as Uint8Array;
      // Fill with predictable values for testing
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
      }
      return array;
    });

  // Create mock crypto with both subtle and getRandomValues
  const createMockCrypto = () => ({
    subtle: createMockSubtleCrypto(),
    getRandomValues: createMockGetRandomValues(),
  });

  beforeEach(() => {
    // Clear module cache for crypto.ts to ensure fresh import in each test
    jest.resetModules();

    // Reset global crypto objects to their original state before each test
    Object.defineProperty(globalThis, "crypto", {
      value: originalGlobalThisCrypto,
      writable: true,
      configurable: true,
    });

    if (globalThis.window) {
      Object.defineProperty(globalThis.window, "crypto", {
        value: originalWindowCrypto,
        writable: true,
        configurable: true,
      });
    } else {
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
    }

    if (globalThis.self) {
      Object.defineProperty(globalThis.self, "crypto", {
        value: originalSelfCrypto,
        writable: true,
        configurable: true,
      });
    } else {
      Object.defineProperty(globalThis, "self", {
        value: undefined,
        writable: true,
        configurable: true,
      });
    }

    // Restore original global.require
    global.require = originalGlobalRequire;
  });

  afterAll(() => {
    // Restore original global objects after all tests are done
    Object.defineProperty(globalThis, "crypto", {
      value: originalGlobalThisCrypto,
      writable: true,
      configurable: true,
    });
    if (globalThis.window) {
      Object.defineProperty(globalThis.window, "crypto", {
        value: originalWindowCrypto,
        writable: true,
        configurable: true,
      });
    }
    if (globalThis.self) {
      Object.defineProperty(globalThis.self, "crypto", {
        value: originalSelfCrypto,
        writable: true,
        configurable: true,
      });
    }
    global.require = originalGlobalRequire;
  });

  it("should use globalThis.crypto if available (modern browser/worker environment)", async () => {
    const mockCrypto = createMockCrypto();

    Object.defineProperty(globalThis, "crypto", {
      value: mockCrypto,
      writable: true,
      configurable: true,
    });

    // Ensure other crypto sources are undefined
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "self", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { crypto: importedCrypto } = await import("../crypto.js");

    // Test that the crypto object has the expected interface
    expect(importedCrypto).toHaveProperty("subtle");
    expect(importedCrypto).toHaveProperty("getRandomValues");
    expect(typeof importedCrypto.getRandomValues).toBe("function");

    // Test that accessing properties delegates to the mock
    expect(importedCrypto.subtle).toBe(mockCrypto.subtle);

    // Test that getRandomValues works
    const testArray = new Uint8Array(8);
    importedCrypto.getRandomValues(testArray);
    expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(testArray);
  });

  it("should use window.crypto if globalThis.crypto is not available (older browser)", async () => {
    const mockCrypto = createMockCrypto();

    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: { crypto: mockCrypto },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "self", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { crypto: importedCrypto } = await import("../crypto.js");

    // Test that the crypto object has the expected interface
    expect(importedCrypto).toHaveProperty("subtle");
    expect(importedCrypto).toHaveProperty("getRandomValues");
    expect(typeof importedCrypto.getRandomValues).toBe("function");

    // Test that accessing properties delegates to the mock
    expect(importedCrypto.subtle).toBe(mockCrypto.subtle);

    // Test that getRandomValues works
    const testArray = new Uint8Array(8);
    importedCrypto.getRandomValues(testArray);
    expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(testArray);
  });

  it("should use self.crypto if globalThis.crypto and window.crypto are not available (web worker)", async () => {
    const mockCrypto = createMockCrypto();

    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "self", {
      value: { crypto: mockCrypto },
      writable: true,
      configurable: true,
    });

    const { crypto: importedCrypto } = await import("../crypto.js");

    // Test that the crypto object has the expected interface
    expect(importedCrypto).toHaveProperty("subtle");
    expect(importedCrypto).toHaveProperty("getRandomValues");
    expect(typeof importedCrypto.getRandomValues).toBe("function");

    // Test that accessing properties delegates to the mock
    expect(importedCrypto.subtle).toBe(mockCrypto.subtle);

    // Test that getRandomValues works
    const testArray = new Uint8Array(8);
    importedCrypto.getRandomValues(testArray);
    expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(testArray);
  });

  it("should prioritize self.crypto in Chrome extension service worker environment", async () => {
    const mockSelfCrypto = createMockCrypto();
    const mockGlobalThisCrypto = createMockCrypto();

    // Simulate Chrome extension service worker where both self.crypto and globalThis.crypto exist
    // but self.crypto should take precedence (service worker context)
    Object.defineProperty(globalThis, "crypto", {
      value: mockGlobalThisCrypto,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: undefined, // No window in service worker
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "self", {
      value: { crypto: mockSelfCrypto },
      writable: true,
      configurable: true,
    });

    const { crypto: importedCrypto } = await import("../crypto.js");

    // Test that the crypto object has the expected interface
    expect(importedCrypto).toHaveProperty("subtle");
    expect(importedCrypto).toHaveProperty("getRandomValues");
    expect(typeof importedCrypto.getRandomValues).toBe("function");

    // CRITICAL: Test that self.crypto is used, NOT globalThis.crypto
    // This is the key behavior for Chrome extension service workers
    expect(importedCrypto.subtle).toBe(mockSelfCrypto.subtle);
    expect(importedCrypto.subtle).not.toBe(mockGlobalThisCrypto.subtle);

    // Test that getRandomValues delegates to self.crypto
    const testArray = new Uint8Array(8);
    importedCrypto.getRandomValues(testArray);
    expect(mockSelfCrypto.getRandomValues).toHaveBeenCalledWith(testArray);
    expect(mockGlobalThisCrypto.getRandomValues).not.toHaveBeenCalled();

    // Test lazy initialization - crypto detection should happen on access, not import
    // This ensures Chrome extension service workers don't fail during module loading
    expect(mockSelfCrypto.getRandomValues).toHaveBeenCalledTimes(1);
  });

  it("should use node:crypto.webcrypto in Node.js environment", async () => {
    await jest.isolateModulesAsync(async () => {
      const mockWebCrypto = createMockCrypto();

      // Clear browser/worker crypto APIs
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "self", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock require function to return node:crypto with webcrypto
      global.require = jest.fn().mockImplementation((module: unknown) => {
        if (module === "node:crypto") {
          return { webcrypto: mockWebCrypto };
        }
        throw new Error(`Module ${module} not found`);
      }) as unknown as NodeJS.Require;

      const { crypto: importedCrypto } = await import("../crypto.js");

      // Test that the crypto object has the expected interface
      expect(importedCrypto).toHaveProperty("subtle");
      expect(importedCrypto).toHaveProperty("getRandomValues");
      expect(typeof importedCrypto.getRandomValues).toBe("function");

      // Test that accessing properties delegates to the mock
      expect(importedCrypto.subtle).toBe(mockWebCrypto.subtle);
      expect(global.require).toHaveBeenCalledWith("node:crypto");
    });
  });

  it("should fallback to crypto.webcrypto if node:crypto fails (older Node.js)", async () => {
    await jest.isolateModulesAsync(async () => {
      const mockWebCrypto = createMockCrypto();

      // Clear browser/worker crypto APIs
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "self", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock require function - node:crypto fails, crypto succeeds
      global.require = jest.fn().mockImplementation((module: unknown) => {
        if (module === "node:crypto") {
          throw new Error("node:crypto not found");
        }
        if (module === "crypto") {
          return { webcrypto: mockWebCrypto };
        }
        throw new Error(`Module ${module} not found`);
      }) as unknown as NodeJS.Require;

      const { crypto: importedCrypto } = await import("../crypto.js");

      // Test that the crypto object has the expected interface
      expect(importedCrypto).toHaveProperty("subtle");
      expect(importedCrypto).toHaveProperty("getRandomValues");
      expect(typeof importedCrypto.getRandomValues).toBe("function");

      // Test that accessing properties delegates to the mock
      expect(importedCrypto.subtle).toBe(mockWebCrypto.subtle);
      expect(global.require).toHaveBeenCalledWith("node:crypto");
      expect(global.require).toHaveBeenCalledWith("crypto");
    });
  });

  it("should throw error if Web Crypto API is not available in Node.js (older Node.js without webcrypto)", async () => {
    await jest.isolateModulesAsync(async () => {
      // Clear browser/worker crypto APIs
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "self", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock require function - both modules exist but don't have webcrypto
      global.require = jest.fn().mockImplementation((module: unknown) => {
        if (module === "node:crypto") {
          throw new Error("node:crypto not found");
        }
        if (module === "crypto") {
          return {}; // Simulate crypto module without webcrypto
        }
        throw new Error(`Module ${module} not found`);
      }) as unknown as NodeJS.Require;

      const { crypto: importedCrypto } = await import("../crypto.js");

      // Error should be thrown when accessing crypto properties
      expect(() => importedCrypto.subtle).toThrow(
        "Web Crypto API not available. Node.js 16+ required.",
      );
    });
  });

  it("should throw error if require fails entirely in Node.js environment", async () => {
    await jest.isolateModulesAsync(async () => {
      // Clear browser/worker crypto APIs
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "self", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock require function to always throw
      global.require = jest.fn().mockImplementation((module: unknown) => {
        throw new Error(`Cannot require module ${module}`);
      }) as unknown as NodeJS.Require;

      const { crypto: importedCrypto } = await import("../crypto.js");

      // Error should be thrown when accessing crypto properties
      expect(() => importedCrypto.subtle).toThrow(
        "Crypto API not available in this environment",
      );
    });
  });

  it("should throw error if no crypto API is available in any environment", async () => {
    await jest.isolateModulesAsync(async () => {
      // Clear all crypto APIs
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "self", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock require to fail to simulate non-Node.js environment
      global.require = jest.fn().mockImplementation(() => {
        throw new Error("require is not defined");
      }) as unknown as NodeJS.Require;

      const { crypto: importedCrypto } = await import("../crypto.js");

      // Error should be thrown when accessing crypto properties
      expect(() => importedCrypto.subtle).toThrow(
        "Crypto API not available in this environment",
      );
    });
  });

  it("should reject crypto objects without subtle property", async () => {
    await jest.isolateModulesAsync(async () => {
      // Set globalThis.crypto without subtle
      Object.defineProperty(globalThis, "crypto", {
        value: {}, // No subtle property
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "self", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock require to fail
      global.require = jest.fn().mockImplementation(() => {
        throw new Error("No crypto module");
      }) as unknown as NodeJS.Require;

      const { crypto: importedCrypto } = await import("../crypto.js");

      // Error should be thrown when accessing crypto properties
      expect(() => importedCrypto.subtle).toThrow(
        "Crypto API not available in this environment",
      );
    });
  });

  it("should reject crypto objects without getRandomValues property", async () => {
    await jest.isolateModulesAsync(async () => {
      // Set globalThis.crypto with subtle but without getRandomValues
      Object.defineProperty(globalThis, "crypto", {
        value: { subtle: createMockSubtleCrypto() }, // No getRandomValues property
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "self", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock require to fail
      global.require = jest.fn().mockImplementation(() => {
        throw new Error("No crypto module");
      }) as unknown as NodeJS.Require;

      const { crypto: importedCrypto } = await import("../crypto.js");

      // Error should be thrown when accessing crypto properties
      expect(() => importedCrypto.subtle).toThrow(
        "Crypto API not available in this environment",
      );
    });
  });

  it("should work end-to-end in Chrome extension service worker scenario", async () => {
    await jest.isolateModulesAsync(async () => {
      // Simulate actual Chrome extension service worker environment
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock self.crypto with real-like behavior
      const mockSelfCrypto = {
        subtle: {
          importKey: jest.fn(() =>
            Promise.resolve("mock-key" as unknown as CryptoKey),
          ),
          sign: jest.fn(() =>
            Promise.resolve(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer),
          ),
        },
        getRandomValues: jest.fn((array: Uint8Array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = i % 256;
          }
          return array;
        }),
      };

      Object.defineProperty(globalThis, "self", {
        value: { crypto: mockSelfCrypto },
        writable: true,
        configurable: true,
      });

      // Import and test actual library functions
      const { generateEmailAlias, validateEmailAlias } = await import(
        "../index.js"
      );

      // This should work without throwing "Crypto API not available in this environment"
      const alias = await generateEmailAlias({
        secretKey: "test-secret",
        aliasParts: ["shopping", "amazon"],
        domain: "example.com",
      });

      expect(alias).toMatch(/^shopping-amazon-[a-f0-9]{8}@example\.com$/);

      const isValid = await validateEmailAlias({
        keysRecipientMap: { "test-secret": "recipient@gmail.com" },
        fullAlias: alias,
      });

      expect(isValid).toBe("recipient@gmail.com");

      // Verify self.crypto was actually used
      expect(mockSelfCrypto.subtle.importKey).toHaveBeenCalled();
      expect(mockSelfCrypto.subtle.sign).toHaveBeenCalled();
    });
  });
});
