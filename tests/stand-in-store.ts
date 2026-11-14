/**
 * A deterministic stand-in for the Upstash REST API: the handful of Redis
 * commands the visitor counter uses, its two scripts (recognised by their
 * leading "-- visit" / "-- live" comment), single commands at "/" and
 * pipelines at "/pipeline". It counts billed commands the way Upstash bills
 * them (a script is 1 plus each command it runs). Plain TypeScript with no
 * project imports, so `node tests/stand-in-server.ts` can run it too.
 */
type Value = string | number | null | Value[];

export class StandInStore {
  strings = new Map<string, { value: string; expires?: number }>();
  zsets = new Map<string, Map<string, number>>();
  billed = 0;
  log: string[] = [];
  mode: "ok" | "down" | "slow" | "garbage" = "ok";

  private string(key: string) {
    const entry = this.strings.get(key);
    if (entry?.expires !== undefined && entry.expires <= Date.now()) {
      this.strings.delete(key);
      return undefined;
    }
    return entry;
  }

  private zset(key: string) {
    let set = this.zsets.get(key);
    if (!set) this.zsets.set(key, (set = new Map()));
    return set;
  }

  private static score(raw: unknown) {
    return raw === "-inf" ? -Infinity : raw === "+inf" ? Infinity : Number(raw);
  }

  /** Runs one command; `billed` counts it. */
  run(command: unknown[]): Value {
    const [name, ...args] = command.map((part) => (typeof part === "number" ? String(part) : (part as string)));
    this.billed++;
    this.log.push(String(name));
    const key = args[0]!;
    switch (String(name).toUpperCase()) {
      case "GET":
        return this.string(key)?.value ?? null;
      case "SET": {
        const nx = args.includes("NX");
        const ex = args.indexOf("EX");
        if (nx && this.string(key)) return null;
        this.strings.set(key, { value: args[1]!, expires: ex > 0 ? Date.now() + Number(args[ex + 1]) * 1000 : undefined });
        return "OK";
      }
      case "INCR": {
        const entry = this.string(key);
        const value = Number(entry?.value ?? 0) + 1;
        this.strings.set(key, { value: String(value), expires: entry?.expires });
        return value;
      }
      case "EXPIRE": {
        const entry = this.string(key);
        if (!entry) return 0;
        entry.expires = Date.now() + Number(args[1]) * 1000;
        return 1;
      }
      case "ZADD":
        this.zset(key).set(args[2]!, Number(args[1]));
        return 1;
      case "ZINCRBY": {
        const set = this.zset(key);
        const value = (set.get(args[2]!) ?? 0) + Number(args[1]);
        set.set(args[2]!, value);
        return String(value);
      }
      case "ZCOUNT": {
        const [min, max] = [StandInStore.score(args[1]), StandInStore.score(args[2])];
        return [...this.zset(key).values()].filter((score) => score >= min && score <= max).length;
      }
      case "ZREMRANGEBYSCORE": {
        const [min, max] = [StandInStore.score(args[1]), StandInStore.score(args[2])];
        const set = this.zset(key);
        let removed = 0;
        for (const [member, score] of set) if (score >= min && score <= max && set.delete(member)) removed++;
        return removed;
      }
      case "ZREVRANGE": {
        const ranked = [...this.zset(key)].sort((a, b) => b[1] - a[1]).slice(Number(args[1]), Number(args[2]) + 1);
        return ranked.flatMap(([member, score]) => [member, String(score)]);
      }
      case "EVAL":
        return this.eval(args);
      default:
        throw new Error(`stand-in: unknown command ${name}`);
    }
  }

  /** The two scripts, step for step as their Lua reads. */
  private eval([script, count, ...rest]: string[]): Value {
    const keys = rest.slice(0, Number(count));
    const argv = rest.slice(Number(count));
    const call = (...command: (string | number)[]) => this.run(command);
    const day = call("INCR", keys[0]!) as number;
    if (script!.startsWith("-- visit")) {
      if (day === 1) {
        call("EXPIRE", keys[0]!, 172800);
        call("ZREMRANGEBYSCORE", keys[3]!, "-inf", argv[3]!);
      }
      if (day > Number(argv[0])) return -1;
      if (call("SET", keys[1]!, 1, "NX", "EX", argv[1]!) === null) return -2;
      const total = call("INCR", keys[2]!) as number;
      if (argv[2] !== "") call("ZINCRBY", keys[4]!, 1, argv[2]!);
      return total;
    }
    if (script!.startsWith("-- live")) {
      if (day === 1) {
        call("EXPIRE", keys[0]!, 172800);
        call("ZREMRANGEBYSCORE", keys[1]!, "-inf", argv[2]!);
      }
      if (day > Number(argv[0])) return -1;
      call("ZADD", keys[1]!, argv[1]!, argv[3]!);
      return 1;
    }
    throw new Error("stand-in: unknown script");
  }

  /** An HTTP reply as Upstash gives it, honouring the failure mode. */
  async handle(path: string, body: unknown, signal?: AbortSignal | null): Promise<Response> {
    if (this.mode === "down") return new Response("down", { status: 500 });
    if (this.mode === "garbage") return new Response("<html>not json", { status: 200 });
    if (this.mode === "slow") {
      await new Promise((_, reject) => signal?.addEventListener("abort", () => reject(signal.reason)));
    }
    if (path.endsWith("/pipeline")) return Response.json((body as unknown[][]).map((command) => ({ result: this.run(command) })));
    return Response.json({ result: this.run(body as unknown[]) });
  }

  /** Fills the store for a picture: a total, map cells and some live tabs. */
  seed({ total = 0, cells = [] as [number, number, number][], live = 0 }) {
    this.strings.set("visitors", { value: String(total) });
    const map = this.zset("visitors:cells");
    for (const [lat, lon, visits] of cells) map.set(`${lat}:${lon}`, visits);
    const tabs = this.zset("visitors:live");
    for (let i = 0; i < live; i++) tabs.set(`tab${String(i).padStart(19, "0")}`, Date.now());
  }
}

/** Routes this process's fetch calls for the store's URL to `store`. Returns a restore. */
export function useStandIn(store: StandInStore, url = "https://store.test") {
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const target = String(input instanceof Request ? input.url : input);
    if (!target.startsWith(url)) return real(input, init);
    return store.handle(new URL(target).pathname, JSON.parse(String(init?.body ?? "null")), init?.signal);
  }) as typeof fetch;
  return () => void (globalThis.fetch = real);
}
