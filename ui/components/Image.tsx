import type { JSX } from "solid-js/jsx-runtime";

interface ImgSource {
  media: string;
  srcset: string;
}

interface ImageNativeProps extends Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src: string;
  alt: string;
}

interface ImageCustomProps {
  sources?: ImgSource[];
  isExternal?: boolean;
}

type Props = ImageNativeProps & ImageCustomProps;

export default function Image(props: Props) {
  const {
    src,
    alt,
    isExternal,
    sources,
    loading = "lazy",
    decoding = "async",
    crossorigin = isExternal ? "anonymous" : undefined,
    referrerpolicy = isExternal ? "no-referrer" : undefined,
    ...imgProps
  } = props;

  const imgElement = (
    <img
      {...imgProps}
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      crossorigin={crossorigin}
      referrerpolicy={referrerpolicy}
    />
  );

  if (!sources?.length) return imgElement;

  return (
    <picture>
      {sources.map((source) => (
        <source media={source.media} srcset={source.srcset} />
      ))}
      {imgElement}
    </picture>
  );
}
