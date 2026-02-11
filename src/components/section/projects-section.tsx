"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import BlurFade from "@/components/magicui/blur-fade";
import { ProjectCard } from "@/components/project-card";
import { DATA } from "@/data/resume";
import { Button } from "../ui/button";

const BLUR_FADE_DELAY = 0.001;
const INITIAL_COUNT = 6;
const LOAD_MORE_COUNT = 4;

export default function ProjectsSection() {
	const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
	const totalProjects = DATA.projects.length;
	const hasMore = visibleCount < totalProjects;
	const visibleProjects = DATA.projects.slice(0, visibleCount);

	const handleViewMore = () => {
		setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, totalProjects));
	};

	return (
		<section id="projects">
			<div className="flex min-h-0 flex-col gap-y-8">
				<div className="flex flex-col gap-y-4 items-center justify-center">
					<div className="flex items-center w-full">
						<div className="flex-1 h-px bg-linear-to-r from-transparent from-5% via-border via-95% to-transparent" />
						<div className="border bg-primary z-10 rounded-xl px-4 py-1">
							<span className="text-background text-sm font-medium">
								My Projects
							</span>
						</div>
						<div className="flex-1 h-px bg-linear-to-l from-transparent from-5% via-border via-95% to-transparent" />
					</div>
					<div className="flex flex-col gap-y-3 items-center justify-center">
						<h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
							Check out my latest work
						</h2>
						<p className="text-muted-foreground md:text-lg/relaxed lg:text-base/relaxed xl:text-lg/relaxed text-balance text-center">
							I&apos;ve worked on a variety of projects, from simple websites to
							complex web applications. Here are a few of my favorites.
						</p>
					</div>
				</div>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-200 mx-auto auto-rows-fr">
					{visibleProjects.map((project, id) => (
						<BlurFade
							key={project.title}
							delay={BLUR_FADE_DELAY * 12 + id * 0.03}
							className="h-full"
						>
							<ProjectCard
								href={project.href}
								key={project.title}
								title={project.title}
								description={project.description}
								dates={project.dates}
								tags={project.technologies}
								image={project.image}
								video={project.video}
								links={project.links}
							/>
						</BlurFade>
					))}
				</div>
				{hasMore && (
					<BlurFade delay={BLUR_FADE_DELAY * 12 + visibleCount * 0.001}>
						<div className="flex justify-center">
							<Button
								onClick={handleViewMore}
								variant={"default"}
								className="cursor-pointer"
							>
								View More
								<ChevronDown className="size-4 transition-transform group-hover:translate-y-0.5" />
							</Button>
						</div>
					</BlurFade>
				)}
			</div>
		</section>
	);
}
