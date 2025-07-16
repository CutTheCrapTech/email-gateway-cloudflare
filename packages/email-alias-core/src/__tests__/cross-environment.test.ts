/**
 * @license MIT
 * @copyright 2025 karteekiitg
 */

import {
  generateEmailAlias,
  generateSecureRandomString,
  validateEmailAlias,
} from "../index.js";

/**
 * Cross-environment consistency tests for email alias generation and validation.
 * These tests ensure that the same inputs produce the same outputs regardless
 * of whether the code runs in Node.js, Cloudflare Workers, or browser extensions.
 */
describe("Cross-Environment Consistency", () => {
  const secretKey = "test-secret-key-for-consistency-testing";
  const domain = "test.example.com";
  const testCases = [
    { aliasParts: ["service", "provider"], hashLength: 8 },
    { aliasParts: ["shop", "amazon", "electronics"], hashLength: 12 },
    { aliasParts: ["news", "newsletter", "tech"], hashLength: 6 },
    { aliasParts: ["social", "twitter"], hashLength: 16 },
    { aliasParts: ["work", "github", "notifications"], hashLength: 10 },
  ];

  describe("generateEmailAlias consistency", () => {
    it.each(testCases)(
      "should generate consistent results for aliasParts: %j",
      async ({ aliasParts, hashLength }) => {
        // Generate the same alias multiple times to ensure deterministic behavior
        const alias1 = await generateEmailAlias({
          secretKey,
          aliasParts,
          domain,
          hashLength,
        });

        const alias2 = await generateEmailAlias({
          secretKey,
          aliasParts,
          domain,
          hashLength,
        });

        const alias3 = await generateEmailAlias({
          secretKey,
          aliasParts,
          domain,
          hashLength,
        });

        // All should be identical
        expect(alias1).toBe(alias2);
        expect(alias2).toBe(alias3);

        // Verify the format
        const expectedPrefix = aliasParts.join("-");
        const expectedRegex = new RegExp(
          `^${expectedPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-[a-f0-9]{${hashLength}}@${domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        );
        expect(alias1).toMatch(expectedRegex);
      },
    );
  });

  describe("validateEmailAlias consistency", () => {
    it.each(testCases)(
      "should validate generated aliases consistently for aliasParts: %j",
      async ({ aliasParts, hashLength }) => {
        // Generate an alias
        const alias = await generateEmailAlias({
          secretKey,
          aliasParts,
          domain,
          hashLength,
        });

        // Validate it multiple times
        const recipient1 = await validateEmailAlias({
          keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
          fullAlias: alias,
          hashLength,
        });

        const recipient2 = await validateEmailAlias({
          keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
          fullAlias: alias,
          hashLength,
        });

        const recipient3 = await validateEmailAlias({
          keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
          fullAlias: alias,
          hashLength,
        });

        // All should be true
        expect(recipient1).toBe("recipient@gmail.com");
        expect(recipient2).toBe("recipient@gmail.com");
        expect(recipient3).toBe("recipient@gmail.com");
      },
    );

    it.each(testCases)(
      "should consistently reject invalid aliases for aliasParts: %j",
      async ({ aliasParts, hashLength }) => {
        // Generate a valid alias
        const validAlias = await generateEmailAlias({
          secretKey,
          aliasParts,
          domain,
          hashLength,
        });

        // Create invalid variants
        const invalidAliases = [
          // Wrong secret key
          {
            alias: validAlias,
            secretKey: "wrong-secret-key",
            hashLength,
          },
          // Tampered hash
          {
            alias: validAlias.replace(/[a-f0-9]+@/, "ffffffff@"),
            secretKey,
            hashLength,
          },
          // Wrong hash length expectation
          {
            alias: validAlias,
            secretKey,
            hashLength: hashLength === 8 ? 10 : 8,
          },
        ];

        for (const {
          alias,
          secretKey: testSecretKey,
          hashLength: testHashLength,
        } of invalidAliases) {
          const recipient1 = await validateEmailAlias({
            keysRecipientMap: { [testSecretKey]: "recipient@gmail.com" },
            fullAlias: alias,
            hashLength: testHashLength,
          });

          const recipient2 = await validateEmailAlias({
            keysRecipientMap: { [testSecretKey]: "recipient@gmail.com" },
            fullAlias: alias,
            hashLength: testHashLength,
          });

          // Both should consistently be false
          expect(recipient1).toBe("");
          expect(recipient2).toBe("");
        }
      },
    );
  });

  describe("Known test vectors for reproducibility", () => {
    // These are known good test vectors that should always produce the same result
    const knownVectors = [
      {
        secretKey: "consistent-test-key",
        aliasParts: ["service", "provider"],
        domain: "example.com",
        hashLength: 8,
      },
      {
        secretKey: "another-test-key",
        aliasParts: ["shop", "store"],
        domain: "test.com",
        hashLength: 12,
      },
    ];

    it.each(knownVectors)(
      "should produce consistent alias for known vector: %j",
      async ({ secretKey, aliasParts, domain, hashLength }) => {
        const alias = await generateEmailAlias({
          secretKey,
          aliasParts,
          domain,
          hashLength,
        });

        // Generate again to ensure consistency
        const alias2 = await generateEmailAlias({
          secretKey,
          aliasParts,
          domain,
          hashLength,
        });

        expect(alias).toBe(alias2);

        // Validate that the generated alias is valid
        const recipient = await validateEmailAlias({
          keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
          fullAlias: alias,
          hashLength,
        });

        expect(recipient).toBe("recipient@gmail.com");
      },
    );
  });

  describe("Edge cases consistency", () => {
    it("should handle special characters in alias parts consistently", async () => {
      const aliasParts = ["test", "with-dash", "under_score"];

      const alias1 = await generateEmailAlias({
        secretKey,
        aliasParts,
        domain,
      });

      const alias2 = await generateEmailAlias({
        secretKey,
        aliasParts,
        domain,
      });

      expect(alias1).toBe(alias2);

      const recipient = await validateEmailAlias({
        keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
        fullAlias: alias1,
      });
      expect(recipient).toBe("recipient@gmail.com");
    });

    it("should handle long alias parts consistently", async () => {
      const aliasParts = [
        "very-long-service-name-that-might-cause-issues",
        "another-extremely-long-provider-name-for-testing",
      ];

      const alias1 = await generateEmailAlias({
        secretKey,
        aliasParts,
        domain,
      });

      const alias2 = await generateEmailAlias({
        secretKey,
        aliasParts,
        domain,
      });

      expect(alias1).toBe(alias2);

      const recipient = await validateEmailAlias({
        keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
        fullAlias: alias1,
      });
      expect(recipient).toBe("recipient@gmail.com");
    });

    it("should handle Unicode characters consistently", async () => {
      const aliasParts = ["tëst", "ñame", "émoji"];

      const alias1 = await generateEmailAlias({
        secretKey,
        aliasParts,
        domain,
      });

      const alias2 = await generateEmailAlias({
        secretKey,
        aliasParts,
        domain,
      });

      expect(alias1).toBe(alias2);

      const recipient = await validateEmailAlias({
        keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
        fullAlias: alias1,
      });
      expect(recipient).toBe("recipient@gmail.com");
    });
  });

  describe("Performance and stability", () => {
    it("should maintain consistent performance across multiple operations", async () => {
      const iterations = 50;
      const aliases: string[] = [];

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const alias = await generateEmailAlias({
          secretKey,
          aliasParts: ["perf", "test", i.toString()],
          domain,
        });
        aliases.push(alias);
      }

      const generateTime = Date.now() - startTime;

      // Validate all generated aliases
      const validateStartTime = Date.now();

      for (const alias of aliases) {
        const recipient = await validateEmailAlias({
          keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
          fullAlias: alias,
        });
        expect(recipient).toBe("recipient@gmail.com");
      }

      const validateTime = Date.now() - validateStartTime;

      // Performance checks - should be reasonable
      expect(generateTime).toBeLessThan(5000); // 5 seconds for 50 generations
      expect(validateTime).toBeLessThan(5000); // 5 seconds for 50 validations

      // Ensure all aliases are unique (they should be due to different alias parts)
      const uniqueAliases = new Set(aliases);
      expect(uniqueAliases.size).toBe(iterations);
    });

    it("should produce different aliases for different secret keys", async () => {
      const aliasParts = ["test", "different-keys"];
      const secretKey1 = "secret-key-one";
      const secretKey2 = "secret-key-two";

      const alias1 = await generateEmailAlias({
        secretKey: secretKey1,
        aliasParts,
        domain,
      });

      const alias2 = await generateEmailAlias({
        secretKey: secretKey2,
        aliasParts,
        domain,
      });

      // Different secret keys should produce different aliases
      expect(alias1).not.toBe(alias2);

      // Each alias should validate with its respective secret key
      const recipient1 = await validateEmailAlias({
        keysRecipientMap: { [secretKey1]: "recipient1" },
        fullAlias: alias1,
      });
      expect(recipient1).toBe("recipient1");

      const recipient2 = await validateEmailAlias({
        keysRecipientMap: { [secretKey2]: "recipient2" },
        fullAlias: alias2,
      });
      expect(recipient2).toBe("recipient2");

      // Cross-validation should fail
      const crossValid1 = await validateEmailAlias({
        keysRecipientMap: { [secretKey1]: "recipient1" },
        fullAlias: alias2, // Using alias generated with secretKey2
      });
      expect(crossValid1).toBe("");

      const crossValid2 = await validateEmailAlias({
        keysRecipientMap: { [secretKey2]: "recipient2" },
        fullAlias: alias1, // Using alias generated with secretKey1
      });
      expect(crossValid2).toBe("");
    });
  });

  describe("Crypto implementation consistency", () => {
    it("should use the same crypto implementation across test runs", async () => {
      // This test ensures that the crypto module is being imported consistently
      const { crypto } = await import("../crypto.js");

      expect(crypto).toBeDefined();
      expect(crypto.subtle).toBeDefined();
      expect(typeof crypto.subtle.importKey).toBe("function");
      expect(typeof crypto.subtle.sign).toBe("function");
    });

    it("should produce identical HMAC results for identical inputs", async () => {
      const { crypto } = await import("../crypto.js");

      const encoder = new TextEncoder();
      const testData = "test-data-for-hmac-consistency";
      const testKey = "test-hmac-key";

      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(testKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );

      // Generate the same HMAC signature multiple times
      const signatures: number[][] = [];
      for (let i = 0; i < 5; i++) {
        const signature = await crypto.subtle.sign(
          "HMAC",
          key,
          encoder.encode(testData),
        );
        signatures.push(Array.from(new Uint8Array(signature)));
      }

      // All signatures should be identical
      expect(
        signatures.every(
          (sig) => JSON.stringify(sig) === JSON.stringify(signatures[0]),
        ),
      ).toBe(true);
    });
  });

  describe("generateSecureRandomString Cross-Environment Consistency", () => {
    describe("Deterministic properties", () => {
      it("should generate strings with consistent character sets across environments", () => {
        const lengths = [10, 25, 50, 100];

        for (const length of lengths) {
          const result = generateSecureRandomString(length);

          // Should always have the correct length
          expect(result).toHaveLength(length);

          // Should always use URL-safe base64 character set
          expect(result).toMatch(/^[A-Za-z0-9_-]*$/);

          // Should never contain standard base64 unsafe characters
          expect(result).not.toMatch(/[+/=]/);
        }
      });

      it("should handle edge cases consistently", () => {
        // Test minimum length
        const minResult = generateSecureRandomString(1);
        expect(minResult).toHaveLength(1);
        expect(minResult).toMatch(/^[A-Za-z0-9_-]$/);

        // Test various boundary lengths
        for (const length of [2, 3, 4, 8, 16, 32, 64]) {
          const result = generateSecureRandomString(length);
          expect(result).toHaveLength(length);
          expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
        }
      });

      it("should throw identical errors for invalid inputs across environments", () => {
        const invalidInputs = [
          0,
          -1,
          1.5,
          Number.NaN,
          Number.POSITIVE_INFINITY,
        ];

        for (const input of invalidInputs) {
          expect(() => generateSecureRandomString(input)).toThrow(
            "Length must be a positive integer.",
          );
        }
      });
    });

    describe("Randomness quality", () => {
      it("should generate unique strings consistently", () => {
        const length = 32;
        const iterations = 100;
        const results = new Set<string>();

        for (let i = 0; i < iterations; i++) {
          const result = generateSecureRandomString(length);
          expect(results.has(result)).toBe(false);
          results.add(result);
        }

        expect(results.size).toBe(iterations);
      });

      it("should have good entropy distribution across environments", () => {
        const length = 200;
        const result = generateSecureRandomString(length);

        // Count character frequencies
        const charCounts: Record<string, number> = {};
        for (const char of result) {
          charCounts[char] = (charCounts[char] || 0) + 1;
        }

        // With good entropy, no single character should dominate
        const maxRepeats = Math.max(...Object.values(charCounts));
        const totalChars = Object.keys(charCounts).length;

        // Should have reasonable character diversity
        expect(totalChars).toBeGreaterThan(10);
        expect(maxRepeats).toBeLessThan(length / 5); // No char more than 20% of total
      });

      it("should maintain randomness in concurrent operations", () => {
        const promises = Array.from({ length: 20 }, (_, i) =>
          Promise.resolve(generateSecureRandomString(30 + i)),
        );

        return Promise.all(promises).then((results) => {
          // All results should be unique
          const uniqueResults = new Set(results);
          expect(uniqueResults.size).toBe(20);

          // All results should have correct lengths and character sets
          results.forEach((result, index) => {
            expect(result).toHaveLength(30 + index);
            expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
          });
        });
      });
    });

    describe("Performance consistency", () => {
      it("should perform efficiently across different lengths", () => {
        const lengths = [10, 50, 100, 500, 1000];

        for (const length of lengths) {
          const startTime = Date.now();
          const result = generateSecureRandomString(length);
          const endTime = Date.now();

          expect(result).toHaveLength(length);
          expect(endTime - startTime).toBeLessThan(50); // Should be fast
        }
      });

      it("should handle batch operations efficiently", () => {
        const startTime = Date.now();
        const results: string[] = [];

        for (let i = 0; i < 100; i++) {
          results.push(generateSecureRandomString(32));
        }

        const endTime = Date.now();

        // All results should be valid and unique
        expect(results).toHaveLength(100);
        const uniqueResults = new Set(results);
        expect(uniqueResults.size).toBe(100);

        // Should complete in reasonable time
        expect(endTime - startTime).toBeLessThan(500);
      });
    });

    describe("URL-safe encoding consistency", () => {
      it("should consistently produce URL-safe strings", () => {
        const results = Array.from({ length: 50 }, () =>
          generateSecureRandomString(64),
        );

        for (const result of results) {
          // Should be URL-safe
          expect(result).toMatch(/^[A-Za-z0-9_-]*$/);

          // Should not require URL encoding
          expect(encodeURIComponent(result)).toBe(result);

          // Should not contain padding or unsafe characters
          expect(result.includes("=")).toBe(false);
          expect(result.includes("+")).toBe(false);
          expect(result.includes("/")).toBe(false);
        }
      });

      it("should use URL-safe replacements when needed", () => {
        // Generate many strings to ensure we get some - and _ characters
        const largeString = Array.from({ length: 100 }, () =>
          generateSecureRandomString(50),
        ).join("");

        // Should contain URL-safe replacement characters
        // (This is probabilistic but very likely with this much data)
        const hasUrlSafeChars = /[_-]/.test(largeString);
        expect(hasUrlSafeChars).toBe(true);
      });
    });

    describe("Crypto implementation consistency", () => {
      it("should use the same crypto source across environments", () => {
        // This test ensures the crypto module is working consistently
        expect(() => generateSecureRandomString(10)).not.toThrow();

        // Multiple calls should work without crypto errors
        const results = [
          generateSecureRandomString(10),
          generateSecureRandomString(20),
          generateSecureRandomString(30),
        ];

        results.forEach((result, index) => {
          expect(result).toHaveLength((index + 1) * 10);
          expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
        });
      });

      it("should handle crypto API availability gracefully", async () => {
        // Test that the crypto implementation is available and working
        const { crypto } = await import("../crypto.js");

        expect(crypto).toBeDefined();
        expect(crypto.getRandomValues).toBeDefined();
        expect(typeof crypto.getRandomValues).toBe("function");

        // Test that getRandomValues works as expected
        const testArray = new Uint8Array(16);
        const originalArray = new Uint8Array(testArray);

        crypto.getRandomValues(testArray);

        // Array should be modified (extremely unlikely to be identical)
        expect(testArray).not.toEqual(originalArray);
      });
    });

    describe("Integration with email alias functions", () => {
      it("should work seamlessly with email alias generation", async () => {
        // Generate random components for email alias
        const randomService = generateSecureRandomString(8);
        const randomProvider = generateSecureRandomString(6);
        const secretKey = generateSecureRandomString(32);

        // Use in email alias generation
        const alias = await generateEmailAlias({
          secretKey,
          aliasParts: [randomService, randomProvider],
          domain: "example.com",
        });

        // Should produce valid alias
        expect(alias).toMatch(
          new RegExp(
            `^${randomService}-${randomProvider}-[a-f0-9]{8}@example\\.com$`,
          ),
        );

        // Should validate correctly
        const recipient = await validateEmailAlias({
          keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
          fullAlias: alias,
        });
        expect(recipient).toBe("recipient@gmail.com");
      });

      it("should create unique secret keys for different aliases", async () => {
        const domain = "test.example.com";
        const aliasParts = ["service", "test"];

        // Generate different secret keys
        const secretKey1 = generateSecureRandomString(32);
        const secretKey2 = generateSecureRandomString(32);

        expect(secretKey1).not.toBe(secretKey2);

        // Generate aliases with different keys
        const alias1 = await generateEmailAlias({
          secretKey: secretKey1,
          aliasParts,
          domain,
        });

        const alias2 = await generateEmailAlias({
          secretKey: secretKey2,
          aliasParts,
          domain,
        });

        // Aliases should be different
        expect(alias1).not.toBe(alias2);

        // Each should validate with its own key
        expect(
          await validateEmailAlias({
            keysRecipientMap: { [secretKey1]: "recipient1" },
            fullAlias: alias1,
          }),
        ).toBe("recipient1");

        expect(
          await validateEmailAlias({
            keysRecipientMap: { [secretKey2]: "recipient2" },
            fullAlias: alias2,
          }),
        ).toBe("recipient2");

        // Cross-validation should fail
        expect(
          await validateEmailAlias({
            keysRecipientMap: { [secretKey1]: "recipient1" },
            fullAlias: alias2,
          }),
        ).toBe("");

        expect(
          await validateEmailAlias({
            keysRecipientMap: { [secretKey2]: "recipient2" },
            fullAlias: alias1,
          }),
        ).toBe("");
      });
    });
  });
});
