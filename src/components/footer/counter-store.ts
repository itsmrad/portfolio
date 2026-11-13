/**
 * The visitor counter's store: any Redis with Upstash's REST API. Connecting
 * the free "Upstash for Redis" integration in the Vercel dashboard sets the
 * KV_* variables; a database made directly at upstash.com gives the UPSTASH_*
 * pair. Without either, the counter cell is not rendered and the route 404s.
 */
export function counterStore() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}
