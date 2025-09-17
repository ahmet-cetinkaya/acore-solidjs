import I18n from "acore-ts/i18n/I18n";
import type II18n from "acore-ts/i18n/abstraction/II18n";
import type { ParentProps } from "solid-js";
import { createContext, createEffect, createSignal, onMount, useContext } from "solid-js";

type UseI18nReturn = {
  i18n: II18n;
  t(key: string): string;
  locale: () => string;
  setLocale: (locale: string) => void;
};

type I18nContextType = UseI18nReturn;

const I18nContext = createContext<I18nContextType>();

export const useI18n = (): UseI18nReturn => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
};

interface I18nProviderProps extends ParentProps {
  translations: Record<string, Record<string, string>>;
  defaultLocale?: string;
  i18n?: II18n;
}

export const I18nProvider = (props: I18nProviderProps) => {
  const i18n = props.i18n || new I18n();
  const [locale, setLocale] = createSignal(i18n.currentLocale.get() || "");

  // Create a reactive translation function
  const t = (key: string) => {
    // Access locale signal to make this function reactive
    return i18n.translate(locale(), key);
  };

  onMount(() => {
    if (!props.i18n) {
      i18n.translations = props.translations;

      const preferred = i18n.loadPreferredLocale();
      let initLocale: string;
      if (preferred) {
        initLocale = preferred;
      } else {
        const browserLocale = i18n.getBrowserLocale();
        initLocale = i18n.locales.includes(browserLocale) ? browserLocale : (props.defaultLocale || 'en');
      }
      i18n.currentLocale.set(initLocale);
      setLocale(initLocale);
    }
  });

  // Sync the signal with the store
  createEffect(() => {
    const updateLocale = () => setLocale(i18n.currentLocale.get());
    i18n.currentLocale.subscribe(updateLocale);

    // Cleanup subscription
    return () => i18n.currentLocale.unsubscribe(updateLocale);
  });

  // Override the setLocale function to update both the signal and the store
  const updateLocale = (newLocale: string) => {
    const validLocale = i18n.locales.includes(newLocale) ? newLocale : (props.defaultLocale || 'en');
    i18n.currentLocale.set(validLocale);
    i18n.savePreferredLocale(validLocale);
    setLocale(validLocale);
  };

  const contextValue: UseI18nReturn = {
    i18n,
    t,
    locale,
    setLocale: updateLocale,
  };

  return <I18nContext.Provider value={contextValue}>{props.children}</I18nContext.Provider>;
};
