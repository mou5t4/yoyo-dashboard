#!/usr/bin/env tsx
/**
 * Translation Validation Script
 * Checks that all languages have the same translation keys
 * Useful for CI/CD pipelines to prevent missing translations
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const LOCALES_DIR = join(process.cwd(), 'public', 'locales');
const LANGUAGES = ['en', 'es', 'de', 'fr', 'ar', 'it', 'zh', 'fa'];
const NAMESPACES = ['common', 'auth', 'dashboard', 'settings', 'content', 'contacts', 'schedule', 'reports'];

interface ValidationResult {
  language: string;
  namespace: string;
  missingKeys: string[];
  extraKeys: string[];
}

function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys.sort();
}

function validateNamespace(namespace: string): ValidationResult[] {
  console.log(`\n📦 Validating namespace: ${namespace}`);
  
  const results: ValidationResult[] = [];
  const keysByLanguage: Record<string, string[]> = {};
  
  // Load all translations for this namespace
  LANGUAGES.forEach(lang => {
    const filePath = join(LOCALES_DIR, lang, `${namespace}.json`);
    try {
      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      keysByLanguage[lang] = getAllKeys(content);
    } catch (error) {
      console.error(`  ❌ Error reading ${lang}/${namespace}.json:`, error);
      results.push({
        language: lang,
        namespace,
        missingKeys: [],
        extraKeys: [],
      });
    }
  });
  
  // Use English as reference
  const referenceKeys = keysByLanguage['en'] || [];
  
  if (referenceKeys.length === 0) {
    console.warn(`  ⚠️  No keys found in English reference`);
    return results;
  }
  
  // Compare each language against English
  LANGUAGES.forEach(lang => {
    if (lang === 'en') return;
    
    const langKeys = keysByLanguage[lang] || [];
    const missingKeys = referenceKeys.filter(key => !langKeys.includes(key));
    const extraKeys = langKeys.filter(key => !referenceKeys.includes(key));
    
    if (missingKeys.length > 0 || extraKeys.length > 0) {
      results.push({
        language: lang,
        namespace,
        missingKeys,
        extraKeys,
      });
      
      console.log(`  ⚠️  ${lang}: ${missingKeys.length} missing, ${extraKeys.length} extra`);
    } else {
      console.log(`  ✓ ${lang}: All keys present`);
    }
  });
  
  return results;
}

function main() {
  console.log('🔍 Validating translations across all languages...');
  console.log(`Languages: ${LANGUAGES.join(', ')}`);
  console.log(`Namespaces: ${NAMESPACES.join(', ')}`);
  
  const allResults: ValidationResult[] = [];
  let hasErrors = false;
  
  // Validate each namespace
  NAMESPACES.forEach(namespace => {
    const results = validateNamespace(namespace);
    allResults.push(...results);
    
    if (results.length > 0) {
      hasErrors = true;
    }
  });
  
  // Print detailed report
  if (allResults.length > 0) {
    console.log('\n\n📋 Detailed Report:');
    console.log('='.repeat(60));
    
    allResults.forEach(result => {
      if (result.missingKeys.length > 0) {
        console.log(`\n❌ ${result.language}/${result.namespace}.json - Missing keys:`);
        result.missingKeys.forEach(key => console.log(`   - ${key}`));
      }
      
      if (result.extraKeys.length > 0) {
        console.log(`\n⚠️  ${result.language}/${result.namespace}.json - Extra keys:`);
        result.extraKeys.forEach(key => console.log(`   - ${key}`));
      }
    });
    
    console.log('\n' + '='.repeat(60));
  }
  
  // Summary
  const totalIssues = allResults.reduce((sum, r) => sum + r.missingKeys.length + r.extraKeys.length, 0);
  
  if (hasErrors) {
    console.log(`\n❌ Validation failed: ${totalIssues} issues found`);
    console.log('Please fix the missing/extra keys before proceeding.\n');
    process.exit(1);
  } else {
    console.log(`\n✅ All translations valid! All languages have matching keys.\n`);
    process.exit(0);
  }
}

// Run validation
try {
  main();
} catch (error) {
  console.error('Fatal error during validation:', error);
  process.exit(1);
}

