import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import zh from "../locales/zh";
import en from "../locales/en";

type Locale = "zh" | "en";
type Translations = typeof zh;

const translations: Record<Locale, Translations> = { zh, en };

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: "zh",
  t: zh,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(
    () => (localStorage.getItem("mywords-locale") as Locale) || "zh"
  );

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem("mywords-locale", l);
    setLocaleState(l);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
