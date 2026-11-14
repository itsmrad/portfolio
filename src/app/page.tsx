import { homeGraph, homeMetadata, jsonLd } from "@/lib/seo";
import { ArcadeSlot } from "@/components/arcade/slot";
import { FrameDimension } from "@/components/layout/dimension";
import { Separator } from "@/components/layout/section";
import { Building } from "@/components/projects/building";
import { Projects } from "@/components/projects/projects";
import { About } from "@/components/sections/about";
import { Activity } from "@/components/sections/activity";
import { Contact } from "@/components/sections/contact";
import { Education } from "@/components/sections/education";
import { Experience } from "@/components/sections/experience";
import { Faq } from "@/components/sections/faq";
import { Hero } from "@/components/sections/hero";
import { Stack } from "@/components/sections/stack";

export const metadata = homeMetadata();

/**
 * The one page. Composition only and frozen: feature branches fill the section
 * files, they do not edit this one. Order and ids are part of the contract.
 */
export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(homeGraph()) }} />
      <FrameDimension />
      <Hero />
      <Separator />
      <About />
      <Separator />
      <Experience />
      <Separator />
      <Projects />
      <Building />
      <Separator />
      <Activity />
      <Separator />
      <Stack />
      <Separator />
      <Education />
      <Separator />
      <Faq />
      <Separator />
      <Contact />
      {/* Home only, never the 404: the margin arcade (renders nothing on the server). */}
      <ArcadeSlot />
    </>
  );
}
