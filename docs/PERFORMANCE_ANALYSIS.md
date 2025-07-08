# Time and Performance Analysis

This document provides a detailed time and performance analysis of the `email-gateway-cloudflare` worker. The analysis breaks down the execution flow, discusses key optimizations, and evaluates potential performance risks.

## Execution Flow Analysis

The worker's `email` function executes a series of steps to process an incoming email. The time complexity of each step is generally constant or very low, ensuring high performance.

| Step                                | Description                                                                                      | Time Complexity                     | Estimated Time (ms) |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------- |
| 1. **Input Validation**             | Checks for the presence of `message.to` and `message.from`.                                      | O(1)                                | < 0.1               |
| 2. **Parse `EMAIL_OPTIONS`**        | Parses a JSON string containing configuration options.                                           | O(1)                                | < 0.1               |
| 3. **Check Ignore List**            | Checks if the sender is in the `ignore_email_checks` array.                                      | O(k)                                | < 0.1               |
| 4. **Parse `EMAIL_SECRET_MAPPING`** | Parses a JSON string containing the secret key to recipient mappings.                            | O(n)                                | < 0.1               |
| 5. **Validate Email Alias**         | **(Optimized)** Validates the incoming email alias using a single HMAC check. See details below. | O(1)                                | < 0.5               |
| 6. **Forward Email**                | Initiates the email forwarding process. This is a non-blocking network call.                     | O(1)                                | < 0.1               |
| **Total Worker Execution Time**     | **(Excluding network latency for `forward`)**                                                    | -                                   | **< 1.0 ms**        |
| **Email Sanitization**              | Future implementation of email scrubbing.                                                        | Depends on number of links in email | 1ms - 8ms           |

_k: Number of entries in the ignore list (typically small)_
_n: Number of secret keys (parsing time is negligible for typical map sizes)_

## `validateEmailAlias` Optimization

A significant performance improvement has been implemented in the `email-alias-core` library, which this worker relies on.

### Previous Method (Inefficient)

Previously, the validation process would have to iterate through every secret key in the `EMAIL_SECRET_MAPPING`. For each key, it would compute an HMAC hash and compare it to the hash in the email alias. This resulted in a time complexity of O(n), where n is the number of secret keys.

### Current Method (Optimized)

The validation logic has been completely rewritten for O(1) performance. The new approach works as follows:

1.  When an alias is generated, the **first two characters of the secret key** are embedded into the alias itself as a prefix.
2.  When the email worker receives an alias, it extracts this two-character prefix.
3.  It then performs a direct lookup in the `EMAIL_SECRET_MAPPING` to find the single, corresponding secret key.
4.  Finally, it performs **only one** HMAC validation using the retrieved key.

This change dramatically reduces the processing time, especially in scenarios with a large number of secret keys, by eliminating the need to loop through the entire key map.

## Hypothetical: Email Body Sanitization (Future Integration)

**Note:** The following analysis is for a feature that is not yet implemented due to current limitations in the Cloudflare Email Workers platform (inability to modify the email body). The performance estimates are based on measured benchmarks of Cloudflare's `HTMLRewriter`.

To enhance privacy, the `email-sanitizer` library could be integrated to perform the following actions:

- **Strip Tracking Pixels:** Remove known tracking images from the email body.
- **Clean URLs:** Remove tracking parameters from links.

This would be accomplished using Cloudflare's `HTMLRewriter`, which is a streaming HTML parser and transformer. Because it operates on the email body as a stream, it adds minimal latency and has a negligible impact on memory usage, even for large emails.

- **Estimated Performance Impact:** 1-5ms, depending on email size and complexity.

## Risk Analysis

The new `validateEmailAlias` optimization introduces a different set of considerations compared to the previous brute-force method.

### 1. Information Leakage (Low Risk)

- **Scenario:** An attacker could observe that aliases generated with the same secret key share the same two-character prefix.
- **Analysis:** This leaks a very small amount of information about the secret key. Given that the secret keys should be high-entropy strings, knowing the first two characters does not significantly reduce the complexity of a brute-force attack to guess the entire key. The risk is considered very low.

### 2. Secret Key Prefix Collision (Medium Risk)

- **Scenario:** If two or more secret keys in the `EMAIL_SECRET_MAPPING` start with the same two characters, the validation logic will fail or produce incorrect results, as it will only be able to look up the first one it finds.
- **Mitigation:** It is crucial to **ensure that the first two characters of every secret key are unique**. This constraint should be enforced when generating and storing secret keys. A validation check upon worker startup could be added to enforce this uniqueness.

### 3. Forwarding to Default on Error (Low Risk)

- **Scenario:** Any error during the validation process (e.g., a key prefix not found) causes the email to be forwarded to the `default_email_address`.
- **Analysis:** This is a safe failure mode. It prevents email loss but means that a misconfigured alias will result in the email going to a generic inbox instead of being rejected. This is the intended behavior.
