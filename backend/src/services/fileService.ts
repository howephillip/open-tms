import { config } from '../config/database';
import { S3Service } from './s3Service';
import { LocalFileService } from './localFileService';

// Define a common interface that both services will adhere to
interface IFileStorageService {
  uploadFile(file: Express.Multer.File): Promise<{ key: string; location: string }>;
  getDownloadUrl(doc: any): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFilePath?(key: string): string; // Optional for S3, required for local
}

let storageService: IFileStorageService;

if (config.fileStorageStrategy === 's3') {
  storageService = new S3Service();
} else {
  storageService = new LocalFileService();
}

export const fileService = storageService;

// We also need to export multer configured with the right storage
import multer from 'multer';
import path from 'path';

let multerStorage: multer.StorageEngine;

if (config.fileStorageStrategy === 's3') {
  // For S3, we process files in memory before uploading
  multerStorage = multer.memoryStorage();
} else {
  // For local, we save directly to disk
  const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
  multerStorage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, UPLOADS_DIR); },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
  });
}

export const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 1024 * 1024 * 25 }, // 25MB limit
});