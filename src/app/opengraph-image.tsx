import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import { seo, site, socials } from "@/content/site";

export const alt = `${site.name}, ${site.role.toLowerCase()}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#fafafa";
const MUTED = "#a1a1aa";
const LINE = "#27272a";
const CROSS = "#52525b";
const EDGE = 80;

const font = (file: string) => readFile(path.join(process.cwd(), "src/assets/og", file));

/** A "+" registration mark centred on a point. */
function Cross({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position: "absolute", left: x - 10, top: y - 10, width: 21, height: 21, display: "flex" }}>
      <div style={{ position: "absolute", left: 0, top: 10, width: 21, height: 1, background: CROSS }} />
      <div style={{ position: "absolute", left: 10, top: 0, width: 1, height: 21, background: CROSS }} />
    </div>
  );
}

/** The share card, drawn in the site's own frame: hairlines, registration marks, the mark. */
export default async function OpenGraphImage() {
  const [serif, mono] = await Promise.all([font("InstrumentSerif-Regular.ttf"), font("GeistMono-Regular.ttf")]);
  const { width, height } = size;

  return new ImageResponse(
    (
      <div style={{ width, height, display: "flex", background: "#09090b", color: INK, fontFamily: "Geist Mono" }}>
        <div style={{ position: "absolute", left: EDGE, top: 0, width: 1, height, background: LINE }} />
        <div style={{ position: "absolute", left: width - EDGE, top: 0, width: 1, height, background: LINE }} />
        <div style={{ position: "absolute", left: 0, top: EDGE, width, height: 1, background: LINE }} />
        <div style={{ position: "absolute", left: 0, top: height - EDGE, width, height: 1, background: LINE }} />
        <Cross x={EDGE} y={EDGE} />
        <Cross x={width - EDGE} y={EDGE} />
        <Cross x={EDGE} y={height - EDGE} />
        <Cross x={width - EDGE} y={height - EDGE} />

        <div
          style={{
            position: "absolute",
            left: EDGE,
            top: EDGE,
            width: width - EDGE * 2,
            height: height - EDGE * 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 48,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <svg width="56" height="56" viewBox="0 0 32 32" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="square">
              <path d="M3 26 9.5 6 16 26M5.6 19h7.8" />
              <path d="M20 6h5l4 4v12l-4 4h-5Z" />
            </svg>
            <div style={{ fontSize: 22, letterSpacing: 2, color: MUTED }}>{site.domain.toUpperCase()}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Instrument Serif", fontSize: 128, lineHeight: 1, letterSpacing: -2 }}>
              {site.name}
            </div>
            <div style={{ marginTop: 20, fontSize: 30, color: MUTED }}>{seo.ogTagline}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: MUTED }}>
            <div>{`${site.role} / ${site.location.label}`}</div>
            <div>{socials[0]?.href.replace("https://", "")}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: serif, weight: 400, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
