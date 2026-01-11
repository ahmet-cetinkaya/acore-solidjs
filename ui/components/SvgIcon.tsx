import { mergeCls } from "acore-ts/ui/ClassHelpers";
import { createMemo } from "solid-js";

type Props = {
  svg: string;
  alt: string;
  isSpin?: boolean;
  onClick?: () => void;
  class?: string;
  fillColor?: string;
  preserveFill?: boolean;
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
 * @param props.preserveFill - If true, preserves original SVG fill colors instead of replacing with currentColor.
 */
export default function SvgIcon(props: Props) {
  const processedSvg = createMemo(() => {
    if (!props.svg) {
      //eslint-disable-next-line no-console
      console.warn(`SvgIcon: svg prop is undefined for alt="${props.alt}"`);
      return "";
    }

    // If preserveFill is true, return the SVG as-is without modifying fills
    if (props.preserveFill) {
      return props.svg;
    }

    // If fillColor is provided, replace "currentColor" with the provided color
    // but preserve other hardcoded fills (like brand colors)
    if (props.fillColor) {
      let cleaned = props.svg.replace(/fill="currentColor"/g, `fill="${props.fillColor}"`);

      // Add fill to root svg if it doesn't have one
      if (!cleaned.match(/<svg[^>]*fill=/)) {
        cleaned = cleaned.replace("<svg", `<svg fill="${props.fillColor}"`);
      }

      return cleaned;
    }

    // Default behavior: Remove all hardcoded fills except "none" and use currentColor
    let cleaned = props.svg.replace(/fill="(?!none|currentColor).*?"/g, "");

    if (cleaned.startsWith("<svg")) {
      cleaned = cleaned.replace("<svg", `<svg fill="currentColor"`);
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
      role="img"
      aria-label={props.alt}
    />
  );
}
