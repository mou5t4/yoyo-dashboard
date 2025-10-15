import { Link, useLocation } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { APP_NAME } from '~/lib/constants';
import { LanguageSelector } from '~/components/LanguageSelector';
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
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed top-0 bottom-0 w-64 bg-white shadow-sm z-40",
        rtl ? "right-0 border-l border-gray-200" : "left-0 border-r border-gray-200"
      )}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-primary-500">{APP_NAME}</h1>
            <LanguageSelector currentLanguage={language} />
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary-100 text-primary-700 border-l-2 border-primary-500'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <span className="text-lg">{item.icon}</span>
                  {t(`nav.${item.key}`)}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                // Handle logout
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors w-full"
            >
              <span className="text-lg">🚪</span>
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Main Content */}
      <main className={rtl ? "pr-64" : "pl-64"}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
