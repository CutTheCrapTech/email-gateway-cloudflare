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
    it('should log error and return when missing "to" field', async () => {
      mockMessage.to = "";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        "Invalid email message: missing to/from fields.",
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });

    it('should log error and return when missing "from" field', async () => {
      mockMessage.from = "";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        "Invalid email message: missing to/from fields.",
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });
  });

  describe("Configuration validation", () => {
    it("should log error and return when EMAIL_OPTIONS is not set", async () => {
      mockEnv.EMAIL_OPTIONS = "";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        "EMAIL_OPTIONS environment variable is not set",
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });

    it("should log error and return when EMAIL_OPTIONS has invalid JSON", async () => {
      mockEnv.EMAIL_OPTIONS = "invalid json";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        "Failed to parse EMAIL_OPTIONS:",
        expect.any(Error),
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });

    it("should log error and return when default_email_address is not specified", async () => {
      mockEnv.EMAIL_OPTIONS = JSON.stringify({
        ignore_email_checks: ["test@example.com"],
      });

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        "Configuration error: No default email address specified.",
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });

    it("should log error and return when EMAIL_SECRET_MAPPING is not set", async () => {
      mockEnv.EMAIL_SECRET_MAPPING = "";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        "EMAIL_SECRET_MAPPING is not set. Cannot process email.",
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });

    it("should log error and return when EMAIL_SECRET_MAPPING has invalid JSON", async () => {
      mockEnv.EMAIL_SECRET_MAPPING = "invalid json";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        "Failed to parse EMAIL_SECRET_MAPPING:",
        expect.any(Error),
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });
  });

  describe("Ignore list functionality", () => {
    it("should forward to default address when recipient is in ignore list", async () => {
      mockMessage.to = "ignored@example.com";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.forward).toHaveBeenCalledWith("default@example.com");
      expect(mockValidateEmailAlias).not.toHaveBeenCalled();
    });

    it("should process normally when recipient is not in ignore list", async () => {
      mockMessage.to = "normal@example.com";
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

    it("should log error and return when alias validation returns null", async () => {
      mockValidateEmailAlias.mockResolvedValue(null);

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        `No valid destination email for alias ${mockMessage.to}.`,
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });

    it("should log error and return when alias validation returns undefined", async () => {
      mockValidateEmailAlias.mockResolvedValue(undefined);

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        `No valid destination email for alias ${mockMessage.to}.`,
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });

    it("should log error and return when alias validation throws error", async () => {
      mockValidateEmailAlias.mockRejectedValue(new Error("Validation failed"));

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        `Error validating alias ${mockMessage.to} with a secret:`,
        expect.any(Error),
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
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

    it("should attempt to forward to default address if initial forward fails", async () => {
      const initialDestination = "user1@example.com";
      const defaultDestination = mockEnv.EMAIL_OPTIONS
        ? JSON.parse(mockEnv.EMAIL_OPTIONS).default_email_address
        : "";

      mockMessage.forward
        .mockRejectedValueOnce(new Error("Initial forward failed")) // First call fails
        .mockResolvedValueOnce(undefined); // Second call (to default) succeeds

      mockValidateEmailAlias.mockResolvedValue(initialDestination);

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.forward).toHaveBeenCalledTimes(2);
      expect(mockMessage.forward).toHaveBeenCalledWith(initialDestination);
      expect(mockMessage.forward).toHaveBeenCalledWith(defaultDestination);
      expect(console.error).toHaveBeenCalledWith(
        `Failed to forward email to ${initialDestination}:`,
        expect.any(Error),
      );
      expect(console.log).toHaveBeenCalledWith(
        `Attempting to forward to default address ${defaultDestination} after initial failure.`,
      );
    });

    it("should log error if fallback forward to default address also fails", async () => {
      const initialDestination = "user1@example.com";
      const defaultDestination = mockEnv.EMAIL_OPTIONS
        ? JSON.parse(mockEnv.EMAIL_OPTIONS).default_email_address
        : "";

      mockMessage.forward
        .mockRejectedValueOnce(new Error("Initial forward failed")) // First call fails
        .mockRejectedValueOnce(new Error("Fallback forward failed")); // Second call (to default) also fails

      mockValidateEmailAlias.mockResolvedValue(initialDestination);

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(mockMessage.forward).toHaveBeenCalledTimes(2);
      expect(mockMessage.forward).toHaveBeenCalledWith(initialDestination);
      expect(mockMessage.forward).toHaveBeenCalledWith(defaultDestination);
      expect(console.error).toHaveBeenCalledWith(
        `Failed to forward email to ${initialDestination}:`,
        expect.any(Error),
      );
      expect(console.log).toHaveBeenCalledWith(
        `Attempting to forward to default address ${defaultDestination} after initial failure.`,
      );
      expect(console.error).toHaveBeenCalledWith(
        `Failed to forward email to default address ${defaultDestination}:`,
        expect.any(Error),
      );
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

    it("should handle fallback to silent failure scenario", async () => {
      mockValidateEmailAlias.mockResolvedValue(null);

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        `No valid destination email for alias ${mockMessage.to}.`,
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });

    it("should handle configuration error scenario", async () => {
      mockEnv.EMAIL_OPTIONS = "";

      await worker.email(
        mockMessage as unknown as ForwardableEmailMessage,
        mockEnv,
        mockContext,
      );

      expect(console.error).toHaveBeenCalledWith(
        "EMAIL_OPTIONS environment variable is not set",
      );
      expect(mockMessage.setReject).not.toHaveBeenCalled();
      expect(mockMessage.forward).not.toHaveBeenCalled();
    });
  });
});
