import { mergeCls } from "@packages/acore-ts/ui/ClassHelpers";
import { createEffect, createSignal, Index, Show, type JSX } from "solid-js";

export type BaseDropdownItem = {
  text: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
  items?: BaseDropdownItem[];
};

type Props = {
  menuItems: BaseDropdownItem[];
  children: JSX.Element;
  buttonClass?: string;
  ariaLabel: string;
  renderIcon?: (icon: string) => JSX.Element;
  id: string;
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
    <div id={props.id} class="ac-dropdown relative inline-block text-left">
      <div class="flex size-full items-center justify-center">
        <button
          type="button"
          onClick={onToggleDropdown}
          class={mergeCls("rounded px-4 py-2 text-white", props.buttonClass)}
          aria-label={props.ariaLabel}
        >
          {props.children}
        </button>
      </div>

      <Show when={isOpen()}>
        <Menu />
      </Show>
    </div>
  );

  function Menu() {
    return (
      <div class="bg-surface-500 shadow-secondary absolute left-0 z-50 mt-2 w-56 origin-top-right rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
        <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
          <Index each={props.menuItems}>
            {(item) => {
              if (item().items)
                return (
                  <>
                    <h1 class="border-surface-300 border-b px-4 py-2 text-xs text-gray-300">{item().text}</h1>
                    <Index each={item().items}>
                      {(subitem) => <MenuItem item={subitem()} renderIcon={props.renderIcon} />}
                    </Index>
                  </>
                );

              return <MenuItem item={item()} renderIcon={props.renderIcon} />;
            }}
          </Index>
        </div>
      </div>
    );
  }

  function MenuItem(props: { item: BaseDropdownItem; renderIcon?: (icon: string) => JSX.Element }) {
    const classes =
      "block px-4 py-2 text-sm text-gray-200 hover:bg-gray-100 hover:text-gray-900 w-full text-start border-none shadow-none cursor-pointer rounded transition-colors duration-200 ease-in-out";

    function onClick() {
      setIsOpen(false);
      props.item.onClick?.();
    }

    if (props.item.href)
      return (
        <a href={props.item.href} onClick={onClick} class={classes} aria-label={props.item.text}>
          {renderMenuItem(props.item)}
        </a>
      );
    else
      return (
        <button onClick={onClick} class={classes} aria-label={props.item.text}>
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
