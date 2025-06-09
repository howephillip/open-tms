import { config } from '../config/database';
import multer from 'multer';
import path from 'path';

// Define a common interface that both services will adhere to
export interface IFileStorageService {
  uploadFile(file: Express.Multer.File): Promise<{ key: string; location: string }>;
  getDownloadUrl(doc: any): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFilePath?(key: string): string;
}

let storageService: IFileStorageService;
let multerStorage: multer.StorageEngine;

// --- LAZY INITIALIZATION ---
// We only import and instantiate the service we actually need.
if (config.fileStorageStrategy === 's3') {
  // Only require s3Service if we are using it
  const { S3Service } = require('./s3Service');
  storageService = new S3Service();
  // For S3, we process files in memory before uploading
  multerStorage = multer.memoryStorage();
} else {
  // Only require localFileService if we are using it
  const { LocalFileService } = require('./localFileService');
  storageService = new LocalFileService();
  // For local, we save directly to disk
  const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
  if (!require('fs').existsSync(UPLOADS_DIR)) {
      require('fs').mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  multerStorage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, UPLOADS_DIR); },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
  });
}

// Export the chosen service instance
export const fileService = storageService;

// Export the configured multer instance
export const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 1024 * 1024 * 25 }, // 25MB limit
});