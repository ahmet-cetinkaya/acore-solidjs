import { mergeCls } from "acore-ts/ui/ClassHelpers";
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";

export type LessViewContentStyles = {
  wrapper?: string;
  content?: string;
  gradientFade?: string;
  showMoreButton?: string;
};

type Props = {
  children: JSX.Element;
  heightLimit?: number;
  customButtonComponent?: (props: { onClick: () => void; children: JSX.Element }) => JSX.Element;
  showMoreLabel: string;
  styles?: LessViewContentStyles;
};

const DEFAULT_HEIGHT_LIMIT = 200;

/**
 * A component that shows a limited amount of content and expands when a button is clicked.
 *
 * @param props - The component properties.
 * @param props.children - The content to display.
 * @param props.containerClass - The class
 * @param props.heightLimit - The height limit of the content before it is truncated.
 * @param props.customButtonComponent - The custom button component.
 * @param props.showMoreLabel - The label for the show more button.
 */
export default function LessViewContent(props: Props) {
  const [expanded, setExpanded] = createSignal(false);
  const [contentHeight, setContentHeight] = createSignal(0);

  const isContentOverflowing = createMemo(() => {
    const limit = props.heightLimit || DEFAULT_HEIGHT_LIMIT;
    return contentHeight() > limit;
  });
  const maxHeightStyle = createMemo(() => ({
    "max-height": expanded() ? "none" : props.heightLimit ? `${props.heightLimit}px` : `${DEFAULT_HEIGHT_LIMIT}px`,
  }));

  let contentElement: HTMLDivElement | undefined;

  function onContentMount(el: HTMLDivElement) {
    contentElement = el;

    requestAnimationFrame(onWindowResize);
    window.addEventListener("resize", onWindowResize);
  }

  createEffect(() => {
    if (expanded()) setContentHeight(contentHeight());
  });

  onCleanup(() => {
    window.removeEventListener("resize", onWindowResize);
  });

  function onWindowResize() {
    if (contentElement) setContentHeight(contentElement.scrollHeight);
  }

  return (
    <div class={mergeCls("relative", props.styles?.wrapper)}>
      <div
        ref={onContentMount}
        class={mergeCls(
          "relative overflow-hidden transition-all duration-500 ease-in-out",
          {
            "max-h-full": expanded(),
          },
          props.styles?.content,
        )}
        style={maxHeightStyle()}
      >
        {props.children}

        <Show when={!expanded() && isContentOverflowing()}>
          <div
            class={mergeCls(
              "pointer-events-none absolute bottom-0 left-0 h-16 w-full bg-gradient-to-t from-white to-transparent",
              props.styles?.gradientFade,
            )}
          />
        </Show>
      </div>

      <Show when={!expanded() && isContentOverflowing()}>
        <Show
          when={props.customButtonComponent}
          fallback={
            <button
              onClick={() => setExpanded(true)}
              class={mergeCls("cursor-pointer py-2 text-sm", props.styles?.showMoreButton)}
            >
              {props.showMoreLabel}
            </button>
          }
        >
          {props.customButtonComponent && (
            <props.customButtonComponent onClick={() => setExpanded(true)}>
              {props.showMoreLabel}
            </props.customButtonComponent>
          )}
        </Show>
      </Show>
    </div>
  );
}
