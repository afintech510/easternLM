import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { mdxComponents } from "@/components/blog/mdx-components";
import { Button } from "@/components/ui/button";
import { getAllBlogPosts, getBlogPostBySlug, getRelatedPosts } from "@/lib/data/blog";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getAllBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Blog Article",
    };
  }

  return {
    title: `${post.title} | EasternLM Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const [post, posts] = await Promise.all([getBlogPostBySlug(slug), getAllBlogPosts()]);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(slug, posts, 3);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1fr_280px] md:py-16">
      <article className="space-y-5 rounded-2xl border bg-card p-6">
        <Link href="/blog" className="text-sm font-semibold text-primary hover:underline">
          Back to Blog
        </Link>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary">{post.title}</h1>
        <p className="text-sm text-muted-foreground">{new Date(post.date).toLocaleDateString()}</p>
        <p className="text-base text-muted-foreground">{post.description}</p>

        {post.coverImage ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
            <Image src={post.coverImage} alt={post.title} fill className="object-cover" sizes="100vw" />
          </div>
        ) : null}

        <div className="prose prose-slate max-w-none">
          <MDXRemote
            source={post.content}
            components={mdxComponents}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
              },
            }}
          />
        </div>
      </article>

      <aside className="space-y-4">
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Table Of Contents
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {post.toc.length > 0 ? (
              post.toc.map((entry) => (
                <li key={entry.id} className={entry.level === 3 ? "pl-3" : ""}>
                  <a href={`#${entry.id}`} className="text-muted-foreground hover:text-primary hover:underline">
                    {entry.text}
                  </a>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">No headings found.</li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Related Posts
          </h2>
          <div className="mt-3 space-y-3">
            {relatedPosts.map((related) => (
              <Link
                key={related.slug}
                href={`/blog/${related.slug}`}
                className="block rounded-xl border bg-background p-3 text-sm hover:border-primary/35"
              >
                <p className="font-semibold">{related.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{related.description}</p>
              </Link>
            ))}
          </div>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/blog/materials-guide">Materials Guide Hub</Link>
          </Button>
        </section>
      </aside>
    </div>
  );
}
