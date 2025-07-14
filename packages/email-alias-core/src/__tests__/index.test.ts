/**
 * @license MIT
 * @copyright 2025 karteekiitg
 */

// We import from `index.js` because this is what Node.js's ES Module resolver expects.
// The `moduleNameMapper` in our jest.config.js will correctly map this to the source .ts file during the test run.
import {
  generateEmailAlias,
  generateSecureRandomString,
  validateEmailAlias,
} from "../index.js";

describe("email-alias-core", () => {
  const secretKey = "a-very-secret-key-that-is-long-enough";
  const domain = "example.com";

  describe("generateEmailAlias()", () => {
    it("should generate a correctly formatted alias with the default hash length", async () => {
      const alias = await generateEmailAlias({
        secretKey,
        aliasParts: ["news", "service"],
        domain,
      });
      // Example format: news-service-a1b2c3d4@example.com
      const regex = /^news-service-[a-f0-9]{8}@example\.com$/;
      expect(alias).toMatch(regex);
    });

    it("should be deterministic for the same inputs", async () => {
      const alias1 = await generateEmailAlias({
        secretKey,
        aliasParts: ["shop", "amazon"],
        domain,
      });
      const alias2 = await generateEmailAlias({
        secretKey,
        aliasParts: ["shop", "amazon"],
        domain,
      });
      expect(alias1).toEqual(alias2);
    });

    it("should generate a different alias for different aliasParts", async () => {
      const alias1 = await generateEmailAlias({
        secretKey,
        aliasParts: ["type1", "service1"],
        domain,
      });
      const alias2 = await generateEmailAlias({
        secretKey,
        aliasParts: ["type2", "service2"],
        domain,
      });
      expect(alias1).not.toEqual(alias2);
    });

    it("should handle a custom hash length", async () => {
      const alias = await generateEmailAlias({
        secretKey,
        aliasParts: ["social", "twitter"],
        domain,
        hashLength: 12,
      });
      const regex = /^social-twitter-[a-f0-9]{12}@example\.com$/;
      expect(alias).toMatch(regex);
    });

    it("should throw an error if aliasParts is an empty array", async () => {
      await expect(
        generateEmailAlias({ secretKey, aliasParts: [], domain }),
      ).rejects.toThrow("The `aliasParts` array cannot be empty.");
    });

    // NOTE: A test for non-string elements in aliasParts is not included because
    // the TypeScript function signature `aliasParts: string[]` prevents this at compile time.
  });

  describe("validateEmailAlias()", () => {
    it("should successfully validate a correctly generated alias", async () => {
      const alias = await generateEmailAlias({
        secretKey,
        aliasParts: ["finance", "chase-bank"],
        domain,
      });
      const recipient = await validateEmailAlias({
        keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
        fullAlias: alias,
      });
      expect(recipient).toBe("recipient@gmail.com");
    });

    it("should fail validation for an alias with a tampered hash", async () => {
      const alias = "finance-chase-bank-ffffffff@example.com";
      const recipient = await validateEmailAlias({
        keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
        fullAlias: alias,
      });
      expect(recipient).toBe("");
    });

    it("should fail validation when using the wrong secret key", async () => {
      const alias = await generateEmailAlias({
        secretKey,
        aliasParts: ["work", "github"],
        domain,
      });
      const recipient = await validateEmailAlias({
        keysRecipientMap: {
          "a-different-and-wrong-secret-key": "recipient@gmail.com",
        },
        fullAlias: alias,
      });
      expect(recipient).toBe("");
    });

    it("should fail validation for an alias with tampered aliasParts", async () => {
      // Generate a known-good alias to get a valid hash
      const originalAlias = await generateEmailAlias({
        secretKey,
        aliasParts: ["original", "service"],
        domain,
      });

      // Safely extract the valid hash to prevent type errors
      const aliasLocalPart = originalAlias.split("@")[0];
      const hash = aliasLocalPart?.split("-").pop();

      // Ensure the test setup is correct before asserting the real logic
      if (!hash) {
        throw new Error(
          "Test setup failed: could not extract hash from alias.",
        );
      }

      // Construct a new, invalid alias with the valid hash but a different prefix
      const tamperedAlias = `tampered-service-${hash}@example.com`;

      const recipient = await validateEmailAlias({
        keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
        fullAlias: tamperedAlias,
      });
      expect(recipient).toBe("");
    });

    it("should correctly validate an alias with a custom hash length", async () => {
      const hashLength = 10;
      const alias = await generateEmailAlias({
        secretKey,
        aliasParts: ["test", "length"],
        domain,
        hashLength,
      });
      const recipient = await validateEmailAlias({
        keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
        fullAlias: alias,
        hashLength,
      });
      expect(recipient).toBe("recipient@gmail.com");
    });

    it("should fail validation if hash length specified does not match alias", async () => {
      const alias = await generateEmailAlias({
        secretKey,
        aliasParts: ["test", "length-mismatch"],
        domain,
        hashLength: 10, // Generated with length 10
      });
      // But we try to validate it with the default length of 8
      const recipient = await validateEmailAlias({
        keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
        fullAlias: alias,
      });
      expect(recipient).toBe("");
    });

    it.each([
      ["test-service@example.com"], // missing hash
      ["test-service-12345678"], // missing @domain
      ["plainstring"], // not an email
      [""], // empty string
      [null], // null
      [undefined], // undefined
    ])(
      "should return false for malformed alias: %s",
      async (malformedAlias) => {
        // The `as any` cast is intentional here. It allows us to bypass TypeScript's
        // compile-time checks to test the runtime robustness of the validation function
        // against invalid data types like null and undefined.
        const recipient = await validateEmailAlias({
          keysRecipientMap: { [secretKey]: "recipient@gmail.com" },
          fullAlias: malformedAlias as string,
        });
        expect(recipient).toBe("");
      },
    );
  });
});

describe("generateSecureRandomString()", () => {
  it("should generate a string of the requested length", () => {
    const lengths = [1, 5, 10, 20, 32, 64, 100];

    for (const length of lengths) {
      const result = generateSecureRandomString(length);
      expect(result).toHaveLength(length);
    }
  });

  it("should generate URL-safe strings", () => {
    const result = generateSecureRandomString(100);

    // Should not contain URL-unsafe characters
    expect(result).not.toMatch(/[+/=]/);

    // Should only contain URL-safe base64 characters
    expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
  });

  it("should generate different strings on each call", () => {
    const length = 32;
    const results = new Set<string>();

    // Generate 100 strings and ensure they're all unique
    for (let i = 0; i < 100; i++) {
      const result = generateSecureRandomString(length);
      expect(results.has(result)).toBe(false);
      results.add(result);
    }

    expect(results.size).toBe(100);
  });

  it("should handle edge cases for length", () => {
    // Test minimum length
    const minResult = generateSecureRandomString(1);
    expect(minResult).toHaveLength(1);
    expect(minResult).toMatch(/^[A-Za-z0-9_-]$/);

    // Test various lengths
    [2, 3, 7, 15, 31, 63, 127].forEach((length) => {
      const result = generateSecureRandomString(length);
      expect(result).toHaveLength(length);
      expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
    });
  });

  it("should throw error for invalid length values", () => {
    const invalidLengths = [0, -1, -10, 1.5, 2.7, NaN, Infinity, -Infinity];

    for (const length of invalidLengths) {
      expect(() => generateSecureRandomString(length)).toThrow(
        "Length must be a positive integer.",
      );
    }
  });

  it("should throw error for non-numeric length", () => {
    // TypeScript prevents this at compile time, but we test runtime behavior
    expect(() => generateSecureRandomString("10" as unknown as number)).toThrow(
      "Length must be a positive integer.",
    );

    expect(() => generateSecureRandomString(null as unknown as number)).toThrow(
      "Length must be a positive integer.",
    );

    expect(() =>
      generateSecureRandomString(undefined as unknown as number),
    ).toThrow("Length must be a positive integer.");
  });

  it("should generate strings with good entropy distribution", () => {
    const length = 100;
    const result = generateSecureRandomString(length);

    // Count character frequencies
    const charCounts: Record<string, number> = {};
    for (const char of result) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }

    // With good entropy, we shouldn't have too many repeated characters
    // in a 100-character string (this is a basic sanity check)
    const maxRepeats = Math.max(...Object.values(charCounts));
    expect(maxRepeats).toBeLessThan(20); // Allow some repetition but not too much
  });

  it("should handle large lengths efficiently", () => {
    const startTime = Date.now();
    const result = generateSecureRandomString(1000);
    const endTime = Date.now();

    expect(result).toHaveLength(1000);
    expect(result).toMatch(/^[A-Za-z0-9_-]*$/);

    // Should complete in reasonable time (< 100ms)
    expect(endTime - startTime).toBeLessThan(100);
  });

  it("should be deterministic in character set but not output", () => {
    const results = Array.from({ length: 10 }, () =>
      generateSecureRandomString(50),
    );

    // All results should use the same character set
    const allChars = results.join("");
    expect(allChars).toMatch(/^[A-Za-z0-9_-]*$/);

    // But all results should be different
    const uniqueResults = new Set(results);
    expect(uniqueResults.size).toBe(10);
  });

  it("should work with concurrent calls", () => {
    const promises = Array.from({ length: 50 }, (_, i) =>
      Promise.resolve(generateSecureRandomString(20 + i)),
    );

    return Promise.all(promises).then((results) => {
      // Each result should have the correct length
      results.forEach((result, index) => {
        expect(result).toHaveLength(20 + index);
        expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
      });

      // All results should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(50);
    });
  });

  describe("base64 URL-safe encoding verification", () => {
    it("should not contain standard base64 padding or unsafe characters", () => {
      const lengths = [10, 20, 30, 40, 50];

      lengths.forEach((length) => {
        const result = generateSecureRandomString(length);

        // Should not contain padding
        expect(result.includes("=")).toBe(false);

        // Should not contain + or /
        expect(result.includes("+")).toBe(false);
        expect(result.includes("/")).toBe(false);

        // Should only contain URL-safe characters
        expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
      });
    });

    it("should use URL-safe replacements correctly", () => {
      // Generate many strings to increase chance of getting + and / in original base64
      const results = Array.from({ length: 100 }, () =>
        generateSecureRandomString(64),
      );
      const combined = results.join("");

      // Should contain _ and - characters (URL-safe replacements)
      // Note: This is probabilistic, but with 6400 characters, we should see some
      expect(combined).toMatch(/[_-]/);
    });
  });
});
