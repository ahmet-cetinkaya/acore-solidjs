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

const LABEL_TO_FORMAT: Record<string, FormatType> = {
  bold: "b",
  underline: "u",
  italic: "i",
  heading1: "h1",
  heading2: "h2",
  unorderedList: "ul",
  orderedList: "ol",
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
    const manager = new HtmlEditorManager(editorElement, (html) => {
      props.onInput?.(html);
    });

    if (props.enterUrlPromptText) {
      manager.urlPromptText = props.enterUrlPromptText;
    }

    editorInstance = manager;
    editorInstance.attachEventListeners();

    onCleanup(() => {
      editorInstance?.detachEventListeners();
      editorInstance = undefined;
    });
  }

  function onButtonClick(label: string) {
    if (!editorInstance) return;
    if (label === "formatClear") {
      editorInstance.clearFormat();
    } else {
      const format = LABEL_TO_FORMAT[label];
      if (format) editorInstance.formatText(format);
    }
  }

  function onLinkButtonClick() {
    onButtonClick("link");
  }

  return (
    <section class={mergeCls(props.styles?.wrapper)}>
      <header class={mergeCls("flex border-b p-2", props.styles?.toolbar)}>
        <Index each={toolbarButtons()}>
          {(button) => (
            <ToolbarButton
              iconSvg={button().iconSvg}
              ariaLabel={button().label}
              onClick={button().label === "link" ? onLinkButtonClick : () => onButtonClick(button().label)}
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
          class={mergeCls("size-full select-text p-1 outline-none", props.styles?.editor)}
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
  function onMouseDown(e: MouseEvent) {
    e.preventDefault();
  }

  return (
    <span onMouseDown={onMouseDown}>
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
    </span>
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
