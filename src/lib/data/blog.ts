import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export type BlogFrontmatter = {
  title: string;
  description: string;
  date: string;
  tags: string[];
  coverImage?: string;
};

export type BlogPostSummary = BlogFrontmatter & {
  slug: string;
};

export type BlogPost = BlogPostSummary & {
  content: string;
  toc: Array<{ id: string; text: string; level: 2 | 3 }>;
};

const blogContentDir = path.join(process.cwd(), "content", "blog");

function slugifyHeading(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseTocFromMdx(content: string): Array<{ id: string; text: string; level: 2 | 3 }> {
  const entries: Array<{ id: string; text: string; level: 2 | 3 }> = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
    const match = line.match(/^(##|###)\s+(.+)$/);
    if (!match) {
      return;
    }

    const level = match[1] === "##" ? 2 : 3;
    const text = match[2].trim();

    if (!text) {
      return;
    }

    entries.push({
      id: slugifyHeading(text),
      text,
      level,
    });
  });

  return entries;
}

async function readBlogFilenames() {
  try {
    const files = await fs.readdir(blogContentDir);
    return files.filter((file) => file.endsWith(".mdx"));
  } catch {
    return [] as string[];
  }
}

function parseFrontmatter(raw: string, slug: string) {
  const parsed = matter(raw);
  const data = parsed.data as Partial<BlogFrontmatter>;

  const title = data.title?.trim() || slug;
  const description = data.description?.trim() || "";
  const date = data.date?.trim() || "1970-01-01";
  const tags = Array.isArray(data.tags) ? data.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
  const coverImage = typeof data.coverImage === "string" ? data.coverImage.trim() : undefined;

  return {
    frontmatter: {
      title,
      description,
      date,
      tags,
      coverImage,
    } satisfies BlogFrontmatter,
    content: parsed.content,
  };
}

export async function getAllBlogPosts(): Promise<BlogPostSummary[]> {
  const files = await readBlogFilenames();
  const posts = await Promise.all(
    files.map(async (filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      const raw = await fs.readFile(path.join(blogContentDir, filename), "utf8");
      const parsed = parseFrontmatter(raw, slug);

      return {
        slug,
        ...parsed.frontmatter,
      } satisfies BlogPostSummary;
    }),
  );

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const filename = `${slug}.mdx`;

  try {
    const raw = await fs.readFile(path.join(blogContentDir, filename), "utf8");
    const parsed = parseFrontmatter(raw, slug);

    return {
      slug,
      ...parsed.frontmatter,
      content: parsed.content,
      toc: parseTocFromMdx(parsed.content),
    } satisfies BlogPost;
  } catch {
    return null;
  }
}

export function getRelatedPosts(currentSlug: string, posts: BlogPostSummary[], limit = 3) {
  const current = posts.find((post) => post.slug === currentSlug);
  if (!current) {
    return posts.filter((post) => post.slug !== currentSlug).slice(0, limit);
  }

  const related = posts
    .filter((post) => post.slug !== currentSlug)
    .map((post) => {
      const overlap = post.tags.filter((tag) => current.tags.includes(tag)).length;
      return {
        post,
        overlap,
      };
    })
    .sort((a, b) => {
      if (a.overlap !== b.overlap) {
        return b.overlap - a.overlap;
      }

      return a.post.date < b.post.date ? 1 : -1;
    })
    .slice(0, limit)
    .map((entry) => entry.post);

  return related;
}
