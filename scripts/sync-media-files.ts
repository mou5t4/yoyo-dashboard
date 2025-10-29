#!/usr/bin/env tsx
/**
 * Sync Media Files Script
 *
 * Scans the public/uploads/music directory and creates database entries
 * for any files that don't have a corresponding record in the database.
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { prisma } from '../app/lib/db.server';
import { extractMetadata, UPLOAD_DIR } from '../app/services/media.service';

async function syncMediaFiles() {
  console.log('🔍 Scanning uploads directory...');

  const uploadDir = join(process.cwd(), 'public', UPLOAD_DIR);

  try {
    const files = await readdir(uploadDir);
    console.log(`📁 Found ${files.length} files in ${UPLOAD_DIR}`);

    // Get all existing file paths from database
    const existingFiles = await prisma.mediaFile.findMany({
      select: { filePath: true }
    });

    const existingPaths = new Set(existingFiles.map(f => f.filePath));
    console.log(`💾 Found ${existingPaths.size} files in database`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const filename of files) {
      const filePath = join(uploadDir, filename);
      const relativeFilePath = `/${UPLOAD_DIR}/${filename}`;

      // Skip if already in database
      if (existingPaths.has(relativeFilePath)) {
        console.log(`⏭️  Skipping ${filename} (already in database)`);
        continue;
      }

      try {
        // Get file stats
        const stats = await stat(filePath);

        // Skip directories
        if (stats.isDirectory()) {
          continue;
        }

        console.log(`📝 Adding ${filename} to database...`);

        // Extract metadata
        const metadata = await extractMetadata(filePath);

        // Determine mime type from extension
        const ext = filename.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
          'mp3': 'audio/mpeg',
          'm4a': 'audio/mp4',
          'aac': 'audio/aac',
          'wav': 'audio/wav',
          'ogg': 'audio/ogg',
          'flac': 'audio/flac',
          'opus': 'audio/opus',
        };
        const mimeType = mimeTypes[ext || ''] || 'audio/mpeg';

        // Extract original name from filename (remove timestamp prefix)
        const originalName = filename.replace(/^\d+_/, '');

        // Create database record
        await prisma.mediaFile.create({
          data: {
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            duration: metadata.duration,
            fileSize: stats.size,
            filePath: relativeFilePath,
            mimeType: mimeType,
            originalName: originalName,
          },
        });

        console.log(`✅ Added ${filename} (${metadata.title})`);
        syncedCount++;
      } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`   Total files in folder: ${files.length}`);
    console.log(`   Already in database: ${existingPaths.size}`);
    console.log(`   Newly synced: ${syncedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('\n✨ Sync complete!');

  } catch (error) {
    console.error('❌ Error scanning directory:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncMediaFiles().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
