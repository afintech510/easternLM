import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllBlogPosts } from "@/lib/data/blog";

export const metadata: Metadata = {
  title: "Blog | Eastern Landscape & Mason Supply",
  description: "Materials guides, driveway tips, and local project planning articles for Suffolk County.",
  openGraph: {
    title: "Blog | Eastern Landscape & Mason Supply",
    description: "Materials guides, driveway tips, and local project planning articles for Suffolk County.",
    type: "website",
  },
};

export default async function BlogPage() {
  const posts = await getAllBlogPosts();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 md:py-16">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Blog</p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
          Materials Guides And Project Planning Notes
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Practical reference content for ordering, estimating, and scheduling material deliveries.
        </p>
      </section>

      <section className="rounded-2xl border bg-primary/10 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary/80">Featured Hub</p>
        <h2 className="mt-2 text-2xl font-semibold text-primary">Materials Guide</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Jump to calculator workflows, recommended products, and planning checklists.
        </p>
        <Button asChild className="mt-4">
          <Link href="/blog/materials-guide">Open Materials Guide</Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <article key={post.slug} className="rounded-2xl border bg-card p-4">
            <div className="relative mb-3 aspect-[16/10] w-full overflow-hidden rounded-xl">
              <Image
                src={post.coverImage ?? "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&h=800&fit=crop"}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
            <p className="text-xs text-muted-foreground">{new Date(post.date).toLocaleDateString()}</p>
            <h3 className="mt-1 text-lg font-semibold">{post.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{post.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={`${post.slug}-${tag}`} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href={`/blog/${post.slug}`}>Read Article</Link>
            </Button>
          </article>
        ))}
      </section>
    </div>
  );
}
