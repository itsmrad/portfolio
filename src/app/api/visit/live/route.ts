import { live } from "@/components/footer/visits";

export const dynamic = "force-dynamic";

/** A tab's heartbeat; answers the requester's own coarse place and distance from Anupam. */
export const POST = (request: Request) => live(request);
