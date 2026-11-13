import type { Benchmarks as Data } from "@/content/site";
import { ExternalLink } from "@/components/layout/external-link";

import s from "./benchmarks.module.css";

/**
 * The published benchmark numbers drawn as two small bar plates, like sheets
 * in a drawing set. Plain HTML and CSS: the numbers are text; each bar is one
 * empty element whose p50 and p95 stops are custom properties. A plate draws
 * its bars once, on a timer, when it scrolls into view, so a bar at rest is
 * always its true length.
 */
export function Benchmarks({ data }: { data: Data }) {
  const { memory, latency } = data;
  return (
    <figure className={s.figure}>
      <Plate title={memory.title} aside={memory.unit} max={memory.max} step={memory.step}>
        {memory.rows.map((row) => (
          <Row key={row.label} label={row.label} note={row.note} a={+row.value / memory.max}>
            <Value value={row.value} unit={memory.unit} />
          </Row>
        ))}
      </Plate>
      <Plate
        title={latency.title}
        aside={
          <>
            <i /> p50 <i className={s.p95} /> p95
          </>
        }
        max={latency.max}
        step={latency.step}
      >
        {latency.rows.map((row) => (
          <Row
            key={row.label}
            label={row.label}
            note={row.part && `of which ${row.part.label}: ${row.part.value} ${latency.unit}`}
            a={+row.p50 / latency.max}
            b={+row.p95 / latency.max}
          >
            <span className="sr-only">p50 / p95: </span>
            <Value value={row.p50} /> / <Value value={row.p95} unit={latency.unit} />
          </Row>
        ))}
      </Plate>
      <figcaption>
        <p>{data.idle}</p>
        <p>{data.conditions}</p>
        <p className="font-mono">
          Source: <ExternalLink href={data.source.href}>{data.source.label}</ExternalLink>
        </p>
      </figcaption>
    </figure>
  );
}

function Plate({
  title,
  aside,
  max,
  step,
  children,
}: {
  title: string;
  aside: React.ReactNode;
  max: number;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <div className={s.plate}>
      <p className={s.head}>
        <span className="eyebrow">{title}</span>
        <span aria-hidden>{aside}</span>
      </p>
      <ul>{children}</ul>
      <p aria-hidden className={s.ticks}>
        {Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => (
          <span key={i} style={{ left: `${(i * step * 100) / max}%` }}>
            {i * step}
          </span>
        ))}
      </p>
    </div>
  );
}

function Row({
  label,
  note,
  a,
  b = a,
  children,
}: {
  label: string;
  note?: string;
  /** Bar stops as fractions of the scale: p50 (or the value), then p95. */
  a: number;
  b?: number;
  children: React.ReactNode;
}) {
  const pct = (n: number) => `${+(n * 100).toFixed(2)}%`;
  return (
    <li>
      {label}
      <span className={s.value}>{children}</span>
      <i style={{ "--a": pct(a), "--b": pct(b) } as React.CSSProperties} />
      {note && <small>{note}</small>}
    </li>
  );
}

function Value({ value, unit }: { value: string; unit?: string }) {
  return (
    <data value={value}>
      {value}
      {unit && <span> {unit}</span>}
    </data>
  );
}
