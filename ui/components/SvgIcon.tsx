import { mergeCls } from "@packages/acore-ts/ui/ClassHelpers";
import { createMemo } from "solid-js";

type Props = {
  svg: string;
  alt: string;
  isSpin?: boolean;
  onClick?: () => void;
  class?: string;
  fillColor?: string;
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
  const getFilledSvg = createMemo(() => {
    if (!props.svg) return "";
    return props.svg.replace(/fill=".*?"/g, `fill="${props.fillColor}"`);
  });

  const svgContent = createMemo(() => {
    if (!props.svg) {
      console.warn(`SvgIcon: svg prop is undefined for alt="${props.alt}"`);
      return ""; // Return empty SVG content as fallback
    }
    return props.fillColor ? getFilledSvg() : props.svg;
  });

  if (!props.svg) {
    return null; // Don't render anything if svg is undefined
  }

  return (
    <svg
      onClick={props.onClick}
      innerHTML={svgContent()}
      class={mergeCls("select-none", props.class, {
        "animate-spin": props.isSpin ?? false,
      })}
      style={{ fill: props.fillColor }}
      aria-label={props.alt}
    />
  );
}
