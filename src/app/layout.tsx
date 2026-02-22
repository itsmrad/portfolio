import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DATA } from "@/data/resume";
import { cn } from "@/lib/utils";
import "./globals.css";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-sans",
	weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	metadataBase: new URL(DATA.url),
	title: {
		default:
			"Anupam Das — Full Stack Developer | React, Next.js, TypeScript, Node.js",
		template: "%s | Anupam Das — Full Stack Developer",
	},
	description:
		"Anupam Das is a Full Stack Developer and Software Engineer from New Delhi, India. Specializing in React, Next.js, TypeScript, Node.js, Python, PostgreSQL, Docker, and Kubernetes. Building scalable web applications and distributed systems.",
	keywords: [
		"Anupam Das",
		"Anupam Das developer",
		"Anupam Das portfolio",
		"Anupam Das software engineer",
		"itsmrad",
		"full stack developer",
		"full stack developer India",
		"full stack developer New Delhi",
		"software engineer India",
		...DATA.skills.map((skill) => skill.name),
		...DATA.skills.map((skill) => `${skill.name} developer`),
		...DATA.work.map((work) => work.company),
		...DATA.education.map((edu) => edu.school),
		"frontend developer",
		"backend developer",
		"MERN stack developer",
		"Solana developer",
		"blockchain developer",
		"hackathon developer India",
		"React Native developer",
		"systems engineer",
		"distributed systems",
	],
	authors: [{ name: "Anupam Das", url: DATA.url }],
	creator: "Anupam Das",
	publisher: "Anupam Das",
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	alternates: {
		canonical: DATA.url,
	},
	openGraph: {
		title: "Anupam Das — Full Stack Developer & Software Engineer",
		description:
			"Full Stack Developer specializing in React, Next.js, TypeScript, Node.js, and distributed systems. Based in New Delhi, India.",
		url: DATA.url,
		siteName: "Anupam Das — Portfolio",
		images: [
			{
				url: DATA.avatarUrl,
				width: 800,
				height: 800,
				alt: "Anupam Das - Full Stack Developer",
			},
		],
		locale: "en_US",
		type: "profile",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	twitter: {
		title: "Anupam Das — Full Stack Developer & Software Engineer",
		card: "summary_large_image",
		description:
			"Full Stack Developer specializing in React, Next.js, TypeScript, Node.js. Building scalable web apps and distributed systems.",
		creator: "@anupamio",
		images: [DATA.avatarUrl],
	},
	verification: {
		google: "add-your-google-site-verification-here", // REPLACE THIS
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning>
			<body
				className={cn(
					"min-h-screen bg-background font-sans antialiased relative",
					geist.variable,
					geistMono.variable,
				)}>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark">
					<TooltipProvider delayDuration={0}>
						<div className="absolute inset-0 top-0 left-0 right-0 h-25 overflow-hidden z-0">
							<FlickeringGrid
								className="h-full w-full"
								squareSize={2}
								gridGap={2}
								style={{
									maskImage: "linear-gradient(to bottom, black, transparent)",
									WebkitMaskImage:
										"linear-gradient(to bottom, black, transparent)",
								}}
							/>
						</div>
						<div className="relative z-10 max-w-2xl mx-auto py-12 pb-24 sm:py-24 px-6">
							{children}
						</div>
						<Navbar />
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
