import { mergeCls } from "@packages/acore-ts/ui/ClassHelpers";
import HtmlEditorManager, { type FormatType } from "@packages/acore-ts/ui/HtmlEditorManager";
import { createMemo, Index, onCleanup, Show, type JSX } from "solid-js";
import IconSvgs from "../constants/IconSvgs";
import Icon from "./SvgIcon";

type ButtonComponentFunc = (props: { onClick: () => void; ariaLabel: string; children: JSX.Element }) => JSX.Element;
type ToolbarButton = {
  iconSvg: string;
  label: string;
};

export type Props = {
  class?: string;
  inputClass?: string;
  toolbarClass?: string;
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
};

/**
 * HtmlEditor is a component for editing HTML content with a toolbar.
 *
 * @param props - The component properties.
 * @param props.class - The class name for the root element.
 * @param props.inputClass - The class name for the input element.
 * @param props.onInput - The callback function that is called when the input changes.
 * @param props.toolbarClass - The class name for the toolbar element.
 * @param props.toolbarButtons - The toolbar button configurations.
 * @param props.enterUrlPromptText - The prompt text for entering a URL.
 * @param props.customButtonComponent - The custom button component.
 */
export default function HtmlEditor(props: Props) {
  let editorInstance: HtmlEditorManager | undefined;

  const toolbarButtons = createMemo(() => getToolbarButtons(props.toolbarButtons));

  function onEditorMount(editorElement: HTMLElement) {
    editorInstance = new HtmlEditorManager(editorElement, onEditorChange);
    editorInstance.attachEventListeners();
  }

  onCleanup(() => {
    if (editorInstance) editorInstance.detachEventListeners();
  });

  function onEditorChange(html: string) {
    if (props.onInput) props.onInput(html);
  }

  return (
    <section class={mergeCls(props.class)}>
      <header class={mergeCls("border-surface-300 mb-2 flex border-b p-2", props.toolbarClass)}>
        <Index each={toolbarButtons()}>
          {(button) => (
            <ToolbarButton
              iconSvg={button().icon}
              onClick={() =>
                button().clear
                  ? editorInstance!.clearFormat()
                  : editorInstance!.formatText(button().format as FormatType)
              }
              ariaLabel={button().label}
              customButtonComponent={props.customButtonComponent}
            />
          )}
        </Index>
      </header>
      <div class={mergeCls("mt-2 w-full overflow-y-auto p-4", props.inputClass)}>
        <article ref={onEditorMount} contentEditable class="size-full p-1 outline-none" />
      </div>
    </section>
  );
}

function getToolbarButtons(toolbarButtons?: Props["toolbarButtons"]) {
  return [
    {
      icon: toolbarButtons?.bold.iconSvg ?? IconSvgs.bold,
      format: "b",
      label: toolbarButtons?.bold.label ?? "bold",
    },
    {
      icon: toolbarButtons?.underline.iconSvg ?? IconSvgs.underline,
      format: "u",
      label: toolbarButtons?.underline.label ?? "underline",
    },
    {
      icon: toolbarButtons?.italic.iconSvg ?? IconSvgs.italic,
      format: "i",
      label: toolbarButtons?.italic.label ?? "italic",
    },
    {
      icon: toolbarButtons?.heading1.iconSvg ?? IconSvgs.heading1,
      format: "h1",
      label: toolbarButtons?.heading1.label ?? "heading1",
    },
    {
      icon: toolbarButtons?.heading2.iconSvg ?? IconSvgs.heading2,
      format: "h2",
      label: toolbarButtons?.heading2.label ?? "heading2",
    },
    {
      icon: toolbarButtons?.unorderedList.iconSvg ?? IconSvgs.unorderedList,
      format: "ul",
      label: toolbarButtons?.unorderedList.label ?? "unorderedList",
    },
    {
      icon: toolbarButtons?.orderedList.iconSvg ?? IconSvgs.orderedList,
      format: "ol",
      label: toolbarButtons?.orderedList.label ?? "orderedList",
    },
    {
      icon: toolbarButtons?.link.iconSvg ?? IconSvgs.link,
      format: "a",
      label: toolbarButtons?.link.label ?? "link",
    },
    {
      icon: toolbarButtons?.formatClear.iconSvg ?? IconSvgs.formatClear,
      format: "",
      label: toolbarButtons?.formatClear.label ?? "format clear",
      clear: true,
    },
  ];
}

function ToolbarButton(props: {
  iconSvg: string;
  ariaLabel: string;
  onClick: () => void;
  customButtonComponent?: ButtonComponentFunc;
}) {
  return (
    <Show
      when={props.customButtonComponent}
      fallback={
        <button
          onClick={props.onClick}
          class="rounded p-1 text-gray-500 transition-colors duration-200 ease-in-out hover:bg-gray-100"
          aria-label={props.ariaLabel}
        >
          <Icon svg={props.iconSvg} alt={props.ariaLabel} class="size-4" />
        </button>
      }
    >
      {props.customButtonComponent && (
        <props.customButtonComponent onClick={props.onClick} ariaLabel={props.ariaLabel}>
          <Icon svg={props.iconSvg} alt={props.ariaLabel} class="size-4" />
        </props.customButtonComponent>
      )}
    </Show>
  );
}
