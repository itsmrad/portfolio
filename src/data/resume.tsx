import { HomeIcon, NotebookIcon } from "lucide-react";
import { Icons } from "@/components/icons";
import { Csharp } from "@/components/ui/svgs/csharp";
import { Docker } from "@/components/ui/svgs/docker";
import { Kubernetes } from "@/components/ui/svgs/kubernetes";
import { NextjsIconDark } from "@/components/ui/svgs/nextjsIconDark";
import { Nodejs } from "@/components/ui/svgs/nodejs";
import { Postgresql } from "@/components/ui/svgs/postgresql";
import { Python } from "@/components/ui/svgs/python";
import { ReactLight } from "@/components/ui/svgs/reactLight";
import { Typescript } from "@/components/ui/svgs/typescript";

export const DATA = {
	name: "Anupam Das",
	initials: "AD",
	url: "https://www.anupamdas.me",
	location: "New Delhi, India",
	locationLink: "https://www.google.com/maps/place/newdelhi",
	description:
		"Software Engineer turned Fullstack Developer. I love building things and helping people. Very active on Twitter.",
	summary: `I am an undergraduate Information Technology student with experience building and shipping full-stack systems and participating in multiple hackathons. I am deeply interested in how large-scale software systems work under the hood, particularly runtime behavior, observability, and distributed system failures. My goal is to become a systems-oriented engineer focused on designing, debugging, and scaling infrastructure-level systems.`,
	avatarUrl: "/anupam.png",
	skills: [
		{ name: "React", icon: ReactLight },
		{ name: "Next.js", icon: NextjsIconDark },
		{ name: "Typescript", icon: Typescript },
		{ name: "Node.js", icon: Nodejs },
		{ name: "Python", icon: Python },
		{ name: "Postgres", icon: Postgresql },
		{ name: "Docker", icon: Docker },
		{ name: "Kubernetes", icon: Kubernetes },
		{ name: "C++", icon: Csharp },
	],
	navbar: [
		{ href: "/", icon: HomeIcon, label: "Home" },
		{ href: "/blog", icon: NotebookIcon, label: "Blog" },
	],
	contact: {
		email: "itsmrad@gmail.com",
		tel: "+918617331096",
		social: {
			GitHub: {
				name: "GitHub",
				url: "https://github.com/itsmrad",
				icon: Icons.github,
				navbar: true,
			},

			LinkedIn: {
				name: "LinkedIn",
				url: "https://linkedin.com/in/itsmrad",
				icon: Icons.linkedin,

				navbar: true,
			},
			X: {
				name: "X",
				url: "https://x.com/anupamio",
				icon: Icons.x,

				navbar: true,
			},
			Youtube: {
				name: "Youtube",
				url: "https://youtube.com/@anupamio",
				icon: Icons.youtube,
				navbar: true,
			},
			email: {
				name: "Send Email",
				url: "#",
				icon: Icons.email,

				navbar: false,
			},
		},
	},

	work: [
		// {
		// 	company: "Pied Piper",
		// 	href: "https://piedpiper.com",
		// 	badges: [],
		// 	location: "Silicon Valley, CA",
		// 	title: "Chief Compression Officer",
		// 	logoUrl: "/piedpiper.png",
		// 	start: "Jan 2014",
		// 	end: "Jan 2015",
		// 	description:
		// 		"Developed a middle-out compression algorithm that achieves theoretical limit compression. Won TechCrunch Disrupt. Pivot to video chat app 'PiperChat'.",
		// },
		{
			company: "Syuniqe",
			href: "https://www.syuniqe.com/",
			badges: [],
			location: "Remote",
			title: "Full Stack Software Engineer",
			logoUrl:
				"https://www.syuniqe.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsyuniqe-blank-logo.cad740e9.png&w=256&q=75",
			start: "Jan 2014",
			end: "Jan 2015",
			description:
				"Developed a middle-out compression algorithm that achieves theoretical limit compression. Won TechCrunch Disrupt. Pivot to video chat app 'PiperChat'.",
		},
		{
			company: "Namespace",
			href: "https://www.namespace.world/",
			badges: [],
			location: "Remote",
			title: "Tech Team Member",
			logoUrl: {
				light: "https://www.namespace.world/Logo.png",
				dark: "https://www.namespace.world/Logo-dark.png",
			},
			start: "Jan 2014",
			end: "Jan 2015",
			description:
				"Developed a middle-out compression algorithm that achieves theoretical limit compression. Won TechCrunch Disrupt. Pivot to video chat app 'PiperChat'.",
		},
		{
			company: "SheBuilds",
			href: "https://www.shebuildsecosystem.com/",
			badges: [],
			location: "Remote",
			title: "Social Media Manager & Video Editor",
			logoUrl:
				"https://media.licdn.com/dms/image/v2/D560BAQE3_mF30h9q_w/company-logo_200_200/company-logo_200_200/0/1731229537037/shebuildshack_logo?e=1772064000&v=beta&t=ouRejFqfo041R3ADgNOvMm_5J_TRXMe43fSldXYhXW4",
			start: "Feb 2025",
			end: "Apr 2025",
			description:
				"Developed a middle-out compression algorithm that achieves theoretical limit compression. Won TechCrunch Disrupt. Pivot to video chat app 'PiperChat'.",
		},
	],
	education: [
		// {
		// 	school: "Hogwarts School of Witchcraft and Wizardry",
		// 	href: "https://hogwarts.edu",
		// 	degree: "Bachelor of Magic, Dark Arts",
		// 	logoUrl: "/hogwarts.png",
		// 	start: "1991",
		// 	end: "1998",
		// },
		{
			school: "100xdevs",
			href: "https://100xdevs.com/",
			degree: "WEB Dev + AI + WEB3 + DSA Bootcamp",
			logoUrl:
				"https://100xdevs.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fhero-img.3fed4f92.png&w=1080&q=75&dpl=dpl_AQvhGZJCxUZoe9CvbCS3xTKqTUDG",
			start: "2026",
			end: "ongoing",
		},
		{
			school: "Bhagwan Parshuram Institute Of Technology",
			href: "https://bpitindia.ac.in/",
			degree: "Bachelor of Technology, Information Technology",
			logoUrl:
				"https://bpitindia.ac.in/wp-content/uploads/2024/03/logo1-1-1.png",
			start: "2023",
			end: "2027",
		},
		{
			school: "Bankura Christian Collegiate School",
			href: "https://en.wikipedia.org/wiki/Bankura_Christian_Collegiate_School",
			degree: "Higher Secondary School",
			logoUrl:
				"https://upload.wikimedia.org/wikipedia/en/2/20/Bankura_Christian_Collegiate_School.jpg",
			start: "2020",
			end: "2022",
		},
		{
			school: "Bankura Christian Collegiate School",
			href: "https://en.wikipedia.org/wiki/Bankura_Christian_Collegiate_School",
			degree: "Secondary School",
			logoUrl:
				"https://upload.wikimedia.org/wikipedia/en/2/20/Bankura_Christian_Collegiate_School.jpg",
			start: "2015",
			end: "2020",
		},
	],
	projects: [
		// {
		// 	title: "Jarvis",
		// 	href: "https://jarvis.ai",
		// 	dates: "Jan 2010 - Feb 2010",
		// 	active: true,
		// 	description:
		// 		"Just a rather very intelligent system. [Based on Gpt](https://chat.openai.com) Controls the Iron Man suits and manages the Stark Industries hvac systems.",
		// 	technologies: [
		// 		"Artificial Intelligence",
		// 		"Holograms",
		// 		"Stark Arc Reactor",
		// 	],
		// 	links: [
		// 		{
		// 			type: "Website",
		// 			href: "https://jarvis.ai",
		// 			icon: <Icons.globe className="size-3" />,
		// 		},
		// 	],
		// 	image: "",
		// 	video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		// },
		{
			title: "Dash Wallet",
			href: "https://dash-wallet-beta.vercel.app/",
			dates: "Nov 2025 - ongoing",
			active: true,
			description:
				"Engineered a static, read-only Solana wallet generator that creates and imports deterministic addresses using public/private key pairs. Leveraged Next.js and Tailwind CSS to build a lightweight, performant interface for secure and seamless address visualization.",
			technologies: ["Next.js", "TypeScript", "Tailwind CSS", "ShadCN UI"],
			links: [
				{
					type: "Website",
					href: "https://dash-wallet-beta.vercel.app/",
					icon: <Icons.globe className="size-3" />,
				},
			],
			image:
				"https://tangem.com/_astro/Earn_More_with_the_New_Tangem_Validator_for_Solana_Staking_f9bee39fcc_ZBreS5.png",
			video: "",
		},
		{
			title: "Blogfolio",
			href: "https://blogfolio-five-liard.vercel.app",
			dates: "Nov 2025 - ongoing",
			active: true,
			description:
				"Architected a high-performance blog using Next.js 16 and Convex. Integrated Better Auth for security and optimized SEO via advanced caching and SSR, delivering a scalable, type-safe system with sub-second load times.",
			technologies: [
				"Next.js",
				"Convex",
				"Better Auth",
				"TypeScript",
				"Tailwind CSS",
				"ShadCN UI",
			],
			links: [
				{
					type: "Website",
					href: "https://blogfolio-five-liard.vercel.app/",
					icon: <Icons.globe className="size-3" />,
				},
			],
			image:
				"https://blogfolio-five-liard.vercel.app/_next/image?url=https%3A%2F%2Fsincere-okapi-500.convex.cloud%2Fapi%2Fstorage%2F28fcca2e-ab79-4b58-ad27-4e1173ec6253&w=3840&q=75",
			video: "",
		},
	],
	hackathons: [
		// {
		// 	title: "Give the title",
		// 	dates: "June 23rd - 25th, 2017",
		// 	location: "New Delhi, Delhi",
		// 	description:
		// 		"Developed somthing on a dataset called [Kaggle Dataset](https://www.kaggle.com/c/random-link)",
		// 	image:
		// 		"https://hackathon-image.jpg",
		// 	win: "1st Place Winner",
		// 	links: [
		// 		{
		// 			title: "Article",
		// 			icon: <Icons.globe className="h-4 w-4" />,
		// 			href: "https://hackathon-link.com",
		// 		},
		// 		{
		// 			title: "Source",
		// 			icon: <Icons.github className="h-4 w-4" />,
		// 			href: "https://github.com/itsmrad/",
		// 		},
		// 	],
		// },
		{
			title: "HackHazards",
			dates: "Mar 16th - 17th, 2024",
			location: "New Delhi, Delhi",
			description:
				"Developed a web application Codecommune for people to compete and test their coding skills in a gamified environment.",
			image:
				"https://hackhazards24.devfolio.co/_next/image?url=https%3A%2F%2Fassets.devfolio.co%2Fhackathons%2F8b70d6a0eb494eaaa463c4868a50a55a%2Fassets%2Ffavicon%2F445.png&w=1440&q=75",
			win: "Participant",
			links: [
				{
					title: "Post",
					icon: <Icons.globe className="h-4 w-4" />,
					href: "https://www.linkedin.com/posts/itsmrad_hackhazards24-innovationjourney-firsthackathon-activity-7181594987258691584-nW4s?utm_source=share&utm_medium=member_desktop&rcm=ACoAADmhk2AB0nBDB3FsITyn4CDVq3egSJLnMAU",
				},
				{
					title: "Source",
					icon: <Icons.github className="h-4 w-4" />,
					href: "https://github.com/itsmrad/codecommune",
				},
			],
		},
	],
} as const;
