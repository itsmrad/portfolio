export type CounterStore = { url: string; token: string };

/**
 * The visitor counter's store: any Redis with Upstash's REST API. Connecting
 * the free "Upstash for Redis" integration to the Vercel project's Production
 * environment (custom prefix left empty) sets KV_REST_API_URL and
 * KV_REST_API_TOKEN. Without them the counter cell is not rendered and the
 * route answers 404.
 */
export function counterStore(): CounterStore | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}
