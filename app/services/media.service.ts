import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { parseFile } from 'music-metadata';
import { prisma } from '~/lib/db.server';
import { logger } from '~/lib/logger.server';

// Supported audio formats
export const SUPPORTED_FORMATS = [
  'audio/mpeg', // MP3
  'audio/mp4', // M4A
  'audio/aac', // AAC
  'audio/wav', // WAV
  'audio/ogg', // OGG
  'audio/flac', // FLAC
  'audio/opus', // OPUS
  'audio/x-m4a', // M4A alternative
];

export const UPLOAD_DIR = 'uploads/music';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  data: Buffer;
}

export interface MediaMetadata {
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
}

/**
 * Ensure upload directory exists
 */
export async function ensureUploadDir(): Promise<string> {
  const publicDir = join(process.cwd(), 'public', UPLOAD_DIR);
  
  if (!existsSync(publicDir)) {
    await mkdir(publicDir, { recursive: true });
  }
  
  return publicDir;
}

/**
 * Validate uploaded file
 */
export function validateFile(file: UploadedFile): { valid: boolean; error?: string } {
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file format. Supported formats: MP3, M4A, AAC, WAV, OGG, FLAC, OPUS`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}

/**
 * Extract metadata from audio file
 */
export async function extractMetadata(filePath: string): Promise<MediaMetadata> {
  try {
    const metadata = await parseFile(filePath);
    
    const title = metadata.common.title || 
                  filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 
                  'Unknown Title';
    
    return {
      title,
      artist: metadata.common.artist || metadata.common.albumartist,
      album: metadata.common.album,
      duration: metadata.format.duration,
    };
  } catch (error) {
    logger.error('Failed to extract metadata', error);
    // Return filename as title if metadata extraction fails
    return {
      title: filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown Title',
    };
  }
}

/**
 * Save uploaded file and create database record
 */
export async function saveMediaFile(file: UploadedFile): Promise<any> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const uploadDir = await ensureUploadDir();
  
  // Generate unique filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${timestamp}_${safeName}`;
  const filePath = join(uploadDir, filename);
  const relativeFilePath = `/${UPLOAD_DIR}/${filename}`;

  // Save file
  await writeFile(filePath, file.data);

  // Extract metadata
  const metadata = await extractMetadata(filePath);

  // Create database record
  const mediaFile = await prisma.mediaFile.create({
    data: {
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      duration: metadata.duration,
      fileSize: file.size,
      filePath: relativeFilePath,
      mimeType: file.type,
      originalName: file.name,
    },
  });

  logger.info('Media file saved', { id: mediaFile.id, title: metadata.title });
  return mediaFile;
}

/**
 * Get all media files with playlist information
 */
export async function getMediaLibrary() {
  return await prisma.mediaFile.findMany({
    include: {
      playlistItems: {
        include: {
          playlist: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Delete media file
 */
export async function deleteMediaFile(id: string) {
  const mediaFile = await prisma.mediaFile.findUnique({
    where: { id },
  });

  if (!mediaFile) {
    throw new Error('Media file not found');
  }

  // Delete physical file
  try {
    const filePath = join(process.cwd(), 'public', mediaFile.filePath);
    await unlink(filePath);
  } catch (error) {
    logger.warn('Failed to delete physical file', { path: mediaFile.filePath, error });
  }

  // Delete database record (cascade will handle playlist items)
  await prisma.mediaFile.delete({
    where: { id },
  });

  logger.info('Media file deleted', { id, title: mediaFile.title });
}

/**
 * Create new playlist
 */
export async function createPlaylist(name: string) {
  return await prisma.playlist.create({
    data: { name },
  });
}

/**
 * Get all playlists with their items
 */
export async function getPlaylists() {
  return await prisma.playlist.findMany({
    include: {
      items: {
        include: {
          media: true,
        },
        orderBy: {
          position: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Update playlist name
 */
export async function updatePlaylist(id: string, name: string) {
  return await prisma.playlist.update({
    where: { id },
    data: { name },
  });
}

/**
 * Delete playlist
 */
export async function deletePlaylist(id: string) {
  await prisma.playlist.delete({
    where: { id },
  });
  logger.info('Playlist deleted', { id });
}

/**
 * Add media file to playlist
 */
export async function addToPlaylist(playlistId: string, mediaId: string) {
  // Get current max position in playlist
  const maxPosition = await prisma.playlistItem.findFirst({
    where: { playlistId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const position = (maxPosition?.position ?? -1) + 1;

  return await prisma.playlistItem.create({
    data: {
      playlistId,
      mediaId,
      position,
    },
  });
}

/**
 * Remove media file from playlist
 */
export async function removeFromPlaylist(playlistId: string, mediaId: string) {
  await prisma.playlistItem.deleteMany({
    where: {
      playlistId,
      mediaId,
    },
  });
  logger.info('Media removed from playlist', { playlistId, mediaId });
}


