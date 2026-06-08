import { mergeCls } from "acore-ts/ui/ClassHelpers";
import HtmlEditorManager, { type FormatType } from "acore-ts/ui/HtmlEditorManager";
import { createMemo, Index, onCleanup, Show, type JSX } from "solid-js";
import IconSvgs from "../constants/IconSvgs";
import Icon from "./SvgIcon";

type ButtonComponentFunc = (props: { onClick: () => void; ariaLabel: string; children: JSX.Element }) => JSX.Element;
type ToolbarButton = {
  iconSvg: string;
  label: string;
};

export type HtmlEditorStyles = {
  wrapper?: string;
  toolbar?: string;
  toolbarButton?: string;
  toolbarIcon?: string;
  inputWrapper?: string;
  editor?: string;
};

export type Props = {
  toolbarButtons?: {
    bold: ToolbarButton;
    underline: ToolbarButton;
    italic: ToolbarButton;
    heading1: ToolbarButton;
    heading2: ToolbarButton;
    unorderedList: ToolbarButton;
    orderedList: ToolbarButton;
    link: ToolbarButton;
    formatClear: ToolbarButton;
  };
  enterUrlPromptText?: string;
  onInput?: (html: string) => void;
  customButtonComponent?: ButtonComponentFunc;
  styles?: HtmlEditorStyles;
};

/**
 * HtmlEditor is a component for editing HTML content with a toolbar.
 *
 * @param props - The component properties.
 * @param props.onInput - The callback function that is called when the input changes.
 * @param props.toolbarButtons - The toolbar button configurations.
 * @param props.enterUrlPromptText - The prompt text for entering a URL.
 * @param props.customButtonComponent - The custom button component.
 * @param props.styles - Style overrides for editor elements.
 */
export default function HtmlEditor(props: Props) {
  let editorInstance: HtmlEditorManager | undefined;

  const toolbarButtons = createMemo(() => getToolbarButtons(props.toolbarButtons));

  function onEditorMount(editorElement: HTMLElement) {
    editorInstance = new HtmlEditorManager(editorElement);
    editorInstance.onInput = (html) => {
      props.onInput?.(html);
    };

    onCleanup(() => {
      if (editorInstance) {
        editorInstance.destroy();
      }
    });
  }

  function onButtonClick(formatType: FormatType) {
    if (!editorInstance) return;
    editorInstance.execute(formatType);
  }

  function onLinkButtonClick() {
    if (!editorInstance) return;
    const url = prompt(props.enterUrlPromptText || "Enter URL:");
    if (url) {
      editorInstance.createLink(url);
    }
  }

  return (
    <section class={mergeCls(props.styles?.wrapper)}>
      <header class={mergeCls("flex border-b p-2", props.styles?.toolbar)}>
        <Index each={toolbarButtons()}>
          {(button) => (
            <ToolbarButton
              iconSvg={button().iconSvg}
              ariaLabel={button().label}
              onClick={
                button().label === "link" ? onLinkButtonClick : () => onButtonClick(button().label as FormatType)
              }
              customButtonComponent={props.customButtonComponent}
              styles={props.styles}
            />
          )}
        </Index>
      </header>

      <div class={mergeCls("w-full overflow-y-auto p-4", props.styles?.inputWrapper)}>
        <article
          ref={onEditorMount}
          contentEditable
          class={mergeCls("size-full p-1 outline-none", props.styles?.editor)}
        />
      </div>
    </section>
  );
}

function ToolbarButton(props: {
  iconSvg: string;
  ariaLabel: string;
  onClick: () => void;
  customButtonComponent?: ButtonComponentFunc;
  styles?: HtmlEditorStyles;
}) {
  return (
    <Show
      when={props.customButtonComponent}
      fallback={
        <button
          onClick={props.onClick}
          class={mergeCls("cursor-pointer rounded p-1", props.styles?.toolbarButton)}
          aria-label={props.ariaLabel}
        >
          <Icon
            svg={props.iconSvg}
            alt={props.ariaLabel}
            styles={{ wrapper: mergeCls("select-none", props.styles?.toolbarIcon) }}
          />
        </button>
      }
    >
      {props.customButtonComponent && (
        <props.customButtonComponent onClick={props.onClick} ariaLabel={props.ariaLabel}>
          <Icon
            svg={props.iconSvg}
            alt={props.ariaLabel}
            styles={{ wrapper: mergeCls("select-none", props.styles?.toolbarIcon) }}
          />
        </props.customButtonComponent>
      )}
    </Show>
  );
}

function getToolbarButtons(customButtons?: Props["toolbarButtons"]): ToolbarButton[] {
  return [
    { iconSvg: customButtons?.bold.iconSvg ?? IconSvgs.bold, label: "bold" },
    { iconSvg: customButtons?.underline.iconSvg ?? IconSvgs.underline, label: "underline" },
    { iconSvg: customButtons?.italic.iconSvg ?? IconSvgs.italic, label: "italic" },
    { iconSvg: customButtons?.heading1.iconSvg ?? IconSvgs.heading1, label: "heading1" },
    { iconSvg: customButtons?.heading2.iconSvg ?? IconSvgs.heading2, label: "heading2" },
    { iconSvg: customButtons?.unorderedList.iconSvg ?? IconSvgs.unorderedList, label: "unorderedList" },
    { iconSvg: customButtons?.orderedList.iconSvg ?? IconSvgs.orderedList, label: "orderedList" },
    { iconSvg: customButtons?.link.iconSvg ?? IconSvgs.link, label: "link" },
    { iconSvg: customButtons?.formatClear.iconSvg ?? IconSvgs.formatClear, label: "formatClear" },
  ];
}
