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
		{
			title: "Syuniqe's Official Website",
			href: "https://syuniqe.com",
			dates: "Jun 2025 - Jul 2025",
			active: true,
			description:
				"Designed and developed the official company website during my internship, leveraging Next.js for a performant, SEO-optimized architecture. Implemented complex, high-fidelity animations and interactive UI components using Framer Motion to create an engaging user experience, while seamlessly integrating backend services like Clerk and SMTP with Zoho for functionality.",
			technologies: [
				"Next.js",
				"Clerk",
				"SMTP",
				"Zoho",
				"TypeScript",
				"Tailwind CSS",
				"ShadCN UI",
				"Framer Motion",
				"Vercel",
			],
			links: [
				{
					type: "Website",
					href: "https://syuniqe.com",
					icon: <Icons.globe className="size-3" />,
				},
			],
			image:
				"https://www.syuniqe.com/_next/image?url=%2Fimages%2Fpowerhub-transparent.png&w=828&q=75",
			video: "",
		},
    {
      title: "AirBnb Clone",
      href: "https://airbnb-6m7n.onrender.com",
      dates: "Apr 2025 - May 2025",
      active: true,
      description:
        "Developed a full-stack Airbnb clone with React and Vite, featuring property listings, user authentication, and booking management. Built with a modern tech stack including React Router for navigation, Axios for API integration, and Tailwind CSS for responsive design, delivering a seamless rental marketplace experience.",
      technologies: [
        "React",
        "Vite",
        "React Router",
        "Axios",
        "Tailwind CSS",
        "JavaScript",
      ],
      links: [
        {
          type: "Website",
          href: "https://airbnb-6m7n.onrender.com",
          icon: <Icons.globe className="size-3" />,
        },
        {
          type: "Source",
          href: "https://github.com/itsmrad/AirBnb-Clone",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image:
        "https://miro.medium.com/v2/resize:fit:1400/format:webp/1*EeUSITAmhPij7jNFHaltJw.jpeg",
      video: "",
    },
    {
      title: "Rewaste",
      href: "https://rewaste.netlify.app",
      dates: "Aug 2024",
      active: true,
      description:
        "Built a sustainable marketplace platform using Next.js and Cosmic CMS for managing user-generated content. Integrated Stripe payment infrastructure for seamless one-time and subscription payments, delivering a fully functional e-commerce solution with dark mode support.",
      technologies: [
        "Next.js",
        "React",
        "Cosmic CMS",
        "Stripe",
        "JavaScript",
        "Sass",
        "React Hot Toast",
      ],
      links: [
        {
          type: "Website",
          href: "https://rewaste.netlify.app/",
          icon: <Icons.globe className="size-3" />,
        },
        {
          type: "Source",
          href: "https://github.com/itsmrad/rewaste",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "https://rewaste.netlify.app/_next/image?url=https%3A%2F%2Fimgix.cosmicjs.com%2F8aed2060-d92b-11ec-bb19-d9085ce408df-figures.png&w=3840&q=60",
      video: "",
    },
    {
      title: "React Todo List",
      href: "https://react-todo-list-itsmrad.netlify.app/",
      dates: "Feb 2026 - ongoing", // Based on current date
      active: true,
      description:
        "Built a dynamic task management application using React, featuring an intuitive interface for creating, organizing, and tracking todos. Implemented modern React patterns with component-based architecture for a responsive and efficient user experience.",
      technologies: [
        "React",
        "JavaScript",
        "HTML",
        "CSS",
      ],
      links: [
        {
          type: "Website",
          href: "https://react-todo-list-itsmrad.netlify.app/",
          icon: <Icons.globe className="size-3" />,
        },
        {
          type: "Source",
          href: "https://github.com/itsmrad/react-todo-list",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "https://assets.toptal.io/images?url=https%3A%2F%2Fbs-uploads.toptal.io%2Fblackfish-uploads%2Fcomponents%2Fblog_post_page%2F5992673%2Fcover_image%2Fregular_1708x683%2F1005_Design-Patterns-in-React_Cover-e8070fe5cfb7016ec4a511be35a69cbd.png", // You'll need to add your own image URL
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
			title: "HackHound 3.0",
			dates: "Feb 27th - 28th, 2025",
			location: "Modinagar, Uttar Pradesh",
			description:
				"Developed Zenden, a real-time collaborative productivity platform featuring AI-powered rich-text editing and visual diagramming. Built with Next.js, Convex, and Kinde Auth to deliver seamless team synchronization and a modern, secure user experience.",
			image:
				"https://hackhound2k25.devfolio.co/_next/image?url=https%3A%2F%2Fassets.devfolio.co%2Fhackathons%2Fdbc36efa2d1e4d53ac84ebe25c9ebef5%2Fassets%2Ffavicon%2F241.png&w=1440&q=75",
			win: "became in top 10",
			links: [
				{
					title: "Source",
					icon: <Icons.github className="h-4 w-4" />,
					href: "https://github.com/itsmrad/zenden",
				},
				{
					title: "Post",
					icon: <Icons.globe className="h-4 w-4" />,
					href: "https://www.linkedin.com/posts/itsmrad_hackathons-tech-digitalnomadjourney-activity-7327719907633102849-nZBP?utm_source=share&utm_medium=member_desktop&rcm=ACoAADmhk2AB0nBDB3FsITyn4CDVq3egSJLnMAU",
				},
			],
		},
		{
			title: "HackWiE 3.0",
			dates: "Jan 29th - 31th, 2025",
			location: "New Delhi, Delhi",
			description:
				"Built Rewaste, a full-stack waste management platform using Next.js and Cosmic Headless CMS for dynamic content. Integrated Stripe for secure payments and optimized performance with SSR, delivering a scalable, responsive user experience.",
			image: "https://www.msit.in/static/img/msit.png",
			win: "became in top 10",
			links: [
				{
					title: "Source",
					icon: <Icons.github className="h-4 w-4" />,
					href: "https://github.com/itsmrad/rewaste",
				},
				{
					title: "Website",
					icon: <Icons.globe className="h-4 w-4" />,
					href: "https://rewaste.netlify.app/",
				},
			],
		},
		{
			title: "Avensis’25 HackFormers",
			dates: "Jan 29th - 30th, 2025",
			location: "New Delhi, Delhi",
			description:
			  "Built Rewaste, a full-stack waste management platform using Next.js and Cosmic Headless CMS for dynamic content. Integrated Stripe for secure payments and optimized performance with SSR, delivering a scalable, responsive user experience.",
			image:
				"https://content.reskilll.com/WhatsApp%20Image%202025-01-24%20at%204eqGVMMC.40",
			win: "Participant",
			links: [
				{
					title: "Source",
					icon: <Icons.github className="h-4 w-4" />,
					href: "https://github.com/itsmrad/rewaste",
				},
				{
					title: "Website",
					icon: <Icons.globe className="h-4 w-4" />,
					href: "https://rewaste.netlify.app/",
				},
			],
		},
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
