import { Link, useLocation } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { APP_NAME } from '~/lib/constants';
import { LanguageSelector } from '~/components/LanguageSelector';
import { ThemeToggle } from '~/components/ThemeToggle';
import { isRTL } from '~/i18n';
import type { SupportedLanguage } from '~/i18n';

interface DesktopLayoutProps {
  language: SupportedLanguage;
  children: React.ReactNode;
}

const navigation = [
  { key: 'dashboard', href: '/dashboard', icon: '🏠' },
  { key: 'wifi', href: '/wifi', icon: '📶' },
  { key: 'bluetooth', href: '/bluetooth', icon: '🔵' },
  { key: 'audio', href: '/audio', icon: '🔊' },
  { key: 'location', href: '/location', icon: '📍' },
  { key: 'contacts', href: '/contacts', icon: '👥' },
  { key: 'content', href: '/content', icon: '🎵' },
  { key: 'ai', href: '/ai', icon: '🤖' },
  { key: 'schedule', href: '/schedule', icon: '⏰' },
  { key: 'reports', href: '/reports', icon: '📊' },
  { key: 'settings', href: '/settings', icon: '⚙️' },
];

export function DesktopLayout({ language, children }: DesktopLayoutProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const rtl = isRTL(language);

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed top-0 bottom-0 w-80 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 z-40 m-6 rounded-3xl shadow-2xl",
        rtl ? "right-0" : "left-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/30 gap-4">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex-1 leading-tight">{APP_NAME}</h1>
            <div className="flex-shrink-0 flex items-center gap-2">
              <ThemeToggle />
              <LanguageSelector currentLanguage={language} />
            </div>
          </div>

          {/* Sidebar Navigation */}
        <nav className="flex-1 p-6 space-y-1 overflow-y-auto scrollbar-hide">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-4 px-4 py-2.5 rounded-xl text-base font-semibold transition-all duration-300 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                  active
                    ? 'bg-blue-100 dark:bg-white/30 text-blue-900 dark:text-white shadow-xl border-l-4 border-blue-600 dark:border-white/60'
                    : 'text-gray-700 dark:text-white/92 hover:bg-gray-100 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white hover:shadow-lg hover:translate-x-1 focus-visible:bg-gray-100 dark:focus-visible:bg-white/20 focus-visible:text-gray-900 dark:focus-visible:text-white'
                )}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{t(`nav.${item.key}`)}</span>
              </Link>
            );
          })}
        </nav>

          {/* Sidebar Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-white/30">
            <button
              onClick={() => {
                // Handle logout
              }}
              className="flex items-center gap-4 px-4 py-2.5 rounded-xl text-base font-semibold text-red-600 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-500/40 hover:text-red-700 dark:hover:text-white hover:shadow-lg transition-all duration-300 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:bg-red-100 dark:focus-visible:bg-red-500/40 focus-visible:text-red-700 dark:focus-visible:text-white"
            >
              <span className="text-xl flex-shrink-0">🚪</span>
              <span className="flex-1 text-left">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Main Content */}
      <main className={rtl ? "pr-96" : "pl-96"}>
        <div className="px-6 sm:px-8 lg:px-10 py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
