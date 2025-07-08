/// <reference types="jest" />

import type {
  ExecutionContext,
  ForwardableEmailMessage,
} from "@cloudflare/workers-types";
import worker, { type Env } from "../worker";

// Mock the validateEmailAlias function
jest.mock("email-alias-core", () => ({
  validateEmailAlias: jest.fn(),
}));

import { validateEmailAlias } from "email-alias-core";

// Fix the mock typing to allow null/undefined return values
const mockValidateEmailAlias = validateEmailAlias as jest.MockedFunction<
  (args: {
    keysRecipientMap: Record<string, string>;
    fullAlias: string;
  }) => Promise<string | null | undefined>
>;

// Create a mutable version of ForwardableEmailMessage for testing
interface MockForwardableEmailMessage {
  to: string;
  from: string;
  forward: jest.MockedFunction<(destinationAddress: string) => Promise<void>>;
  setReject: jest.MockedFunction<(reason: string) => void>;
  raw: Record<string, unknown>;
  headers: Record<string, unknown>;
  rawSize: number;
  reply: jest.MockedFunction<() => Promise<void>>;
}

describe("Email Worker", () => {
  let mockMessage: MockForwardableEmailMessage;
  let mockEnv: Env;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock console methods to suppress output during tests
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});

    // Create mock message
    mockMessage = {
      to: "test@example.com",
      from: "sender@example.com",
      forward: jest.fn().mockResolvedValue(undefined),
      setReject: jest.fn(),
      raw: {},
      headers: {},
      rawSize: 1024,
      reply: jest.fn().mockResolvedValue(undefined),
    };

    // Create mock environment
    mockEnv = {
      EMAIL_OPTIONS: JSON.stringify({
        default_email_address: "default@example.com",
        ignore_email_checks: ["ignored@example.com"],
      }),
      EMAIL_SECRET_MAPPING: JSON.stringify({
        secret1: "user1@example.com",
        secret2: "user2@example.com",
      }),
    };

    // Create mock context
    mockContext = {} as ExecutionContext;
  });

  afterEach(() => {
    // Restore console methods after each test
    jest.restoreAllMocks();
  });

  describe("Input validation", () => {
    it('should reject email with missing "to" field', async () => {
      mockMessage.to = "";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.setReject).toHaveBeenCalledWith(
        "Invalid email message: missing to/from fields.",
      );
    });

    it('should reject email with missing "from" field', async () => {
      mockMessage.from = "";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.setReject).toHaveBeenCalledWith(
        "Invalid email message: missing to/from fields.",
      );
    });
  });

  describe("Configuration validation", () => {
    it("should reject when EMAIL_OPTIONS is not set", async () => {
      mockEnv.EMAIL_OPTIONS = "";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.setReject).toHaveBeenCalledWith(
        "Configuration error: EMAIL_OPTIONS not configured.",
      );
    });

    it("should reject when EMAIL_OPTIONS has invalid JSON", async () => {
      mockEnv.EMAIL_OPTIONS = "invalid json";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.setReject).toHaveBeenCalledWith(
        "Configuration error: Invalid EMAIL_OPTIONS JSON.",
      );
    });

    it("should reject when default_email_address is not specified", async () => {
      mockEnv.EMAIL_OPTIONS = JSON.stringify({
        ignore_email_checks: ["test@example.com"],
      });

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.setReject).toHaveBeenCalledWith(
        "Configuration error: No default email address specified.",
      );
    });

    it("should forward to default when EMAIL_SECRET_MAPPING is not set", async () => {
      mockEnv.EMAIL_SECRET_MAPPING = "";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.forward).toHaveBeenCalledWith("default@example.com");
    });

    it("should forward to default when EMAIL_SECRET_MAPPING has invalid JSON", async () => {
      mockEnv.EMAIL_SECRET_MAPPING = "invalid json";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.forward).toHaveBeenCalledWith("default@example.com");
    });
  });

  describe("Ignore list functionality", () => {
    it("should forward to default address when sender is in ignore list", async () => {
      mockMessage.from = "ignored@example.com";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.forward).toHaveBeenCalledWith("default@example.com");
      expect(mockValidateEmailAlias).not.toHaveBeenCalled();
    });

    it("should process normally when sender is not in ignore list", async () => {
      mockMessage.from = "normal@example.com";
      mockValidateEmailAlias.mockResolvedValue("user1@example.com");

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockValidateEmailAlias).toHaveBeenCalled();
      expect(mockMessage.forward).toHaveBeenCalledWith("user1@example.com");
    });

    it("should handle missing ignore_email_checks gracefully", async () => {
      mockEnv.EMAIL_OPTIONS = JSON.stringify({
        default_email_address: "default@example.com",
      });
      mockValidateEmailAlias.mockResolvedValue("user1@example.com");

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockValidateEmailAlias).toHaveBeenCalled();
      expect(mockMessage.forward).toHaveBeenCalledWith("user1@example.com");
    });
  });

  describe("Email alias validation", () => {
    it("should forward to validated destination when alias is valid", async () => {
      mockValidateEmailAlias.mockResolvedValue("user1@example.com");

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockValidateEmailAlias).toHaveBeenCalledWith({
        keysRecipientMap: {
          secret1: "user1@example.com",
          secret2: "user2@example.com",
        },
        fullAlias: "test@example.com",
      });
      expect(mockMessage.forward).toHaveBeenCalledWith("user1@example.com");
    });

    it("should forward to default when alias validation returns null", async () => {
      mockValidateEmailAlias.mockResolvedValue(null);

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.forward).toHaveBeenCalledWith("default@example.com");
    });

    it("should forward to default when alias validation returns undefined", async () => {
      mockValidateEmailAlias.mockResolvedValue(undefined);

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.forward).toHaveBeenCalledWith("default@example.com");
    });

    it("should forward to default when alias validation throws error", async () => {
      mockValidateEmailAlias.mockRejectedValue(new Error("Validation failed"));

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.forward).toHaveBeenCalledWith("default@example.com");
    });
  });

  describe("Error handling", () => {
    it("should handle forward failure gracefully", async () => {
      // Don't need to manually spy on console.error since it's already mocked in beforeEach
      mockMessage.forward = jest
        .fn()
        .mockRejectedValue(new Error("Forward failed"));
      mockValidateEmailAlias.mockResolvedValue("user1@example.com");

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        "Failed to forward email to user1@example.com:",
        expect.any(Error),
      );
    });

    it("should not throw when setReject is called", async () => {
      mockMessage.to = "";

      await expect(
        worker.email(
          mockMessage as unknown as ForwardableEmailMessage,
          mockEnv,
          mockContext,
        ),
      ).resolves.not.toThrow();
      expect(mockMessage.setReject).toHaveBeenCalled();
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete successful flow", async () => {
      mockValidateEmailAlias.mockResolvedValue("user1@example.com");

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockValidateEmailAlias).toHaveBeenCalledWith({
        keysRecipientMap: {
          secret1: "user1@example.com",
          secret2: "user2@example.com",
        },
        fullAlias: "test@example.com",
      });
      expect(mockMessage.forward).toHaveBeenCalledWith("user1@example.com");
      expect(mockMessage.setReject).not.toHaveBeenCalled();
    });

    it("should handle fallback to default address scenario", async () => {
      mockValidateEmailAlias.mockResolvedValue(null);

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.forward).toHaveBeenCalledWith("default@example.com");
      expect(mockMessage.setReject).not.toHaveBeenCalled();
    });

    it("should handle configuration error scenario", async () => {
      mockEnv.EMAIL_OPTIONS = "";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.setReject).toHaveBeenCalledWith(
        "Configuration error: EMAIL_OPTIONS not configured.",
      );
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });
  });
});
