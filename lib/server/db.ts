import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Comment, Post, PostType, Visibility } from "@/lib/types";

type DbShape = {
  posts: Post[];
  comments: Comment[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

async function ensureDbFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    const initial: DbShape = { posts: [], comments: [] };
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readDb(): Promise<DbShape> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as DbShape;
}

async function writeDb(next: DbShape) {
  await ensureDbFile();
  await fs.writeFile(DB_PATH, JSON.stringify(next, null, 2), "utf8");
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

export async function listPosts(params: {
  type: PostType;
  category?: string;
  includePrivate: boolean;
}): Promise<Post[]> {
  const db = await readDb();
  return db.posts
    .filter((post) => post.type === params.type)
    .filter((post) =>
      params.category ? post.categorySlug === params.category : true,
    )
    .filter((post) => (params.includePrivate ? true : post.visibility === "public"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPostBySlug(params: {
  slug: string;
}): Promise<Post | null> {
  const db = await readDb();
  return db.posts.find((post) => post.slug === params.slug) ?? null;
}

export async function getPostById(params: { id: string }): Promise<Post | null> {
  const db = await readDb();
  return db.posts.find((post) => post.id === params.id) ?? null;
}

export async function upsertPost(input: {
  id?: string;
  slug?: string;
  type: PostType;
  visibility: Visibility;
  title: string;
  content: string;
  categorySlug?: string | null;
  imageKeys?: string[];
}): Promise<Post> {
  const db = await readDb();
  const timestamp = nowIso();

  const baseSlug = input.slug?.trim() || slugify(input.title) || "post";
  let slug = baseSlug;
  const isSlugTakenByOther = (candidate: string) =>
    db.posts.some((p) => p.slug === candidate && p.id !== input.id);
  while (isSlugTakenByOther(slug)) {
    slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
  }

  const id = input.id ?? randomUUID();
  const existingIndex = db.posts.findIndex((post) => post.id === id);

  const next: Post = {
    id,
    slug,
    type: input.type,
    visibility: input.visibility,
    title: input.title,
    content: input.content,
    categorySlug: input.categorySlug ?? null,
    imageKeys: input.imageKeys ?? [],
    createdAt:
      existingIndex >= 0 ? db.posts[existingIndex]!.createdAt : timestamp,
    updatedAt: timestamp,
  };

  const nextDb: DbShape =
    existingIndex >= 0
      ? {
          ...db,
          posts: db.posts.map((post) => (post.id === id ? next : post)),
        }
      : { ...db, posts: [next, ...db.posts] };

  await writeDb(nextDb);
  return next;
}

export async function listComments(params: {
  postId: string;
}): Promise<Comment[]> {
  const db = await readDb();
  return db.comments
    .filter((c) => c.postId === params.postId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addComment(input: {
  postId: string;
  content: string;
}): Promise<Comment> {
  const db = await readDb();
  const comment: Comment = {
    id: randomUUID(),
    postId: input.postId,
    content: input.content,
    createdAt: nowIso(),
  };
  await writeDb({ ...db, comments: [...db.comments, comment] });
  return comment;
}
