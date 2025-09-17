import { createContext, useContext } from 'solid-js';
import type { ParentProps } from 'solid-js';
import I18n from 'acore-ts/i18n/I18n';
import type II18n from 'acore-ts/i18n/abstraction/II18n';
import { onMount } from 'solid-js';

type UseI18nReturn = II18n & {
  t(key: string): string;
};

type I18nContextType = II18n;

const I18nContext = createContext<I18nContextType>();

export const useI18n = (): UseI18nReturn => {
  const context = useContext(I18nContext) as II18n;
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return {
    ...context,
    t: (key: string) => context.translate(context.currentLocale.get(), key)
  };
};

interface I18nProviderProps extends ParentProps {
  translations: Record<string, Record<string, string>>;
  defaultLocale?: string;
  i18n?: II18n;
}

export const I18nProvider = (props: I18nProviderProps) => {
  const i18n = props.i18n || new I18n();

  onMount(() => {
    if (!props.i18n) {
      i18n.translations = props.translations;
      const locale = i18n.getBrowserLocale();
      if (props.defaultLocale && !i18n.locales.includes(locale)) {
        i18n.currentLocale.set(props.defaultLocale);
      } else {
        i18n.currentLocale.set(locale);
      }
    }
  });

  return (
    <I18nContext.Provider value={i18n}>
      {props.children}
    </I18nContext.Provider>
  );
};