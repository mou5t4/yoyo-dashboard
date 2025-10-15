import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useTranslation } from "react-i18next";
import { useChangeLanguage } from "remix-i18next/react";

import styles from "./styles/global.css?url";
import { APP_NAME } from "./lib/constants";
import { i18nServer } from "./i18n.server";
import { isRTL, defaultLanguage } from "./i18n";
import { getUserId } from "./lib/session.server";
import { prisma } from "./lib/db.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  { rel: "manifest", href: "/manifest.json" },
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  let locale = defaultLanguage;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });
    
    if (user?.settings?.language) {
      locale = user.settings.language;
    }
  }

  return json({
    locale,
    dir: isRTL(locale) ? 'rtl' : 'ltr',
  });
}

export let handle = {
  i18n: "common",
};

export default function App() {
  const { locale, dir } = useLoaderData<typeof loader>();
  const { i18n } = useTranslation();
  
  // This hook handles language changes and keeps client/server in sync
  useChangeLanguage(locale);

  return (
    <html lang={locale} dir={dir}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  
  let errorMessage: string;
  let errorStatus: number;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.statusText;
  } else if (error instanceof Error) {
    errorStatus = 500;
    errorMessage = error.message;
  } else {
    errorStatus = 500;
    errorMessage = "An unexpected error occurred";
  }

  return (
    <html lang="en" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error - {APP_NAME}</title>
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-primary-500 mb-4">
              {errorStatus}
            </h1>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600 mb-8">{errorMessage}</p>
            <a
              href="/"
              className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Go back home
            </a>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

