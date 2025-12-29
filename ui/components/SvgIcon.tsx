import { mergeCls } from "acore-ts/ui/ClassHelpers";
import { createMemo } from "solid-js";

type Props = {
  svg: string;
  alt: string;
  isSpin?: boolean;
  onClick?: () => void;
  class?: string;
  fillColor?: string;
  style?: any;
};

/**
 * A component that renders an SVG icon.
 *
 * @param props - The component properties.
 * @param props.svg - The SVG content to render.
 * @param props.alt - The alt text for the SVG.
 * @param props.isSpin - Whether the icon should spin.
 * @param props.onClick - The click event handler.
 * @param props.class - The class name for the SVG element.
 * @param props.fillColor - The fill color for the SVG.
 */
export default function SvgIcon(props: Props) {
  const processedSvg = createMemo(() => {
    if (!props.svg) {
      //eslint-disable-next-line no-console
      console.warn(`SvgIcon: svg prop is undefined for alt="${props.alt}"`);
      return "";
    }

    // Default to currentColor if no fillColor is provided
    const fill = props.fillColor || "currentColor";

    // 1. Remove hardcoded fills except "none"
    // 2. Ensure root <svg> has fill="currentColor" (or props.fillColor)
    let cleaned = props.svg.replace(/fill="(?!none).*?"/g, "");

    if (cleaned.startsWith("<svg")) {
      cleaned = cleaned.replace("<svg", `<svg fill="${fill}"`);
    }

    return cleaned;
  });

  if (!props.svg) {
    return null;
  }

  return (
    <svg
      onClick={props.onClick}
      innerHTML={processedSvg()}
      class={mergeCls("select-none", props.class, {
        "animate-spin": props.isSpin ?? false,
      })}
      style={props.style}
      aria-label={props.alt}
    />
  );
}
