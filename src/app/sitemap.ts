import { DATA } from "@/data/resume";
import { allPosts } from "content-collections";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = DATA.url;

	const blogPosts: MetadataRoute.Sitemap = allPosts.map((post) => {
		const slug = post._meta.path.replace(/\.mdx$/, "");
		return {
			url: `${baseUrl}/blog/${slug}`,
			lastModified: new Date(post.updatedAt ?? post.publishedAt),
			changeFrequency: "monthly",
			priority: 0.6,
		};
	});

	return [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1.0,
		},
		{
			url: `${baseUrl}/blog`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.8,
		},
		...blogPosts,
	];
}
