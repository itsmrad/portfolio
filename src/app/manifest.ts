import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Anupam Das — Full Stack Developer",
		short_name: "Anupam Das",
		description:
			"Portfolio of Anupam Das — Full Stack Developer specializing in React, Next.js, TypeScript, and Node.js. Based in New Delhi, India.",
		start_url: "/",
		display: "standalone",
		background_color: "#000000",
		theme_color: "#000000",
		icons: [
			{
				src: "/favicon.ico",
				sizes: "any",
				type: "image/x-icon",
			},
		],
	};
}
