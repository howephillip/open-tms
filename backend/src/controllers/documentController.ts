// File: backend/src/controllers/documentController.ts
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import mongoose from 'mongoose';
import multer from 'multer';
import { Document as DocModel } from '../models/Document';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { S3Service } from '../services/s3Service'; // Import S3 Service

const s3Service = new S3Service();

// --- CHANGE: Use memory storage instead of disk storage ---
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 25 }, // 25MB limit
});

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
        logger.error('CRITICAL: No user context for upload and no default admin found.');
        res.status(500).json({ success: false, message: 'Cannot process upload: No user context.' });
        return;
    }

    try {
        const documentPromises = files.map(async (file) => {
            const { key, location } = await s3Service.uploadFile(file);
            return {
                filename: file.originalname,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                s3Key: key,
                s3Location: location,
                tags: tags ? String(tags).split(',').map(tag => tag.trim()).filter(Boolean) : [],
                relatedTo: {
                    type: relatedToType || 'general',
                    id: relatedToId && mongoose.Types.ObjectId.isValid(relatedToId) ? new mongoose.Types.ObjectId(relatedToId) : undefined
                },
                uploadedBy: new mongoose.Types.ObjectId(uploadedByUserId.toString()),
            };
        });

        const documentsToSave = await Promise.all(documentPromises);
        const savedDocuments = await DocModel.insertMany(documentsToSave);
        
        logger.info(`${savedDocuments.length} documents uploaded to S3 and saved to DB.`);
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
            res.status(400).json({ success: false, message: 'Invalid document ID.' });
            return;
        }
        const doc = await DocModel.findById(id).lean();
        if (!doc || !doc.s3Key) {
            res.status(404).json({ success: false, message: 'Document not found or path missing.' });
            return;
        }
        
        const signedUrl = await s3Service.getSignedUrl(doc.s3Key);
        logger.info(`Generated signed URL for document: ${doc.originalName}`);
        
        // Redirect the user's browser to the secure, temporary S3 URL
        res.redirect(302, signedUrl);

    } catch (error: any) {
        logger.error('Error getting signed URL for download:', { message: error.message, docId: id });
        res.status(500).json({ success: false, message: 'Could not generate download link.' });
    }
  }

  async deleteDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid document ID.' });
            return;
        }
        const doc = await DocModel.findByIdAndDelete(id);
        if (!doc) {
            res.status(404).json({ success: false, message: 'Document not found.' });
            return;
        }

        // Asynchronously delete from S3 after successfully deleting from DB
        s3Service.deleteFile(doc.s3Key).catch(err => {
            logger.error(`Failed to delete file from S3 bucket, but DB record was removed. Key: ${doc.s3Key}`, err);
        });

        logger.info(`Document metadata deleted from DB for ID: ${id}`);
        res.status(200).json({ success: true, message: 'Document deleted successfully.' });
    } catch (error: any) {
        logger.error('Error deleting document:', { message: error.message, docId: id });
        res.status(500).json({ success: false, message: 'Error deleting document.' });
    }
  }

  async getDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
    logger.info('Attempting to get documents. Query params:', req.query);
    try {
      const pageQuery = req.query.page as string | undefined;
      const limitQuery = req.query.limit as string | undefined;
      const { originalName, tags, relatedToType, relatedToId, sort = '-createdAt' } = req.query;

      const page = pageQuery ? parseInt(pageQuery, 10) : 1;
      const limit = limitQuery ? parseInt(limitQuery, 10) : 100;

      const query: any = {};
      if (originalName) query.originalName = { $regex: originalName, $options: 'i' };
      if (tags) query.tags = { $in: (tags as string).split(',') };
      if (relatedToType) query['relatedTo.type'] = relatedToType as string;
      if (relatedToId && mongoose.Types.ObjectId.isValid(relatedToId as string)) {
        query['relatedTo.id'] = new mongoose.Types.ObjectId(relatedToId as string);
      }

      const documents = await DocModel.find(query)
        .populate('uploadedBy', 'firstName lastName email')
        .sort(sort as string)
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      const total = await DocModel.countDocuments(query);
      logger.info(`Found ${documents.length} documents, total matching query: ${total}.`);

      res.status(200).json({
        success: true,
        message: "Documents fetched successfully",
        data: {
          documents,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
      });
    } catch (error: any) {
      logger.error('CRITICAL ERROR in getDocuments:', { message: error.message });
      res.status(500).json({ success: false, message: 'Error fetching documents', errorDetails: error.message });
    }
  }
}