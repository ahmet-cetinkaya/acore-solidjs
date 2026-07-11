import { mergeCls } from "acore-ts/ui/ClassHelpers";
import { createEffect, createSignal, Index, Show, type JSX } from "solid-js";

export type BaseDropdownItem = {
  text: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
  items?: BaseDropdownItem[];
};

export type DropdownStyles = {
  wrapper?: string;
  button?: string;
  menu?: string;
  menuContainer?: string;
  menuItem?: string;
  menuItemText?: string;
  categoryHeader?: string;
};

type Props = {
  id: string;
  menuItems: BaseDropdownItem[];
  children: JSX.Element;
  renderIcon?: (icon: string) => JSX.Element;
  ariaLabel: string;
  styles?: DropdownStyles;
};

export default function Dropdown(props: Props) {
  const [isOpen, setIsOpen] = createSignal(false);

  createEffect(() => {
    if (isOpen()) document.addEventListener("click", onClickOutside);
    else document.removeEventListener("click", onClickOutside);
  });

  function onClickOutside(e: MouseEvent) {
    if (!isOpen()) return;
    const target = e.target as HTMLElement;
    if (!target.closest(`#${props.id}`)) setIsOpen(false);
  }

  function onToggleDropdown() {
    setIsOpen(!isOpen());
  }

  return (
    <div id={props.id} class={mergeCls("relative", props.styles?.wrapper)}>
      <button
        type="button"
        onClick={onToggleDropdown}
        class={mergeCls("cursor-pointer", props.styles?.button)}
        aria-label={props.ariaLabel}
        aria-expanded={isOpen()}
        aria-haspopup="true"
      >
        {props.children}
      </button>

      <Show when={isOpen()}>
        <DropdownMenu />
      </Show>
    </div>
  );

  function DropdownMenu() {
    return (
      <div class={mergeCls("absolute left-0 z-50 mt-2 min-w-48 rounded-md shadow-lg", props.styles?.menu)}>
        <div
          class={mergeCls("py-1", props.styles?.menuContainer)}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          <Index each={props.menuItems}>
            {(item) => {
              if (item().items && item().items!.length > 0) {
                return <CategoryMenuItem item={item()} renderIcon={props.renderIcon} styles={props.styles} />;
              }
              return <MenuItem item={item()} renderIcon={props.renderIcon} styles={props.styles} />;
            }}
          </Index>
        </div>
      </div>
    );
  }

  function CategoryMenuItem(props: {
    item: BaseDropdownItem;
    renderIcon?: (icon: string) => JSX.Element;
    styles?: DropdownStyles;
  }) {
    return (
      <>
        <h4 class={mergeCls("border-b px-4 py-2 text-xs", props.styles?.categoryHeader)}>{props.item.text}</h4>
        <Index each={props.item.items}>
          {(item) => <MenuItem item={item()} renderIcon={props.renderIcon} styles={props.styles} />}
        </Index>
      </>
    );
  }

  function MenuItem(props: {
    item: BaseDropdownItem;
    renderIcon?: (icon: string) => JSX.Element;
    styles?: DropdownStyles;
  }) {
    const defaultMenuItemClass =
      "block px-4 py-2 text-sm w-full text-start border-none shadow-none cursor-pointer rounded transition-colors duration-200 ease-in-out hover:bg-gray-100";
    const classes = mergeCls(defaultMenuItemClass, props.styles?.menuItem);

    function onClick() {
      setIsOpen(false);
      props.item.onClick?.();
    }

    function onAnchorClick(event: MouseEvent) {
      if (props.item.onClick) event.preventDefault();
      onClick();
    }

    if (props.item.href)
      return (
        <a href={props.item.href} class={classes} onClick={onAnchorClick} role="menuitem">
          <span class="flex items-center gap-2">
            {props.item.icon && props.renderIcon?.(props.item.icon)}
            <span class={props.styles?.menuItemText}>{props.item.text}</span>
          </span>
        </a>
      );

    return (
      <button type="button" class={classes} onClick={onClick} role="menuitem">
        <span class="flex items-center gap-2">
          {props.item.icon && props.renderIcon?.(props.item.icon)}
          <span class={props.styles?.menuItemText}>{props.item.text}</span>
        </span>
      </button>
    );
  }
}
