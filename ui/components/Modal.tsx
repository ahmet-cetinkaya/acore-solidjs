import { createSignal, Show, type JSX } from "solid-js";
import { mergeCls } from "~/core/acore-ts/ui/ClassHelpers";
import DragHelper from "~/core/acore-ts/ui/DragHelper";
import type { Offset } from "~/core/acore-ts/ui/models/Offset";
import Position from "~/core/acore-ts/ui/models/Position";
import type Size from "~/core/acore-ts/ui/models/Size";
import ResizeHelper from "~/core/acore-ts/ui/ResizeHelper";
import IconSvgs from "../constants/IconSvgs";
import SvgIcon from "./SvgIcon";

type IconComponent = (props: { icon: string; class?: string }) => JSX.Element;
type ButtonComponent = (props: { onClick?: () => void; ariaLabel?: string; children?: JSX.Element }) => JSX.Element;

type Props = {
  children: JSX.Element;
  class?: string;
  customHeaderButtons?: JSX.Element;
  dragOffset?: Offset;
  headerClass?: string;
  isMaximized?: boolean;
  maximizable?: boolean;
  maximizeOffset?: Offset;
  onClick?: () => void;
  onClose?: () => void;
  onDragEnd?: (event: MouseEvent, position: Position) => void;
  onDragStart?: (event: MouseEvent, position: Position) => void;
  onResize?: (event: Event, size: Size) => void;
  onResizeEnd?: (event: Event, size: Size, position: Position) => void;
  onResizeStart?: (event: Event, size: Size, position: Position) => void;
  onToggleMaximize?: (isMaximized: boolean) => void;
  position?: Position;
  size?: Size;
  style?: JSX.CSSProperties;
  title?: string;
  // Component dependencies
  IconComponent?: IconComponent;
  customButton?: ButtonComponent;
  // Icon identifiers
  closeIcon?: string;
  maximizeIcon?: string;
  // Translations
  maximizeAriaLabel?: string;
  closeAriaLabel?: string;
};

/**
 * A modal component that can be dragged, resized, and maximized.
 *
 * @param props - The component properties.
 * @param props.children - The content of the modal.
 * @param props.class - The class name for the modal container.
 * @param props.customHeaderButtons - The custom header buttons.
 * @param props.dragOffset - The offset for dragging the modal.
 * @param props.headerClass - The class name for the header.
 * @param props.isMaximized - Whether the modal is maximized.
 * @param props.maximizable - Whether the modal can be maximized.
 * @param props.maximizeOffset - The offset for maximizing the modal.
 * @param props.onClick - The click event handler for the modal.
 * @param props.onClose - The close event handler for the modal.
 * @param props.onDragEnd - The drag end event handler.
 * @param props.onDragStart - The drag start event handler.
 * @param props.onResize - The resize event handler.
 * @param props.onResizeEnd - The resize end event handler.
 * @param props.onResizeStart - The resize start event handler.
 * @param props.onToggleMaximize - The event handler for toggling maximize state.
 * @param props.position - The position of the modal.
 * @param props.size - The size of the modal.
 * @param props.style - The style properties for the modal.
 * @param props.title - The title of the modal.
 * @param props.IconComponent - The icon component.
 * @param props.ButtonComponent - The button component.
 * @param props.closeIcon - The icon identifier for the close button.
 * @param props.maximizeIcon - The icon identifier for the maximize button.
 * @param props.maximizeAriaLabel - The aria label for the maximize button.
 * @param props.closeAriaLabel - The aria label for the close button.
 */
export default function Modal(props: Props) {
  const maximizable = props.maximizable ?? true;

  const [isModalOpen, setIsModalOpen] = createSignal(true);
  const [isMaximized, setIsMaximized] = createSignal(props.isMaximized ?? false);

  function onContainerMount(element: HTMLElement) {
    DragHelper.makeDraggableElement(element, {
      onDragStart,
      onDragEnd,
      offset: props.dragOffset,
    });

    ResizeHelper.makeResizableElement(element, {
      onResizeStart: (event, size) => {
        props.onResizeStart?.(event, size, new Position(element.offsetTop, element.offsetLeft));
      },
      onResizeEnd: (event, size) => {
        props.onResizeEnd?.(event, size, new Position(element.offsetTop, element.offsetLeft));
      },
    });
  }

  function toggleModal() {
    setIsModalOpen(!isModalOpen());
    props.onClose?.();
  }

  function toggleMaximize() {
    if (!maximizable) return;

    const nextIsMaximizedValue: boolean = !isMaximized();
    setIsMaximized(nextIsMaximizedValue);
    props.onToggleMaximize?.(nextIsMaximizedValue);
  }

  function onClick(event: MouseEvent) {
    if (isHeaderButton(event.target as HTMLElement)) return;

    props.onClick?.();
  }

  function onDragStart(event: MouseEvent, position: Position) {
    props.onDragStart?.(event, position);
  }

  function onDragEnd(event: MouseEvent, position: Position) {
    props.onDragEnd?.(event, position);
  }

  function isHeaderButton(targetElement: HTMLElement) {
    return targetElement.closest(".ac-header-buttons");
  }

  return (
    <Show when={isModalOpen()}>
      <div
        ref={onContainerMount}
        onClick={onClick}
        class={mergeCls(
          "shadow-md bg-whitez fixed min-h-52 min-w-60 transform overflow-hidden rounded-lg border border-gray-300",
          props.class,
        )}
        style={{
          ...props.style,
          top:
            (isMaximized() ?? maximizable)
              ? `${0 + (props.maximizeOffset?.top ?? 0)}px`
              : props.position?.top
                ? props.position.top + "px"
                : "15%",
          left:
            (isMaximized() ?? maximizable)
              ? `${0 + (props.maximizeOffset?.left ?? 0)}px`
              : props.position?.left
                ? props.position.left + "px"
                : "15%",
          right: (isMaximized() ?? maximizable) ? `${0 + (props.maximizeOffset?.right ?? 0)}px` : undefined,
          bottom: (isMaximized() ?? maximizable) ? `${0 + (props.maximizeOffset?.bottom ?? 0)}px` : undefined,
          width:
            (isMaximized() ?? maximizable)
              ? "calc(100vw - " +
                (props.maximizeOffset?.left ?? 0) +
                "px - " +
                (props.maximizeOffset?.right ?? 0) +
                "px)"
              : props.size?.width
                ? props.size.width + "px"
                : "70vw",
          height:
            (isMaximized() ?? maximizable)
              ? "calc(100vh - " +
                (props.maximizeOffset?.top ?? 0) +
                "px - " +
                (props.maximizeOffset?.bottom ?? 0) +
                "px)"
              : props.size?.height
                ? props.size.height + "px"
                : "70vh",
        }}
      >
        <header class={mergeCls("flex items-center justify-between gap-2 p-2", props.headerClass)}>
          <h2 class="m-0 text-xl font-semibold">{props.title}</h2>

          <div class="ac-header-buttons flex cursor-pointer items-center justify-between gap-1">
            {props.customHeaderButtons}

            <Show
              when={props.customButton}
              fallback={
                <button
                  onClick={toggleMaximize}
                  class="rounded p-1 text-gray-500 hover:bg-gray-100 transition-colors duration-200 ease-in-out"
                  aria-label={props.maximizeAriaLabel}
                >
                  <SvgIcon svg={IconSvgs.maximize} class="size-4" alt="Maximize icon" />
                </button>
              }
            >
              {props.customButton && (
                <props.customButton onClick={toggleMaximize} ariaLabel={props.closeAriaLabel}>
                  <Show
                    when={props.IconComponent}
                    fallback={<SvgIcon svg={IconSvgs.maximize} class="size-4" alt="Maximize icon" />}
                  >
                    {props.IconComponent && <props.IconComponent icon={props.maximizeIcon!} class="size-4" />}
                  </Show>
                </props.customButton>
              )}
            </Show>

            <Show
              when={props.customButton}
              fallback={
                <button
                  onClick={toggleModal}
                  class="rounded p-1 text-gray-500 hover:bg-gray-100 transition-colors duration-200 ease-in-out"
                  aria-label={props.closeAriaLabel}
                >
                  <SvgIcon svg={IconSvgs.close} class="size-4" alt="Close icon" />
                </button>
              }
            >
              {props.customButton && (
                <props.customButton onClick={toggleModal} ariaLabel={props.closeAriaLabel}>
                  <Show
                    when={props.IconComponent}
                    fallback={<SvgIcon svg={IconSvgs.close} class="size-4" alt="Close icon" />}
                  >
                    {props.IconComponent && <props.IconComponent icon={props.closeIcon!} class="size-4" />}
                  </Show>
                </props.customButton>
              )}
            </Show>
          </div>
        </header>

        <main class="size-full overflow-hidden p-2 pb-16">{props.children}</main>
      </div>
    </Show>
  );
}
