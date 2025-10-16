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
    <div className="min-h-screen">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-nav m-3 rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 gap-3">
          <h1 className="text-xl font-extrabold text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>{APP_NAME}</h1>
          <div className="flex items-center gap-3">
            <LanguageSelector currentLanguage={language} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl hover:bg-white/25 active:bg-white/35 transition-all duration-200 touch-manipulation text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
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
            "fixed top-0 bottom-0 w-[300px] z-50 glass-nav shadow-2xl animate-slide-in m-3 rounded-3xl",
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
                      'flex items-center gap-4 px-4 py-2.5 rounded-xl text-base font-semibold transition-all duration-300 touch-manipulation min-h-[44px]',
                      active
                        ? 'bg-white/30 text-white shadow-xl backdrop-blur-sm border-l-4 border-white/60'
                        : 'text-white/85 hover:bg-white/20 hover:text-white hover:shadow-lg active:bg-white/25'
                    )}
                    style={active ? { textShadow: '0 1px 4px rgba(0,0,0,0.3)' } : undefined}
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span className="flex-1">{t(`nav.${item.key}`)}</span>
                  </Link>
                );
              })}
              <div className="mt-6 pt-4 border-t border-white/30">
                <button
                  onClick={() => {
                    // Handle logout
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-4 px-4 py-2.5 rounded-xl text-base font-semibold text-red-200 hover:bg-red-500/40 hover:text-white hover:shadow-lg active:bg-red-500/50 transition-all duration-300 w-full touch-manipulation min-h-[44px]"
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
