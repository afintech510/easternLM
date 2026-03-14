"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop";

type ProductImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function ProductImage({
  src,
  alt,
  width,
  height,
  className,
  priority,
  sizes,
}: ProductImageProps) {
  const [imgSrc, setImgSrc] = useState(src || FALLBACK_IMAGE);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes}
      onError={() => setImgSrc(FALLBACK_IMAGE)}
    />
  );
}
