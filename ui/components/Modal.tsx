import { mergeCls } from "acore-ts/ui/ClassHelpers";
import DragHelper from "acore-ts/ui/DragHelper";
import type { Offset } from "acore-ts/ui/models/Offset";
import Position from "acore-ts/ui/models/Position";
import type Size from "acore-ts/ui/models/Size";
import ResizeHelper from "acore-ts/ui/ResizeHelper";
import { createSignal, onCleanup, Show, type JSX } from "solid-js";
import IconSvgs from "../constants/IconSvgs";
import SvgIcon from "./SvgIcon";

type IconComponent = (props: { icon: string; class?: string }) => JSX.Element;
type ButtonComponent = (props: { onClick?: () => void; ariaLabel?: string; children?: JSX.Element }) => JSX.Element;

export type ModalStyles = {
  wrapper?: string;
  header?: string;
  title?: string;
  headerButtons?: string;
  maximizeButton?: string;
  closeButton?: string;
  icon?: string;
  content?: string;
};

type Props = {
  children: JSX.Element;
  customHeaderButtons?: JSX.Element;
  draggable?: boolean;
  dragOffset?: Offset;
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
  resizeOffset?: Offset;
  size?: Size;
  style?: JSX.CSSProperties;
  title?: string;
  styles?: ModalStyles;
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
 * @param props.customHeaderButtons - The custom header buttons.
 * @param props.dragOffset - The offset for dragging the modal.
 * @param props.draggable - Whether the modal is draggable.
 * @param props.isMaximized - Whether the modal is maximized.
 * @param props.maximizable - Whether the modal can be maximized.
 * @param props.maximizeOffset - The offset for maximizing the modal.
 * @param props.onClick - The callback when the modal is clicked.
 * @param props.onClose - The callback when the modal is closed.
 * @param props.onDragEnd - The callback when dragging ends.
 * @param props.onDragStart - The callback when dragging starts.
 * @param props.onResize - The callback when the modal is resized.
 * @param props.onResizeEnd - The callback when resizing ends.
 * @param props.onResizeStart - The callback when resizing starts.
 * @param props.onToggleMaximize - The callback when maximize is toggled.
 * @param props.position - The position of the modal.
 * @param props.size - The size of the modal.
 * @param props.style - The inline CSS styles for the modal container.
 * @param props.title - The title of the modal.
 * @param props.styles - The style overrides for modal elements.
 * @param props.IconComponent - The custom icon component.
 * @param props.customButton - The custom button component.
 * @param props.closeIcon - The icon identifier for the close button.
 * @param props.maximizeIcon - The icon identifier for the maximize button.
 * @param props.maximizeAriaLabel - The aria-label for the maximize button.
 * @param props.closeAriaLabel - The aria-label for the close button.
 */
export default function Modal(props: Props) {
  const draggable = props.draggable ?? true;
  const [isModalOpen, setIsModalOpen] = createSignal(true);
  const [isMaximized, setIsMaximized] = createSignal(props.isMaximized ?? false);

  function toggleModal() {
    setIsModalOpen(!isModalOpen());
    props.onClose?.();
  }

  function toggleMaximize() {
    const newMaximizedState = !isMaximized();
    setIsMaximized(newMaximizedState);
    props.onToggleMaximize?.(newMaximizedState);
  }

  function onDragStart(event: MouseEvent, position: Position) {
    props.onDragStart?.(event, position);
  }

  function onDragEnd(event: MouseEvent, position: Position) {
    props.onDragEnd?.(event, position);
  }

  function onHeaderDoubleClick() {
    if (props.maximizable) {
      toggleMaximize();
    }
  }

  function onContainerMount(element: HTMLDivElement) {
    if (draggable) {
      const disposeDrag = DragHelper.makeDraggableElement(element, {
        onDragStart,
        onDragEnd,
        offset: props.dragOffset,
      });
      if (typeof disposeDrag === "function") {
        onCleanup(disposeDrag);
      }
    }

    if (props.size || props.onResizeStart || props.onResizeEnd) {
      const disposeResize = ResizeHelper.makeResizableElement(element, {
        offset: props.resizeOffset,
        onResizeStart: (event, size) => {
          props.onResizeStart?.(event, size, new Position(element.offsetTop, element.offsetLeft));
        },
        onResizeEnd: (event, size) => {
          props.onResizeEnd?.(event, size, new Position(element.offsetTop, element.offsetLeft));
        },
      });
      if (typeof disposeResize === "function") {
        onCleanup(disposeResize);
      }
    }
  }

  return (
    <Show when={isModalOpen()}>
      <div
        ref={onContainerMount}
        onClick={props.onClick}
        class={mergeCls("fixed flex flex-col overflow-hidden rounded", props.styles?.wrapper)}
        style={{
          top:
            (isMaximized() ?? props.maximizable)
              ? `${0 + (props.maximizeOffset?.top ?? 0)}px`
              : typeof props.position?.top === "number"
                ? `${props.position.top}px`
                : "15%",
          left:
            (isMaximized() ?? props.maximizable)
              ? `${0 + (props.maximizeOffset?.left ?? 0)}px`
              : typeof props.position?.left === "number"
                ? `${props.position.left}px`
                : "15%",
          right: (isMaximized() ?? props.maximizable) ? `${0 + (props.maximizeOffset?.right ?? 0)}px` : undefined,
          bottom: (isMaximized() ?? props.maximizable) ? `${0 + (props.maximizeOffset?.bottom ?? 0)}px` : undefined,
          width:
            (isMaximized() ?? props.maximizable)
              ? `calc(100vw - ${props.maximizeOffset?.left ?? 0}px - ${props.maximizeOffset?.right ?? 0}px)`
              : props.size?.width
                ? `${props.size.width}px`
                : "70vw",
          height:
            (isMaximized() ?? props.maximizable)
              ? `calc(100svh - ${props.maximizeOffset?.top ?? 0}px - ${props.maximizeOffset?.bottom ?? 0}px)`
              : props.size?.height
                ? `${props.size.height}px`
                : "70svh",
          ...props.style,
        }}
      >
        <header class={mergeCls("flex gap-2 p-2", props.styles?.header)} onDblClick={onHeaderDoubleClick}>
          <h2 class={mergeCls("m-0", props.styles?.title)}>{props.title}</h2>

          <div class={mergeCls("ml-auto flex cursor-pointer items-center gap-1", props.styles?.headerButtons)}>
            {props.customHeaderButtons}

            <Show when={props.maximizable}>
              <Show
                when={props.customButton}
                fallback={
                  <button
                    onClick={toggleMaximize}
                    class={mergeCls("cursor-pointer rounded p-1", props.styles?.maximizeButton)}
                    aria-label={props.maximizeAriaLabel}
                  >
                    <SvgIcon
                      svg={IconSvgs.maximize}
                      styles={{ wrapper: mergeCls("select-none", props.styles?.icon) }}
                      alt="Maximize icon"
                    />
                  </button>
                }
              >
                {props.customButton && (
                  <props.customButton onClick={toggleMaximize} ariaLabel={props.maximizeAriaLabel}>
                    <Show
                      when={props.IconComponent}
                      fallback={
                        <SvgIcon
                          svg={IconSvgs.maximize}
                          styles={{ wrapper: mergeCls("select-none", props.styles?.icon) }}
                          alt="Maximize icon"
                        />
                      }
                    >
                      {props.IconComponent && (
                        <props.IconComponent
                          icon={props.maximizeIcon!}
                          class={mergeCls("select-none", props.styles?.icon)}
                        />
                      )}
                    </Show>
                  </props.customButton>
                )}
              </Show>
            </Show>

            <Show
              when={props.customButton}
              fallback={
                <button
                  onClick={toggleModal}
                  class={mergeCls("cursor-pointer rounded p-1", props.styles?.closeButton)}
                  aria-label={props.closeAriaLabel}
                >
                  <SvgIcon
                    svg={IconSvgs.close}
                    styles={{ wrapper: mergeCls("select-none", props.styles?.icon) }}
                    alt="Close icon"
                  />
                </button>
              }
            >
              {props.customButton && (
                <props.customButton onClick={toggleModal} ariaLabel={props.closeAriaLabel}>
                  <Show
                    when={props.IconComponent}
                    fallback={
                      <SvgIcon
                        svg={IconSvgs.close}
                        styles={{ wrapper: mergeCls("select-none", props.styles?.icon) }}
                        alt="Close icon"
                      />
                    }
                  >
                    {props.IconComponent && (
                      <props.IconComponent
                        icon={props.closeIcon!}
                        class={mergeCls("select-none", props.styles?.icon)}
                      />
                    )}
                  </Show>
                </props.customButton>
              )}
            </Show>
          </div>
        </header>

        <main class={mergeCls("flex-grow overflow-auto", props.styles?.content)}>{props.children}</main>
      </div>
    </Show>
  );
}
