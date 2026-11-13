import { footer } from "@/content/footer";
import { site } from "@/content/site";

import { latestWork } from "./activity";
import { Clock, Scramble } from "./strip-client";

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Live status strip above the title block: two columns of mono, uppercase
 * telemetry. Server-rendered and true without JavaScript; the client only
 * scrambles the text in once and starts the clock.
 */
export async function StatusStrip() {
  const work = await latestWork();
  const labels = footer.statusLabels;

  return (
    <Scramble className="px-4 py-5" data-print="hide">
      <dl className="grid gap-x-10 gap-y-1.5 font-mono text-xs/5 font-medium tracking-[0.06em] uppercase sm:grid-cols-2">
        <Fact label={labels.location} icon={<PinIcon />}>
          <span data-scramble>{site.location.label}</span>
        </Fact>
        <Fact label={labels.time} icon={<ClockIcon />}>
          <Clock
            timeZone={site.location.timeZone}
            zone={footer.zone}
            ahead={footer.timeAhead}
            behind={footer.timeBehind}
            same={footer.timeSame}
          >
            {footer.zoneFallback}
          </Clock>
        </Fact>
        <Fact label={labels.work} icon={<CommitIcon />}>
          <span data-scramble>{`${footer.buildingPrefix} ${work.name}`}</span>
          <span className="text-muted-foreground">
            {" · "}
            <time dateTime={work.date}>{DATE.format(new Date(work.date))}</time>
          </span>
        </Fact>
        <Fact label={labels.availability} icon={<LiveDot />}>
          <span data-scramble>{footer.availabilityShort}</span>
        </Fact>
      </dl>
    </Scramble>
  );
}

function Fact({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <dt className="contents">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="size-[15px] shrink-0 text-muted-foreground"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function PinIcon() {
  return (
    <Icon>
      <path d="M8 14.5s4.5-4.1 4.5-7.75a4.5 4.5 0 0 0-9 0C3.5 10.4 8 14.5 8 14.5Z" />
      <circle cx="8" cy="6.75" r="1.5" />
    </Icon>
  );
}

function ClockIcon() {
  return (
    <Icon>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.75V8l2.25 1.5" />
    </Icon>
  );
}

function CommitIcon() {
  return (
    <Icon>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M1.5 8h4M10.5 8h4" />
    </Icon>
  );
}

/** The one place the strip uses the signal colour: the "live" state. */
function LiveDot() {
  return (
    <span className="relative grid size-[15px] shrink-0 place-items-center" aria-hidden>
      <span className="absolute size-2 animate-ping rounded-full bg-signal opacity-40 motion-reduce:hidden" />
      <span className="size-1.5 rounded-full bg-signal" />
    </span>
  );
}
