import { MetadataRoute } from "next";
import { getPublicPosts } from "@/lib/server/publicPosts";

export const revalidate = 86400; // REVALIDATE_PERIOD

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.w-life.store";

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

    const routes = ["", "/article", "/feed"].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 1,
    }));

    return [...routes, ...blogs];
}
