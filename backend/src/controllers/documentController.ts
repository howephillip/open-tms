import { Response } from 'express';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { Document as DocModel } from '../models/Document';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { fileService, upload } from '../services/fileService'; // Import from our new fileService
import { config } from '../config/database';

export { upload }; // Re-export multer instance for use in routes

export class DocumentController {
  async uploadDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files were uploaded.' });
      return;
    }

    const { relatedToType, relatedToId, tags } = req.body;
    const uploadedByUserId = req.user?._id || (await User.findOne({ role: 'admin' }).select('_id').lean())?._id;

    if (!uploadedByUserId) {
        res.status(500).json({ success: false, message: 'Cannot process upload: No user context.' });
        return;
    }

    try {
        const documentPromises = files.map(async (file) => {
            const { key, location } = await fileService.uploadFile(file);
            return {
                filename: file.filename || path.basename(key), // Use multer filename for local, S3 key for S3
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                s3Key: key, // We'll use this field for both S3 key and local path
                s3Location: location,
                tags: tags ? String(tags).split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
                relatedTo: {
                    type: relatedToType || 'general',
                    id: relatedToId && mongoose.Types.ObjectId.isValid(relatedToId) ? new mongoose.Types.ObjectId(relatedToId) : undefined
                },
                uploadedBy: new mongoose.Types.ObjectId(uploadedByUserId.toString()),
            };
        });

        const documentsToSave = await Promise.all(documentPromises);
        const savedDocuments = await DocModel.insertMany(documentsToSave);
        
        logger.info(`${savedDocuments.length} document(s) uploaded via ${config.fileStorageStrategy} strategy.`);
        res.status(201).json({ success: true, message: `${savedDocuments.length} document(s) uploaded.`, data: savedDocuments });

    } catch (error: any) {
        logger.error('Error during document upload process:', { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Error processing file upload.', errorDetails: error.message });
    }
  }

  async downloadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid document ID.' });
        }
        const doc = await DocModel.findById(id).lean();
        if (!doc || !doc.s3Key) {
            return res.status(404).json({ success: false, message: 'Document not found or path missing.' });
        }

        // --- THE FIX IS HERE ---
        // We now use the generic fileService regardless of the strategy.
        if (config.fileStorageStrategy === 's3') {
            const signedUrl = await fileService.getDownloadUrl(doc);
            logger.info(`Redirecting to S3 signed URL for document: ${doc.originalName}`);
            res.redirect(302, signedUrl);
        } else {
            // For local strategy, we still need to stream the file from disk.
            const filePath = doc.s3Key; // For local, the key is the path
            if (!fs.existsSync(filePath)) {
                logger.error(`File not found on disk for document ${id} at path: ${filePath}`);
                return res.status(404).json({ success: false, message: 'File not found on server.' });
            }
            logger.info(`Streaming local file: ${doc.originalName} from path: ${filePath}`);
            res.download(filePath, doc.originalName);
        }
    } catch (error: any) {
        logger.error('Error in downloadDocument:', { message: error.message, docId: id });
        res.status(500).json({ success: false, message: 'Could not process download.' });
    }
  }

  async deleteDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info(`Attempting to delete document with ID: ${id}`);
    
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid document ID.' });
        }

        const doc = await DocModel.findById(id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Document not found in database.' });
        }

        // Step 1: Attempt to delete the file from the storage provider (S3 or local)
        await fileService.deleteFile(doc.s3Key);
        logger.info(`Successfully deleted file from storage. Key: ${doc.s3Key}`);

        // Step 2: Only if file deletion is successful, delete the database record.
        await DocModel.findByIdAndDelete(id);
        logger.info(`Successfully deleted document record from database for ID: ${id}`);

        res.status(200).json({ success: true, message: 'Document deleted successfully.' });

    } catch (error: any) {
        logger.error('Error during document deletion process:', { message: error.message, docId: id });
        // If the error came from fileService, the DB record is likely still there, which is safe.
        res.status(500).json({ success: false, message: 'Error deleting document.', errorDetails: error.message });
    }
  }
  
  async getDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
    logger.info('Attempting to get documents. Query params:', req.query);
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const sort = (req.query.sort as string) || '-createdAt';
      const { originalName, tags, relatedToType, relatedToId } = req.query;

      const query: any = {};
      if (originalName) query.originalName = { $regex: originalName, $options: 'i' };
      if (tags) query.tags = { $in: (tags as string).split(',') };
      if (relatedToType) query['relatedTo.type'] = relatedToType as string;
      if (relatedToId && mongoose.Types.ObjectId.isValid(relatedToId as string)) {
        query['relatedTo.id'] = new mongoose.Types.ObjectId(relatedToId as string);
      }

      const documents = await DocModel.find(query)
        .populate('uploadedBy', 'firstName lastName email')
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      const total = await DocModel.countDocuments(query);
      
      logger.info(`Found ${documents.length} documents, total matching query: ${total}.`);

      // --- SIMPLIFIED RESPONSE ---
      res.status(200).json({
        success: true,
        documents: documents, // Send documents at the top level of the data object
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error: any) {
      logger.error('CRITICAL ERROR in getDocuments:', { message: error.message });
      res.status(500).json({ success: false, message: 'Error fetching documents' });
    }
  }
}