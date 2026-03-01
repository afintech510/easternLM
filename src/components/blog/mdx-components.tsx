import Link from "next/link";
import type { ComponentProps } from "react";

export const mdxComponents = {
  h2: (props: ComponentProps<"h2">) => <h2 className="mt-10 text-2xl font-semibold text-primary" {...props} />,
  h3: (props: ComponentProps<"h3">) => <h3 className="mt-8 text-xl font-semibold" {...props} />,
  p: (props: ComponentProps<"p">) => <p className="mt-4 leading-7 text-muted-foreground" {...props} />,
  ul: (props: ComponentProps<"ul">) => <ul className="mt-4 list-disc space-y-2 pl-6" {...props} />,
  ol: (props: ComponentProps<"ol">) => <ol className="mt-4 list-decimal space-y-2 pl-6" {...props} />,
  li: (props: ComponentProps<"li">) => <li className="text-muted-foreground" {...props} />,
  code: (props: ComponentProps<"code">) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...props} />
  ),
  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote className="mt-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground" {...props} />
  ),
  a: (props: ComponentProps<"a">) => {
    const href = props.href ?? "#";
    return (
      <Link href={href} className="font-medium text-primary underline-offset-2 hover:underline">
        {props.children}
      </Link>
    );
  },
};
