/** SLOT (home branch). Stub: real copy, minimal styling. Keep id="about". */
import { about } from "@/content/site";
import { Section, SectionBody, SectionHeader } from "@/components/layout/section";

/** `**phrase**` in the content file becomes <strong>. */
function withBold(text: string) {
  return text
    .split("**")
    .map((part, i) => (i % 2 ? <strong key={i} className="font-medium">{part}</strong> : part));
}

export function About() {
  return (
    <Section id="about">
      <SectionHeader id="about" index={1} label="about" title="About" />
      <SectionBody className="flex flex-col gap-4 text-pretty">
        {about.map((paragraph) => (
          <p key={paragraph}>{withBold(paragraph)}</p>
        ))}
      </SectionBody>
    </Section>
  );
}
