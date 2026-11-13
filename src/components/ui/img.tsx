import { getImageProps, type ImageProps } from "next/image";

/**
 * next/image without its client runtime: the same optimised srcset (AVIF/WebP)
 * and intrinsic size from a static import, rendered as a plain <img>, so an
 * image costs no JavaScript. Images below the fold lazy-load by default; pass
 * `loading="eager"` only for one above the fold.
 */
export function Img({ alt, ...props }: ImageProps) {
  const { props: img } = getImageProps({ alt, ...props });
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...img} alt={alt} />;
}
