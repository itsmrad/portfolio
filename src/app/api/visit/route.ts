import { stats, visit } from "@/components/footer/visits";

export const dynamic = "force-dynamic";

/** The shared numbers (total, live, map cells), cached by the CDN. */
export const GET = () => stats();

/** Counts a visit, once per client address per day, in production only. */
export const POST = (request: Request) => visit(request);
