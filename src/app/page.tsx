/* eslint-disable @next/next/no-img-element */

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Markdown from "react-markdown";
import BlurFade from "@/components/magicui/blur-fade";
import BlurFadeText from "@/components/magicui/blur-fade-text";
import ContactSection from "@/components/section/contact-section";
import HackathonsSection from "@/components/section/hackathons-section";
import ProjectsSection from "@/components/section/projects-section";
import WorkSection from "@/components/section/work-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DATA } from "@/data/resume";

const BLUR_FADE_DELAY = 0.04;

const personJsonLd = {
	"@context": "https://schema.org",
	"@type": "Person",
	name: DATA.name,
	alternateName: DATA.initials,
	url: DATA.url,
	image: `${DATA.url}${DATA.avatarUrl}`,
	jobTitle: "Full Stack Developer",
	description: DATA.description,
	email: DATA.contact.email,
	telephone: DATA.contact.tel,
	address: {
		"@type": "PostalAddress",
		addressLocality: "New Delhi",
		addressRegion: "Delhi",
		addressCountry: "IN",
	},
	alumniOf: DATA.education.map((edu) => ({
		"@type": "EducationalOrganization",
		name: edu.school,
		url: edu.href,
	})),
	worksFor: DATA.work.map((work) => ({
		"@type": "Organization",
		name: work.company,
		url: work.href,
	})),
	knowsAbout: [
		...DATA.skills.map((skill) => skill.name),
		"Full Stack Development",
		"Web Development",
		"Distributed Systems",
		"Software Engineering",
		"System Design",
	],
	sameAs: Object.values(DATA.contact.social)
		.filter((social) => social.name !== "Send Email")
		.map((social) => social.url),
};

const websiteJsonLd = {
	"@context": "https://schema.org",
	"@type": "WebSite",
	name: `${DATA.name} — Full Stack Developer Portfolio`,
	url: DATA.url,
	description: DATA.description,
	author: {
		"@type": "Person",
		name: DATA.name,
	},
};

const profilePageJsonLd = {
	"@context": "https://schema.org",
	"@type": "ProfilePage",
	mainEntity: {
		"@type": "Person",
		name: DATA.name,
		url: DATA.url,
	},
	url: DATA.url,
	name: `${DATA.name} — Full Stack Developer`,
	description: DATA.description,
};

export default function Page() {
	return (
		<main className="min-h-dvh flex flex-col gap-14 relative">
			<h1 className="sr-only">{DATA.name} - Full Stack Developer</h1>
			<script
				type="application/ld+json"
				suppressHydrationWarning
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c"),
				}}
			/>
			<script
				type="application/ld+json"
				suppressHydrationWarning
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
				}}
			/>
			<script
				type="application/ld+json"
				suppressHydrationWarning
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(profilePageJsonLd).replace(/</g, "\\u003c"),
				}}
			/>
			<section id="hero">
				<div className="mx-auto w-full max-w-2xl space-y-8">
					<div className="gap-2 gap-y-6 flex flex-col md:flex-row justify-between">
						<div className="gap-2 flex flex-col order-2 md:order-1">
							<BlurFadeText
								delay={BLUR_FADE_DELAY}
								className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl"
								yOffset={8}
								text={`Hi, I'm ${DATA.name.split(" ")[0]}`}
							/>
							<BlurFadeText
								className="text-muted-foreground max-w-150 md:text-lg lg:text-xl"
								delay={BLUR_FADE_DELAY}
								text={DATA.description}
							/>
						</div>
						<BlurFade
							delay={BLUR_FADE_DELAY}
							className="order-1 md:order-2">
							<Avatar className="size-24 md:size-32 border rounded-full shadow-lg ring-4 ring-muted">
								<AvatarImage
									alt={DATA.name}
									src={DATA.avatarUrl}
								/>
								<AvatarFallback>{DATA.initials}</AvatarFallback>
							</Avatar>
						</BlurFade>
					</div>
				</div>
			</section>
			<section id="about">
				<div className="flex min-h-0 flex-col gap-y-4">
					<BlurFade delay={BLUR_FADE_DELAY * 3}>
						<h2 className="text-xl font-bold">About</h2>
					</BlurFade>
					<BlurFade delay={BLUR_FADE_DELAY * 4}>
						<div className="prose max-w-full text-pretty font-sans leading-relaxed text-muted-foreground dark:prose-invert">
							<Markdown>{DATA.summary}</Markdown>
						</div>
					</BlurFade>
				</div>
			</section>
			<section id="work">
				<div className="flex min-h-0 flex-col gap-y-6">
					<BlurFade delay={BLUR_FADE_DELAY * 5}>
						<h2 className="text-xl font-bold">Work Experience</h2>
					</BlurFade>
					<BlurFade delay={BLUR_FADE_DELAY * 6}>
						<WorkSection />
					</BlurFade>
				</div>
			</section>
			<section id="education">
				<div className="flex min-h-0 flex-col gap-y-6">
					<BlurFade delay={BLUR_FADE_DELAY * 7}>
						<h2 className="text-xl font-bold">Education</h2>
					</BlurFade>
					<div className="flex flex-col gap-8">
						{DATA.education.map((education, index) => (
							<BlurFade
								key={`${education.school}-${education.degree}`}
								delay={BLUR_FADE_DELAY * 8 + index * 0.05}>
								<Link
									href={education.href}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-x-3 justify-between group">
									<div className="flex items-center gap-x-3 flex-1 min-w-0">
										{education.logoUrl ? (
											<img
												src={education.logoUrl}
												alt={education.school}
												className="size-8 md:size-10 p-1 border rounded-full shadow ring-2 ring-border overflow-hidden object-contain flex-none"
											/>
										) : (
											<div className="size-8 md:size-10 p-1 border rounded-full shadow ring-2 ring-border bg-muted flex-none" />
										)}
										<div className="flex-1 min-w-0 flex flex-col gap-0.5">
											<div className="font-semibold leading-none flex items-center gap-2">
												{education.school}
												<ArrowUpRight
													className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
													aria-hidden
												/>
											</div>
											<div className="font-sans text-sm text-muted-foreground">
												{education.degree}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground text-right flex-none">
										<span>
											{education.start} - {education.end}
										</span>
									</div>
								</Link>
							</BlurFade>
						))}
					</div>
				</div>
			</section>
			<section id="skills">
				<div className="flex min-h-0 flex-col gap-y-4">
					<BlurFade delay={BLUR_FADE_DELAY * 9}>
						<h2 className="text-xl font-bold">Skills</h2>
					</BlurFade>
					<div className="flex flex-wrap gap-2">
						{DATA.skills.map((skill, id) => (
							<BlurFade
								key={skill.name}
								delay={BLUR_FADE_DELAY * 10 + id * 0.05}>
								<div className="border bg-background border-border ring-2 ring-border/20 rounded-xl h-8 w-fit px-4 flex items-center gap-2">
									{skill.icon && (
										<skill.icon className="size-4 rounded overflow-hidden object-contain" />
									)}
									<span className="text-foreground text-sm font-medium">
										{skill.name}
									</span>
								</div>
							</BlurFade>
						))}
					</div>
				</div>
			</section>
			<section id="projects">
				<BlurFade delay={BLUR_FADE_DELAY * 11}>
					<ProjectsSection />
				</BlurFade>
			</section>
			<section id="hackathons">
				<BlurFade delay={BLUR_FADE_DELAY * 13}>
					<HackathonsSection />
				</BlurFade>
			</section>
			<section id="contact">
				<BlurFade delay={BLUR_FADE_DELAY * 16}>
					<ContactSection />
				</BlurFade>
			</section>
		</main>
	);
}
