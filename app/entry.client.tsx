import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import { getInitialNamespaces } from "remix-i18next/client";
import { defaultLanguage, supportedLanguages } from "./i18n";

async function hydrate() {
  await i18next
    .use(initReactI18next)
    .use(Backend)
    .init({
      supportedLngs: Object.keys(supportedLanguages),
      defaultNS: "common",
      fallbackLng: defaultLanguage,
      ns: getInitialNamespaces(),
      detection: {
        order: ["htmlTag"],
        caches: [],
      },
      backend: {
        loadPath: "/locales/{{lng}}/{{ns}}.json",
      },
      react: {
        useSuspense: false,
      },
    });

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <RemixBrowser />
        </StrictMode>
      </I18nextProvider>
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  window.setTimeout(hydrate, 1);
}

