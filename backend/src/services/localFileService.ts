import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class LocalFileService {
  // The 'upload' is handled by multer's diskStorage, so this service just confirms the result.
  public async uploadFile(file: Express.Multer.File): Promise<{ key: string; location: string }> {
    // For local strategy, key and location are the same: the file path.
    const filePath = file.path;
    logger.info(`File stored locally at: ${filePath}`);
    return Promise.resolve({ key: filePath, location: filePath });
  }

  // For local files, the 'URL' is just the API download route.
  public async getDownloadUrl(doc: any): Promise<string> {
    // This will resolve to something like: /api/documents/download/local/60b8...
    return Promise.resolve(`/api/documents/download/local/${doc._id}`);
  }

  public async deleteFile(key: string): Promise<void> {
    // Key is the full file path for local storage
    if (fs.existsSync(key)) {
      fs.unlink(key, (err) => {
        if (err) {
          logger.error(`Failed to delete local file at path: ${key}`, err);
        } else {
          logger.info(`Successfully deleted local file: ${key}`);
        }
      });
    } else {
      logger.warn(`Attempted to delete local file, but it was not found at path: ${key}`);
    }
  }

  public getFilePath(key: string): string {
    // For local files, the key IS the path. We just return it.
    return key;
  }
}