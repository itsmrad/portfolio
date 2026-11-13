/**
 * SLOT (home branch): GitHub activity. Stub: the link the real section falls
 * back to when the contribution data cannot be fetched. Keep id="activity".
 * The graph is server-rendered (CSS grid or SVG) from build-time data with
 * `revalidate = 86400`; no client fetch and no chart library.
 */
import { socials } from "@/content/site";
import { ExternalLink } from "@/components/layout/external-link";
import { Section, SectionBody, SectionHeader } from "@/components/layout/section";

export function Activity() {
  const github = socials.find((social) => social.label === "GitHub");
  if (!github) return null;
  return (
    <Section id="activity">
      <SectionHeader id="activity" index={5} label="activity" title="GitHub activity" />
      <SectionBody className="text-sm">
        <ExternalLink href={github.href}>View {github.handle} on GitHub</ExternalLink>
      </SectionBody>
    </Section>
  );
}
