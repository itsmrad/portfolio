/**
 * GitHub activity: a year of contributions, drawn on the server from data
 * fetched while the page is built and refreshed at most once a day (see
 * lib/github). No client fetch and no chart library. If the data cannot be
 * had, the section falls back to a plain link to the profile.
 *
 * The calendar is one SVG with a path per intensity level, so a year costs a
 * handful of elements. Reading out a day (hover, tap or arrow keys) and the
 * wave on scroll are added by ./effects.
 */
import { socials } from "@/content/site";
import { type Contributions, contributions } from "@/lib/github";
import { ExternalLink } from "@/components/layout/external-link";
import { Section, SectionBody, SectionHeader } from "@/components/layout/section";

import styles from "./activity.module.css";

const DAY = 86_400_000;
const PITCH = 12; // a 10px cell and its 2px gap
const LEVELS = [0, 1, 2, 3, 4];
const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
// US short names are all three letters ("Sep", not "Sept"), which is what keeps the labels apart on a phone.
const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
/** Weeks a label needs to itself: three 6px letters and a gap, at the 5.9px week of a 360px phone. */
const LABEL_WEEKS = 4;

function Calendar({ data, label }: { data: Contributions; label: string }) {
  const first = Date.parse(data.start);
  const offset = new Date(first).getUTCDay();
  const weeks = Math.ceil((offset + data.levels.length) / 7);
  const width = weeks * PITCH - 2;

  // Each day is a zero-length stroke with square caps: a 10px square for six characters of path.
  const paths = LEVELS.map(() => "");
  // A label on the week that holds the 1st of each month. One that would run into the next gives way,
  // and so does one too close to the right edge to fit.
  const months: { week: number; name: string }[] = [];
  [...data.levels].forEach((level, index) => {
    const position = index + offset;
    const week = Math.floor(position / 7);
    paths[Number(level)] += `M${week * PITCH + 5} ${(position % 7) * PITCH + 5}h0`;
    const day = new Date(first + index * DAY);
    if (index === 0 || day.getUTCDate() === 1) {
      if (months.length > 0 && week - months.at(-1)!.week < LABEL_WEEKS) months.pop();
      if (weeks - week >= LABEL_WEEKS - 1) months.push({ week, name: month.format(day) });
    }
  });

  return (
    <div className={styles.calendar}>
      <div
        role="group"
        aria-label={label}
        tabIndex={0}
        data-calendar={data.start}
        data-counts={data.counts.join()}
        className={styles.days}
      >
        <div className={styles.months} aria-hidden>
          {months.map(({ week, name }) => (
            <span key={week} style={{ left: `${((week * PITCH) / width) * 100}%` }}>
              {name}
            </span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${width} ${7 * PITCH - 2}`}
          aria-hidden
          style={{ "--weeks": weeks, "--end": `${weeks * PITCH}px` } as React.CSSProperties}
        >
          <g>
            {paths.map((d, level) => (
              <path key={level} d={d} data-level={level} />
            ))}
          </g>
          {/* The leading edge of the wave, then the outline of the day being read. */}
          <path d={`M5 0v${7 * PITCH - 2}`} />
          <rect width="12" height="12" />
        </svg>
      </div>
      <p role="status" className={styles.tip} />
    </div>
  );
}

export async function Activity() {
  const github = socials.find((social) => social.label === "GitHub");
  if (!github) return null;
  const data = await contributions();
  const total = data?.total.toLocaleString("en-US");
  const [from, to] = data ? [new Date(data.start), new Date(Date.parse(data.start) + (data.counts.length - 1) * DAY)] : [];
  return (
    <Section id="activity">
      <SectionHeader id="activity" index={5} label="activity" title="GitHub activity">
        {data && (
          <p className="pb-1 text-right text-sm text-muted-foreground">
            <data value={data.total} className="mr-1.5 font-pixel text-xl/none text-foreground">
              {total}
            </data>{" "}
            in the last year
          </p>
        )}
      </SectionHeader>
      {data && from && to ? (
        <SectionBody>
          <Calendar
            data={data}
            label={`Contribution calendar: ${total} contributions between ${date.format(from)} and ${date.format(to)}. Use the arrow keys to read a day.`}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <p>
              <time dateTime={data.start}>{date.format(from)}</time>
              {" – "}
              <time dateTime={to.toISOString().slice(0, 10)}>{date.format(to)}</time>. Source:{" "}
              <ExternalLink href={github.href}>GitHub</ExternalLink>.
            </p>
            <p className={styles.legend} aria-hidden>
              Less
              {LEVELS.map((level) => (
                <i key={level} data-level={level} />
              ))}
              More
            </p>
          </div>
        </SectionBody>
      ) : (
        <SectionBody className="text-sm">
          <ExternalLink href={github.href}>View {github.handle} on GitHub</ExternalLink>
        </SectionBody>
      )}
    </Section>
  );
}
