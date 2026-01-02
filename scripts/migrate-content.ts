/**
 * Migration Script: Convert legacy HTML content to CKEditor-compatible format
 *
 * This script converts:
 * - Raw text with newlines -> <p> wrapped paragraphs
 * - <br> based line breaks -> <p> wrapped paragraphs
 *
 * Run with: npx tsx scripts/migrate-content.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Convert legacy content to proper paragraph structure
 */
function convertContent(content: string): string {
  if (!content || typeof content !== "string") return content;

  // If already wrapped in block elements, likely already migrated
  if (content.trim().startsWith("<p>") || content.trim().startsWith("<h")) {
    // Still normalize: replace <br><br> with </p><p>
    let normalized = content;

    // Replace multiple <br> tags (with optional whitespace) with paragraph breaks
    normalized = normalized.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "</p><p>");

    // Replace single <br> at end of <p> with nothing (cleanup)
    normalized = normalized.replace(/<br\s*\/?>\s*<\/p>/gi, "</p>");

    return normalized;
  }

  // Split by double newlines or <br><br> to find paragraph boundaries
  let paragraphs = content
    .split(/(?:<br\s*\/?>\s*<br\s*\/?>)|(?:\n\s*\n)/gi)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // If only one paragraph and no structure, wrap entire content
  if (paragraphs.length === 0) {
    paragraphs = [content.trim()];
  }

  // Wrap each paragraph in <p> tags, converting single <br> to actual line breaks within
  const result = paragraphs
    .map((p) => {
      // Replace single <br> with a space or keep as is inside paragraph
      const cleaned = p.replace(/<br\s*\/?>/gi, "<br>");
      return `<p>${cleaned}</p>`;
    })
    .join("\n");

  return result;
}

async function migrate() {
  console.log("🚀 Starting content migration...\n");

  // Fetch all posts
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, content")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching posts:", error);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log("No posts found.");
    return;
  }

  console.log(`Found ${posts.length} posts to process.\n`);

  let updated = 0;
  let skipped = 0;

  for (const post of posts) {
    const originalContent = post.content || "";
    const convertedContent = convertContent(originalContent);

    // Skip if no change
    if (originalContent === convertedContent) {
      skipped++;
      continue;
    }

    // Update the post
    const { error: updateError } = await supabase
      .from("posts")
      .update({ content: convertedContent })
      .eq("id", post.id);

    if (updateError) {
      console.error(
        `❌ Failed to update post "${post.title}":`,
        updateError.message
      );
    } else {
      console.log(`✅ Updated: ${post.title}`);
      updated++;
    }
  }

  console.log(`\n📊 Migration complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (no change): ${skipped}`);
}

migrate().catch(console.error);
