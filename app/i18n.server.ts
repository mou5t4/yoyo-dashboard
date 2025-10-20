import { RemixI18Next } from "remix-i18next/server";
import { resolve } from "node:path";
import { defaultLanguage, supportedLanguages } from "./i18n";
import Backend from "i18next-fs-backend";

export const i18nServer = new RemixI18Next({
  detection: {
    supportedLanguages: Object.keys(supportedLanguages),
    fallbackLanguage: defaultLanguage,
  },
  i18next: {
    backend: {
      loadPath: resolve("./public/locales/{{lng}}/{{ns}}.json"),
    },
  },
  backend: Backend,
});


