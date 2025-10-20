#!/usr/bin/env tsx
/**
 * Merge namespace files back into common.json
 * Useful for reverting the namespace split
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const LOCALES_DIR = join(process.cwd(), 'public', 'locales');
const LANGUAGES = ['en', 'es', 'de', 'fr', 'ar', 'it', 'zh', 'fa'];
const NAMESPACES = ['common', 'auth', 'dashboard', 'settings', 'content', 'contacts', 'schedule', 'reports'];

function mergeNamespaces(language: string) {
  console.log(`Merging ${language}...`);
  
  const mergedContent: Record<string, any> = {};
  
  // Read each namespace file and merge into common
  NAMESPACES.forEach(namespace => {
    try {
      const filePath = join(LOCALES_DIR, language, `${namespace}.json`);
      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      Object.assign(mergedContent, content);
    } catch (error) {
      console.warn(`  ⚠️  Could not read ${namespace}.json`);
    }
  });
  
  // Write merged common.json
  const commonPath = join(LOCALES_DIR, language, 'common.json');
  writeFileSync(
    commonPath,
    JSON.stringify(mergedContent, null, 2) + '\n',
    'utf-8'
  );
  
  console.log(`  ✓ Merged into common.json (${Object.keys(mergedContent).length} top-level keys)`);
}

console.log('Merging namespace files back into common.json...\n');

LANGUAGES.forEach(lang => {
  try {
    mergeNamespaces(lang);
  } catch (error) {
    console.error(`Error processing ${lang}:`, error);
  }
});

console.log('\n✅ Done! All namespace files merged into common.json');





