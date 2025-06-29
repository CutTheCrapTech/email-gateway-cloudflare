import { EmailAliasCore } from 'email-alias-core';
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

/**
 * Defines the structure of the environment variable bindings expected by the Pages Function.
 */
type Bindings = {
	/** The secret key used for HMAC signature generation. Must match the key used for worker verification. */
	SECRET_KEY: string;
	/** The domain for which email aliases are generated (e.g., "example.com"). */
	DOMAIN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * GET /
 * Generates a new email alias for a given service.
 * @param {string} service - The name of the service, passed as a query parameter.
 * @returns {Response} A JSON response containing the generated alias or an error message.
 */
app.get('/', (c) => {
	const service = c.req.query('service');

	if (!service) {
		return c.json({ error: 'The "service" query parameter is required.' }, 400);
	}

	const { SECRET_KEY, DOMAIN } = c.env;

	if (!SECRET_KEY || !DOMAIN) {
		console.error('SECRET_KEY and/or DOMAIN environment variables are not set.');
		return c.json({ error: 'Server is not configured correctly.' }, 500);
	}

	try {
		const emailAliasCore = new EmailAliasCore({
			secretKey: SECRET_KEY,
			domain: DOMAIN,
		});

		const alias = emailAliasCore.generate(service);

		return c.json({
			service: service,
			alias: alias,
		});
	} catch (error) {
		console.error(`Failed to generate alias for service "${service}":`, error);
		return c.json({ error: 'An internal error occurred while generating the alias.' }, 500);
	}
});

/**
 * The `onRequest` export is the entry point for all requests to the Cloudflare Pages Function.
 * It uses Hono to handle routing and request processing.
 */
export const onRequest = handle(app);
