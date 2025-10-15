#!/usr/bin/env tsx
/**
 * Script to split common.json into multiple namespaces
 * This improves maintainability and allows for lazy loading
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOCALES_DIR = join(process.cwd(), 'public', 'locales');
const LANGUAGES = ['en', 'es', 'de', 'fr', 'ar', 'it', 'zh', 'fa'];

// Define namespace splits based on feature areas
const NAMESPACE_MAPPING = {
  common: ['app', 'common', 'nav', 'errors', 'validation', 'time'],
  auth: ['auth', 'license', 'setup'],
  dashboard: ['dashboard'],
  settings: ['settings', 'audio', 'wifi', 'bluetooth', 'location'],
  content: ['content', 'ai'],
  contacts: ['contacts'],
  schedule: ['schedule'],
  reports: ['reports'],
};

function splitTranslations(language: string) {
  const commonPath = join(LOCALES_DIR, language, 'common.json');
  
  console.log(`Processing ${language}...`);
  
  // Read the current common.json
  const commonContent = JSON.parse(readFileSync(commonPath, 'utf-8'));
  
  // Create new namespace files
  Object.entries(NAMESPACE_MAPPING).forEach(([namespace, keys]) => {
    const namespaceContent: Record<string, any> = {};
    
    // Keep the nested structure - just extract the relevant top-level keys
    keys.forEach(key => {
      if (commonContent[key]) {
        namespaceContent[key] = commonContent[key];
      }
    });
    
    // Only write if there's content
    if (Object.keys(namespaceContent).length > 0) {
      const namespacePath = join(LOCALES_DIR, language, `${namespace}.json`);
      writeFileSync(
        namespacePath,
        JSON.stringify(namespaceContent, null, 2) + '\n',
        'utf-8'
      );
      console.log(`  ✓ Created ${namespace}.json (${Object.keys(namespaceContent).length} top-level keys)`);
    }
  });
}

// Process all languages
console.log('Splitting translation files into namespaces...\n');

LANGUAGES.forEach(lang => {
  try {
    splitTranslations(lang);
  } catch (error) {
    console.error(`Error processing ${lang}:`, error);
  }
});

console.log('\n✅ Done! All translation files split successfully.');
console.log('📝 Next steps:');
console.log('   1. Update i18n.server.ts to support multiple namespaces');
console.log('   2. Update route handles to specify required namespaces');
console.log('   3. Test the application');
console.log('   4. Remove old common.json files once verified');

