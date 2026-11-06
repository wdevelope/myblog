import { MetadataRoute } from "next";
import { getPublicPosts } from "@/lib/server/publicPosts";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 86400; // REVALIDATE_PERIOD

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = SITE_URL;

    // Fetch all public blog posts
    const { data: blogPosts } = await getPublicPosts({
        type: "blog",
        limit: 1000,
    });

    const blogs = blogPosts.map((post) => ({
        url: `${baseUrl}/article/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
    }));

    const routes = ["", "/article", "/feed", "/guestbook"].map((route) => ({
        url: `${baseUrl}${route}`,
        changeFrequency: "daily" as const,
        priority: 1,
    }));

    return [...routes, ...blogs];
}
