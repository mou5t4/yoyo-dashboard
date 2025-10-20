import { useState } from 'react';
import { Link, useLocation } from '@remix-run/react';
import { X, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { APP_NAME } from '~/lib/constants';
import { LanguageSelector } from '~/components/LanguageSelector';
import { ThemeToggle } from '~/components/ThemeToggle';
import { isRTL } from '~/i18n';
import type { SupportedLanguage } from '~/i18n';

interface MobileLayoutProps {
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

export function MobileLayout({ language, children }: MobileLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const rtl = isRTL(language);

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 m-3 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 gap-3">
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{APP_NAME}</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSelector currentLanguage={language} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/25 active:bg-gray-200 dark:active:bg-white/35 transition-all duration-200 touch-manipulation text-gray-900 dark:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Menu Panel */}
          <div className={cn(
            "fixed top-0 bottom-0 w-[300px] z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-2xl animate-slide-in m-3 rounded-3xl",
            rtl ? "right-0" : "left-0"
          )}>
          <div className="h-full overflow-y-auto pt-20 pb-6 scrollbar-hide">
            <nav className="flex flex-col p-5 space-y-1">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-4 px-4 py-2.5 rounded-xl text-base font-semibold transition-all duration-300 touch-manipulation min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                      active
                        ? 'bg-blue-100 dark:bg-white/30 text-blue-900 dark:text-white shadow-xl border-l-4 border-blue-600 dark:border-white/60'
                        : 'text-gray-700 dark:text-white/92 hover:bg-gray-100 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white hover:shadow-lg active:bg-gray-200 dark:active:bg-white/25 focus-visible:bg-gray-100 dark:focus-visible:bg-white/20 focus-visible:text-gray-900 dark:focus-visible:text-white'
                    )}
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span className="flex-1">{t(`nav.${item.key}`)}</span>
                  </Link>
                );
              })}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/30">
                <button
                  onClick={() => {
                    // Handle logout
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-4 px-4 py-2.5 rounded-xl text-base font-semibold text-red-600 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-500/40 hover:text-red-700 dark:hover:text-white hover:shadow-lg active:bg-red-200 dark:active:bg-red-500/50 transition-all duration-300 w-full touch-manipulation min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:bg-red-100 dark:focus-visible:bg-red-500/40 focus-visible:text-red-700 dark:focus-visible:text-white"
                >
                  <span className="text-xl flex-shrink-0">🚪</span>
                  <span className="flex-1 text-left">{t('nav.logout')}</span>
                </button>
              </div>
            </nav>
          </div>
          </div>
        </>
      )}

      {/* Mobile Main Content */}
      <main className="pt-24">
        <div className="px-5 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
