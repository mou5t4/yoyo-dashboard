# Internationalization (i18n) Guide

## Overview

YoyoPod Dashboard supports 8 languages with full RTL (Right-to-Left) support for Arabic and Farsi.

**Supported Languages:**
- 🇬🇧 English (`en`) - Default
- 🇪🇸 Español (`es`)
- 🇩🇪 Deutsch (`de`)
- 🇫🇷 Français (`fr`)
- 🇸🇦 العربية (`ar`) - RTL
- 🇮🇹 Italiano (`it`)
- 🇨🇳 中文 (`zh`)
- 🇮🇷 فارسی (`fa`) - RTL

## Architecture

### Technology Stack
- **remix-i18next** v6.4.1 - Server-side i18n
- **react-i18next** v13.5.0 - React hooks
- **i18next** v23.16.8 - Core library
- **date-fns** - Locale-aware date formatting

### File Structure
```
public/locales/
├── en/
│   └── common.json (All translations)
├── es/
│   └── common.json
├── de/
│   └── common.json
... (and 5 more languages)
```

### Configuration Files
- `app/i18n.ts` - Shared configuration
- `app/i18n.server.ts` - Server-side instance  
- `app/entry.client.tsx` - Client-side initialization
- `app/root.tsx` - Language synchronization

## Usage in Components

### Basic Translation
```typescript
import { useTranslation } from "react-i18next";

export default function MyComponent() {
  const { t } = useTranslation();
  
  return <h1>{t("dashboard.title")}</h1>;
}
```

### With Interpolation
```typescript
<p>{t("dashboard.subtitle", { deviceName: "YoyoPod" })}</p>
```

### Locale-Aware Formatting

#### Date & Time
```typescript
import { formatDateTime, formatDateOnly, formatTimeOnly } from "~/lib/format";

const formatted = formatDateTime(new Date(), currentLocale);
```

#### Numbers
```typescript
import { formatNumber, formatFileSize } from "~/lib/format";

const size = formatFileSize(bytes, currentLocale);
const percent = formatNumber(value, currentLocale, { style: 'percent' });
```

## Translation Management Scripts

### Validate Translations
Checks that all languages have identical keys:
```bash
npm run i18n:validate
```

This will:
- Compare all languages against English (reference)
- Report missing or extra keys
- Exit with error code 1 if validation fails (useful for CI/CD)

### Coverage Report
Generates a detailed translation completeness report:
```bash
npm run i18n:coverage
```

Shows:
- Coverage percentage per language
- Total key count
- Which namespaces need attention

### Future: Namespace Management

**Note:** Namespace splitting is prepared but not yet active. To enable in the future:

```bash
# Split common.json into namespaces
npm run i18n:split

# Merge namespaces back to common.json
npm run i18n:merge
```

## Adding New Translations

### 1. Add to English First
Edit `public/locales/en/common.json`:
```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my new feature"
  }
}
```

### 2. Add to All Other Languages
Use the same structure in:
- `public/locales/es/common.json`
- `public/locales/de/common.json`
- ... (all 8 languages)

### 3. Validate
```bash
npm run i18n:validate
```

### 4. Use in Components
```typescript
<h1>{t("myFeature.title")}</h1>
<p>{t("myFeature.description")}</p>
```

## Translation Key Naming Convention

Use consistent, hierarchical naming:

```
{feature}.{component}.{element}.{variation}
```

**Examples:**
- `dashboard.title` - Page title
- `dashboard.deviceStatus` - Card title
- `dashboard.batteryLowAlert` - Alert message
- `settings.general` - Section heading
- `common.save` - Reusable button

**Best Practices:**
- Keep keys lowercase
- Use camelCase for multi-word keys
- Group related keys under common parent
- Reuse common keys (save, cancel, delete, etc.)

## RTL Support

Arabic and Farsi automatically render right-to-left:

```typescript
// Automatic RTL detection
const dir = isRTL(locale) ? 'rtl' : 'ltr';

// Applied to HTML element
<html lang={locale} dir={dir}>
```

## Language Persistence

User language preference is stored in the database:

```typescript
// In Settings model
language: String // e.g., "en", "es", "fr"
```

Changes are persisted across sessions.

## Development Tips

### 1. Use Translation Keys Consistently
❌ Bad: Hardcoded strings
```typescript
<button>Save Settings</button>
```

✅ Good: Translation keys
```typescript
<button>{t("common.save")}</button>
```

### 2. Add Context for Translators
When adding new keys, consider adding comments in the JSON:
```json
{
  // Note: Keep this short - appears on mobile
  "shortLabel": "Home"
}
```

### 3. Test in Multiple Languages
Always test UI changes in:
- English (LTR, reference)
- Arabic (RTL, different script)
- German (longer words)

### 4. Suppress Hydration Warnings
For dynamic content that changes on the client:
```typescript
<p suppressHydrationWarning>
  {formatDateTime(new Date())}
</p>
```

## Performance Considerations

### Current Implementation
- **Single Namespace:** All translations loaded at once
- **File Size:** ~15KB per language (gzipped: ~3KB)
- **Load Time:** Minimal impact

### Future Optimization (Namespaces)
When the app grows larger:
1. Split into namespaces (already prepared)
2. Enable lazy loading per route
3. Reduce initial bundle size

## Troubleshooting

### Translations showing as keys (e.g., "dashboard.title")
- Check namespace configuration in `i18n.server.ts`
- Verify JSON files are valid
- Check browser network tab for 404 errors
- Restart dev server

### Hydration warnings
- Add `suppressHydrationWarning` to dynamic content
- Ensure server and client use same locale

### Missing translations
- Run `npm run i18n:validate` to find gaps
- Check that keys exist in all 8 languages

## CI/CD Integration

Add to your pipeline:
```yaml
- name: Validate translations
  run: npm run i18n:validate
  
- name: Check coverage
  run: npm run i18n:coverage
```

## Resources

- [remix-i18next Documentation](https://github.com/sergiodxa/remix-i18next)
- [react-i18next Documentation](https://react.i18next.com/)
- [date-fns Locales](https://date-fns.org/docs/I18n)


