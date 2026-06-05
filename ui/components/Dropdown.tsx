import { mergeCls } from "acore-ts/ui/ClassHelpers";
import { createEffect, createSignal, Index, Show, type JSX } from "solid-js";

export type BaseDropdownItem = {
  text: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
  items?: BaseDropdownItem[];
};

type DropdownStyles = {
  wrapper?: string;
  button?: string;
  menu?: string;
  menuContainer?: string;
  menuItem?: string;
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
        <Menu />
      </Show>
    </div>
  );

  function Menu() {
    return (
      <div class={mergeCls(props.styles?.menu)}>
        <div class={mergeCls(props.styles?.menuContainer)} role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
          <Index each={props.menuItems}>
            {(item) => {
              if (item().items)
                return (
                  <>
                    <h1 class={mergeCls(props.styles?.categoryHeader)}>{item().text}</h1>
                    <Index each={item().items}>
                      {(subitem) => <MenuItem item={subitem()} renderIcon={props.renderIcon} styles={props.styles} />}
                    </Index>
                  </>
                );

              return <MenuItem item={item()} renderIcon={props.renderIcon} styles={props.styles} />;
            }}
          </Index>
        </div>
      </div>
    );
  }

  function MenuItem(props: {
    item: BaseDropdownItem;
    renderIcon?: (icon: string) => JSX.Element;
    styles?: DropdownStyles;
  }) {
    const classes = mergeCls("cursor-pointer", props.styles?.menuItem);

    function onClick() {
      setIsOpen(false);
      props.item.onClick?.();
    }

    if (props.item.href)
      return (
        <a href={props.item.href} onClick={onClick} class={classes} aria-label={props.item.text} role="menuitem">
          {renderMenuItem(props.item)}
        </a>
      );
    else
      return (
        <button onClick={onClick} class={classes} aria-label={props.item.text} role="menuitem">
          {renderMenuItem(props.item)}
        </button>
      );

    function renderMenuItem(item: BaseDropdownItem) {
      return (
        <span class="flex items-center gap-2">
          <Show when={item.icon && props.renderIcon}>{item.icon && props.renderIcon?.(item.icon)}</Show>
          {item.text}
        </span>
      );
    }
  }
}
