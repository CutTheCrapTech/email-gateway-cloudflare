/**
 * A custom error class to identify errors specific to the API module.
 * This helps in providing targeted feedback to the user in the UI.
 */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}
