/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock webextension-polyfill
vi.mock("webextension-polyfill", () => ({
  default: {
    runtime: { onMessage: { addListener: vi.fn() } },
  },
}));

// Import the actual functions to be tested
import { findAllEmailInputs, findBestEmailInput } from "../content";

describe("Content Script Helpers", () => {
  beforeEach(() => {
    // Reset the DOM before each test
    document.body.innerHTML = "";
  });

  afterEach(() => {
    // Clean up the DOM after each test
    document.body.innerHTML = "";
  });

  describe("findAllEmailInputs", () => {
    it("should find all standard email inputs", () => {
      document.body.innerHTML = `
        <input type="email" id="input1">
        <input type="text" name="email" id="input2">
        <input type="text" placeholder="Enter your e-mail" id="input3">
        <input type="text" autocomplete="username" id="input4">
      `;
      const inputs = findAllEmailInputs();
      expect(inputs.length).toBe(4);
    });

    it("should ignore non-email inputs", () => {
      document.body.innerHTML = `
        <input type="text" id="input1">
        <input type="password" id="input2">
        <input type="submit" id="input3">
      `;
      const inputs = findAllEmailInputs();
      expect(inputs.length).toBe(0);
    });

    it("should ignore hidden, disabled, and readonly inputs", () => {
      document.body.innerHTML = `
        <input type="email" id="visible-input">
        <input type="email" id="disabled-input" disabled>
        <input type="email" id="readonly-input" readonly>
        <input type="email" id="hidden-input" style="display: none;">
        <input type="email" id="hidden-input-attr" hidden>
      `;
      const inputs = findAllEmailInputs();
      expect(inputs.length).toBe(1);
      expect(inputs[0]?.id).toBe("visible-input");
    });
  });

  describe("findBestEmailInput", () => {
    it("should return null if no email inputs are found", () => {
      document.body.innerHTML = `<input type="text">`;
      expect(findBestEmailInput()).toBeNull();
    });

    it("should return the only email input if there is just one", () => {
      document.body.innerHTML = `<input type="email" id="single-email">`;
      const input = findBestEmailInput();
      expect(input).not.toBeNull();
      expect(input?.id).toBe("single-email");
    });

    it("should prioritize the currently focused input", () => {
      document.body.innerHTML = `
        <input type="email" id="email1">
        <input type="email" id="email2">
      `;
      const email2 = document.getElementById("email2") as HTMLInputElement;
      email2.focus(); // Focus the second input

      const bestInput = findBestEmailInput();
      expect(bestInput?.id).toBe("email2");
    });

    it("should prefer type='email' over other attributes", () => {
      document.body.innerHTML = `
        <input type="text" name="email" id="text-email">
        <input type="email" id="actual-email">
      `;
      const bestInput = findBestEmailInput();
      expect(bestInput?.id).toBe("actual-email");
    });

    it("should use scoring to find the best match among several candidates", () => {
      document.body.innerHTML = `
        <input type="text" placeholder="username" id="username">
        <input type="text" name="login" id="login">
        <input type="text" autocomplete="email" id="autocomplete-email">
      `;
      const bestInput = findBestEmailInput();
      // autocomplete="email" should have a high score
      expect(bestInput?.id).toBe("autocomplete-email");
    });
  });
});
