/**
 * About: a greeting by the visitor's own clock, three short paragraphs whose
 * key phrases are bold (project names become chips that jump to the project),
 * and the "before you hire me" questions once the owner has answered them.
 */
import Link from "next/link";

import { hireQuestions } from "@/content/home";
import { about, projects } from "@/content/site";
import { Section, SectionBody, SectionHeader } from "@/components/layout/section";

import styles from "./about.module.css";

/** `**phrase**` in the content file becomes bold, or a chip when it names a featured project. */
function withMarks(text: string) {
  return text.split("**").map((part, index) => {
    if (index % 2 === 0) return part;
    const project = projects.find((item) => item.name === part);
    return project ? (
      <Link key={index} href={`/#${project.slug}`} prefetch={false} className={styles.chip}>
        {part}
        <span aria-hidden />
      </Link>
    ) : (
      <strong key={index} className="font-medium">
        {part}
      </strong>
    );
  });
}

export function About() {
  return (
    <Section id="about">
      <SectionHeader id="about" index={1} label="about" title="About" />
      <SectionBody className="flex flex-col gap-4 text-pretty">
        <p className="font-serif text-2xl/8">
          {/* The server cannot know the hour: it says Hello and this swaps it before first paint. */}
          <span suppressHydrationWarning>Hello</span>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(h){document.currentScript.previousElementSibling.textContent=h<12?"Good morning":h<17?"Good afternoon":"Good evening"})(new Date().getHours())`,
            }}
          />
          .
        </p>
        {about.map((paragraph) => (
          <p key={paragraph}>{withMarks(paragraph)}</p>
        ))}
      </SectionBody>

      {hireQuestions.length > 0 && (
        <div className="screen-line-top p-4">
          <h3 className="eyebrow">Before you hire me</h3>
          <div className={styles.questions}>
            {hireQuestions.map((item) => (
              // One open at a time, with no script: the browser groups them by name.
              <details key={item.question} name="before-you-hire-me">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
