import { useState } from 'react';
import { Link, useLocation } from '@remix-run/react';
import { X, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { APP_NAME } from '~/lib/constants';
import { LanguageSelector } from '~/components/LanguageSelector';
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <h1 className="text-xl font-bold text-primary-500">{APP_NAME}</h1>
          <div className="flex items-center gap-2">
            <LanguageSelector currentLanguage={language} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
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
            className="fixed inset-0 z-40 bg-black/50 animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Menu Panel */}
          <div className={cn(
            "fixed top-0 bottom-0 w-[280px] z-50 bg-white shadow-xl animate-slide-in",
            rtl ? "right-0" : "left-0"
          )}>
            <div className="h-full overflow-y-auto pt-16 pb-6">
              <nav className="flex flex-col p-4 space-y-1">
                {navigation.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {t(`nav.${item.key}`)}
                    </Link>
                  );
                })}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      // Handle logout
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors w-full"
                  >
                    <span className="text-lg">🚪</span>
                    {t('nav.logout')}
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Mobile Main Content */}
      <main className="pt-16">
        <div className="px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
