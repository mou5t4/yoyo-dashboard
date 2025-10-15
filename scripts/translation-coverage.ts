#!/usr/bin/env tsx
/**
 * Translation Coverage Report
 * Generates a detailed report of translation completeness
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const LOCALES_DIR = join(process.cwd(), 'public', 'locales');
const LANGUAGES = ['en', 'es', 'de', 'fr', 'ar', 'it', 'zh', 'fa'];
const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  ar: 'العربية',
  it: 'Italiano',
  zh: '中文',
  fa: 'فارسی',
};
const NAMESPACES = ['common', 'auth', 'dashboard', 'settings', 'content', 'contacts', 'schedule', 'reports'];

interface CoverageStats {
  language: string;
  namespace: string;
  totalKeys: number;
  translatedKeys: number;
  coverage: number;
}

function countKeys(obj: any, prefix = ''): number {
  let count = 0;
  
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      count += countKeys(obj[key], prefix ? `${prefix}.${key}` : key);
    } else {
      count++;
    }
  }
  
  return count;
}

function calculateCoverage(): CoverageStats[] {
  const stats: CoverageStats[] = [];
  
  NAMESPACES.forEach(namespace => {
    const referenceFilePath = join(LOCALES_DIR, 'en', `${namespace}.json`);
    const referenceContent = JSON.parse(readFileSync(referenceFilePath, 'utf-8'));
    const totalKeys = countKeys(referenceContent);
    
    LANGUAGES.forEach(lang => {
      if (lang === 'en') {
        stats.push({
          language: lang,
          namespace,
          totalKeys,
          translatedKeys: totalKeys,
          coverage: 100,
        });
        return;
      }
      
      try {
        const filePath = join(LOCALES_DIR, lang, `${namespace}.json`);
        const content = JSON.parse(readFileSync(filePath, 'utf-8'));
        const translatedKeys = countKeys(content);
        const coverage = (translatedKeys / totalKeys) * 100;
        
        stats.push({
          language: lang,
          namespace,
          totalKeys,
          translatedKeys,
          coverage,
        });
      } catch (error) {
        stats.push({
          language: lang,
          namespace,
          totalKeys,
          translatedKeys: 0,
          coverage: 0,
        });
      }
    });
  });
  
  return stats;
}

function generateReport() {
  console.log('📊 Translation Coverage Report');
  console.log('='.repeat(70));
  console.log('');
  
  const stats = calculateCoverage();
  
  // Group by language
  const statsByLanguage: Record<string, CoverageStats[]> = {};
  stats.forEach(stat => {
    if (!statsByLanguage[stat.language]) {
      statsByLanguage[stat.language] = [];
    }
    statsByLanguage[stat.language].push(stat);
  });
  
  // Print coverage by language
  LANGUAGES.forEach(lang => {
    const langStats = statsByLanguage[lang] || [];
    const totalKeys = langStats.reduce((sum, s) => sum + s.totalKeys, 0);
    const translatedKeys = langStats.reduce((sum, s) => sum + s.translatedKeys, 0);
    const overallCoverage = (translatedKeys / totalKeys) * 100;
    
    const icon = overallCoverage === 100 ? '✅' : overallCoverage >= 80 ? '⚠️' : '❌';
    const langName = LANGUAGE_NAMES[lang as keyof typeof LANGUAGE_NAMES];
    
    console.log(`${icon} ${langName} (${lang}): ${overallCoverage.toFixed(1)}% (${translatedKeys}/${totalKeys})`);
    
    // Show namespace breakdown if not 100%
    if (overallCoverage < 100) {
      langStats.forEach(stat => {
        if (stat.coverage < 100) {
          console.log(`   └─ ${stat.namespace}: ${stat.coverage.toFixed(1)}% (${stat.translatedKeys}/${stat.totalKeys})`);
        }
      });
    }
  });
  
  console.log('');
  console.log('='.repeat(70));
  
  // Overall stats
  const totalKeys = stats.reduce((sum, s) => s.language === 'en' ? sum + s.totalKeys : sum, 0);
  const avgCoverage = stats
    .filter(s => s.language !== 'en')
    .reduce((sum, s) => sum + s.coverage, 0) / (LANGUAGES.length - 1);
  
  console.log('');
  console.log(`📈 Overall Statistics:`);
  console.log(`   Total Keys (English): ${totalKeys}`);
  console.log(`   Average Coverage (non-English): ${avgCoverage.toFixed(1)}%`);
  console.log(`   Languages: ${LANGUAGES.length}`);
  console.log(`   Namespaces: ${NAMESPACES.length}`);
  console.log('');
  
  // Recommendations
  if (avgCoverage === 100) {
    console.log('🎉 Perfect! All translations are complete.\n');
  } else if (avgCoverage >= 95) {
    console.log('👍 Great coverage! Just a few keys remaining.\n');
  } else if (avgCoverage >= 80) {
    console.log('⚠️  Good coverage, but some languages need attention.\n');
  } else {
    console.log('❌ Low coverage. Please complete missing translations.\n');
  }
}

try {
  generateReport();
} catch (error) {
  console.error('Error generating coverage report:', error);
  process.exit(1);
}


