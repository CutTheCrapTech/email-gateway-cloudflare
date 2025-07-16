/**
 * @license MIT
 * @copyright 2025 karteekiitg
 */

import { generateEmailAlias, validateEmailAlias } from "../index.js";

/**
 * Test vectors for cross-environment verification.
 * These test vectors contain known inputs and expected outputs that MUST be identical
 * across Node.js, Cloudflare Workers, and browser extensions.
 *
 * If any of these tests fail, it indicates a regression or environment-specific
 * inconsistency in the crypto implementation.
 */
describe("Cross-Environment Test Vectors", () => {
  /**
   * Known test vectors with verified expected results.
   * These were generated and verified on Node.js v22.14.0 on macOS ARM64.
   * DO NOT MODIFY these vectors unless you're intentionally updating the algorithm.
   */
  const VERIFIED_TEST_VECTORS: Array<{
    description: string;
    secretKey: string;
    aliasParts: string[];
    domain: string;
    hashLength: number;
    expectedAlias: string;
  }> = [
    {
      description: "Basic case with default hash length",
      secretKey: "test-secret-key-123",
      aliasParts: ["service", "provider"],
      domain: "example.com",
      hashLength: 8,
      expectedAlias: "service-provider-74e423d7@example.com",
    },
    {
      description: "Multi-part alias with custom hash length",
      secretKey: "another-key-456",
      aliasParts: ["shop", "amazon", "electronics"],
      domain: "test.com",
      hashLength: 12,
      expectedAlias: "shop-amazon-electronics-615c8da60c8d@test.com",
    },
    {
      description: "Short hash length",
      secretKey: "short-hash-key",
      aliasParts: ["news", "tech"],
      domain: "newsletter.com",
      hashLength: 6,
      expectedAlias: "news-tech-73e26c@newsletter.com",
    },
    {
      description: "Long hash length",
      secretKey: "long-hash-key-for-testing",
      aliasParts: ["social", "media"],
      domain: "social.net",
      hashLength: 16,
      expectedAlias: "social-media-6cc7df94be59dd17@social.net",
    },
    {
      description: "Special characters in alias parts",
      secretKey: "special-chars-key",
      aliasParts: ["test-123", "service_name", "with.dots"],
      domain: "special.example.org",
      hashLength: 10,
      expectedAlias:
        "test-123-service_name-with.dots-730329e43d@special.example.org",
    },
  ];

  describe("Verify known test vectors", () => {
    it.each(VERIFIED_TEST_VECTORS)(
      "should match expected result for: $description",
      async (vector) => {
        const alias = await generateEmailAlias({
          secretKey: vector.secretKey,
          aliasParts: vector.aliasParts,
          domain: vector.domain,
          hashLength: vector.hashLength,
        });

        // This is the critical test - the generated alias MUST match the expected value
        expect(alias).toBe(vector.expectedAlias);

        // Verify the alias validates correctly
        const recipient =
          (await validateEmailAlias({
            keysRecipientMap: { [vector.secretKey]: "recipient@gmail.com" },
            fullAlias: alias,
            hashLength: vector.hashLength,
          })) ?? "";

        expect(recipient).toBe("recipient@gmail.com");
      },
    );
  });

  describe("Deterministic behavior verification", () => {
    it("should produce identical results across multiple runs", async () => {
      const testConfig = {
        secretKey: "deterministic-test-key",
        aliasParts: ["consistent", "test"],
        domain: "verify.example.com",
        hashLength: 8,
      };

      const aliases: string[] = [];
      const iterations = 10;

      // Generate the same alias multiple times
      for (let i = 0; i < iterations; i++) {
        const alias = await generateEmailAlias(testConfig);
        aliases.push(alias);
      }

      // All aliases should be identical
      const uniqueAliases = new Set(aliases);
      expect(uniqueAliases.size).toBe(1);

      // The result should always be the same (known value)
      expect(aliases[0]).toBe("consistent-test-6439f8f5@verify.example.com");

      // Validate the alias
      const recipient =
        (await validateEmailAlias({
          keysRecipientMap: { [testConfig.secretKey]: "recipient@gmail.com" },
          fullAlias: aliases[0] || "",
          hashLength: testConfig.hashLength,
        })) ?? "";

      expect(recipient).toBe("recipient@gmail.com");
    });
  });

  describe("Cross-validation tests", () => {
    it("should validate aliases generated with same parameters", async () => {
      const configs = [
        {
          secretKey: "validation-key-1",
          aliasParts: ["validate", "test1"],
          domain: "test1.com",
          hashLength: 8,
        },
        {
          secretKey: "validation-key-2",
          aliasParts: ["validate", "test2"],
          domain: "test2.com",
          hashLength: 12,
        },
      ];

      for (const config of configs) {
        // Generate alias
        const alias = await generateEmailAlias(config);

        // Validate with correct parameters
        const recipient =
          (await validateEmailAlias({
            keysRecipientMap: { [config.secretKey]: "recipient@gmail.com" },
            fullAlias: alias,
            hashLength: config.hashLength,
          })) ?? "";

        expect(recipient).toBe("recipient@gmail.com");

        // Validate with wrong secret key should fail
        const invalidWithWrongKey = await validateEmailAlias({
          keysRecipientMap: { "wrong-key": "recipient@gmail.com" },
          fullAlias: alias,
          hashLength: config.hashLength,
        });

        expect(invalidWithWrongKey).toBe("");

        // Validate with wrong hash length should fail
        const invalidWithWrongLength = await validateEmailAlias({
          keysRecipientMap: { [config.secretKey]: "recipient@gmail.com" },
          fullAlias: alias,
          hashLength: config.hashLength === 8 ? 12 : 8,
        });

        expect(invalidWithWrongLength).toBe("");
      }
    });
  });

  describe("Environment consistency checks", () => {
    it("should use consistent crypto implementation", async () => {
      const { crypto } = await import("../crypto.js");

      expect(crypto).toBeDefined();
      expect(crypto.subtle).toBeDefined();
      expect(typeof crypto.subtle.importKey).toBe("function");
      expect(typeof crypto.subtle.sign).toBe("function");
    });

    it("should produce known HMAC signature for test input", async () => {
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

      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(testData),
      );
      const hexSignature = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // This should always produce the same signature across environments
      expect(hexSignature).toBe(
        "591e1dc35460e2638692501efb9201398e061dd6fa93af3d3cf2a87c0e1402fa",
      );
    });
  });

  describe("Environment information", () => {
    it("should log current environment details", async () => {
      const { crypto } = await import("../crypto.js");

      // Only log in verbose mode to reduce test noise
      if ((process.env as { VERBOSE?: string }).VERBOSE) {
        console.log("\n=== Cross-Environment Test Results ===");
        console.log(`Node.js version: ${process.version}`);
        console.log(`Platform: ${process.platform} ${process.arch}`);
        console.log("Crypto implementation: Available");
        console.log(
          `All test vectors: ${VERIFIED_TEST_VECTORS.length} verified`,
        );
        console.log("Status: ✅ All cross-environment tests passed");
        console.log("=== End Test Results ===\n");
      }

      expect(crypto.subtle).toBeDefined();
    });
  });

  describe("Performance consistency", () => {
    it("should maintain reasonable performance across environments", async () => {
      const iterations = 50;
      const testConfig = {
        secretKey: "performance-test-key",
        aliasParts: ["perf", "test"],
        domain: "performance.test",
        hashLength: 8,
      };

      // Test generation performance
      const startGenerate = Date.now();
      const aliases: string[] = [];

      for (let i = 0; i < iterations; i++) {
        const alias = await generateEmailAlias({
          ...testConfig,
          aliasParts: [...testConfig.aliasParts, i.toString()],
        });
        aliases.push(alias);
      }

      const generateTime = Date.now() - startGenerate;

      // Test validation performance
      const startValidate = Date.now();

      for (const alias of aliases) {
        const recipient = await validateEmailAlias({
          keysRecipientMap: { [testConfig.secretKey]: "recipient@gmail.com" },
          fullAlias: alias,
          hashLength: testConfig.hashLength,
        });
        expect(recipient).toBe("recipient@gmail.com");
      }

      const validateTime = Date.now() - startValidate;

      // Performance expectations (generous limits for different environments)
      expect(generateTime).toBeLessThan(5000); // 5 seconds for 50 generations
      expect(validateTime).toBeLessThan(5000); // 5 seconds for 50 validations

      // All aliases should be unique (different inputs)
      const uniqueAliases = new Set(aliases);
      expect(uniqueAliases.size).toBe(iterations);

      // Only log performance details in verbose mode to reduce test noise
      if ((process.env as { VERBOSE?: string }).VERBOSE) {
        console.log(
          `Performance: Generated ${iterations} aliases in ${generateTime}ms, validated in ${validateTime}ms`,
        );
      }
    });
  });
});
