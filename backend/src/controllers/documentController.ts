import { Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Document as DocModel, IDocument } from '../models/Document'; // Renamed to avoid conflict
import { User } from '../models/User'; // Assuming uploadedBy refers to User
import { logger } from '../utils/logger';

// --- Multer Configuration ---
// Ensure the uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../../uploads'); // Store uploads in project_root/uploads
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  logger.info(`Uploads directory created at: ${UPLOADS_DIR}`);
} else {
  logger.info(`Uploads directory already exists at: ${UPLOADS_DIR}`);
}


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // You can create subdirectories based on relatedToType or date if needed
    // For now, all go into UPLOADS_DIR
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Create a unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_')); // Replace spaces
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Basic file type filter (customize as needed)
  // const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'];
  // if (allowedMimes.includes(file.mimetype)) {
  //   cb(null, true);
  // } else {
  //   cb(new Error('Invalid file type. Only specific image/document types are allowed.'));
  // }
  cb(null, true); // Allow all files for now
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 25 }, // 25MB limit per file
  fileFilter: fileFilter
});
// --- End Multer Configuration ---


export class DocumentController {
  // --- UPLOAD one or more documents ---
  // Use upload.array('files', 10) for multiple files (up to 10)
  // Use upload.single('file') for a single file
  async uploadDocuments(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to upload documents. Body:', req.body, 'Files:', req.files);

    // req.files will be an array of files if using upload.array()
    // req.file will be a single file object if using upload.single()
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      logger.warn('No files were uploaded.');
      res.status(400).json({ success: false, message: 'No files were uploaded.' });
      return;
    }

    const { relatedToType, relatedToId, tags } = req.body;
    const uploadedByUserId = (req.user as any)?._id; // Assuming req.user is populated by auth middleware

    // Basic validation for relatedTo fields
    if (relatedToType && relatedToType !== 'general' && !relatedToId) {
        logger.warn('relatedToId is required when relatedToType is not general.');
        res.status(400).json({ success: false, message: `An ID for '${relatedToType}' must be provided.` });
        return;
    }
    if (relatedToId && !mongoose.Types.ObjectId.isValid(relatedToId)) {
        logger.warn(`Invalid relatedToId format: ${relatedToId}`);
        res.status(400).json({ success: false, message: `Invalid ID format for '${relatedToType}'.` });
        return;
    }

    // Find a default user if not authenticated or uploadedBy not provided
    let finalUploadedBy = uploadedByUserId;
    if (!finalUploadedBy) {
        // This is a fallback, ideally user should be authenticated
        const defaultUser = await User.findOne({ role: 'admin' }).select('_id');
        if (defaultUser) {
            finalUploadedBy = defaultUser._id;
            logger.info(`No authenticated user found, using default admin user: ${finalUploadedBy} for upload.`);
        } else {
            logger.error('CRITICAL: No user available to associate with uploaded documents and no default admin user found.');
            // Clean up uploaded files if we can't save DB record
            files.forEach(file => fs.unlink(file.path, err => { if (err) logger.error(`Failed to delete orphaned file ${file.path}`, err);}));
            res.status(500).json({ success: false, message: 'Cannot process upload: No user context available.' });
            return;
        }
    }


    try {
      const documentsToSave: Partial<IDocument>[] = files.map(file => ({
        filename: file.filename, // Name on disk
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path, // Full path on disk where multer saved it
        tags: tags ? (tags as string).split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        relatedTo: relatedToType ? {
          type: relatedToType as IDocument['relatedTo']['type'],
          id: relatedToId ? new mongoose.Types.ObjectId(relatedToId) : undefined
        } : { type: 'general' },
        uploadedBy: finalUploadedBy,
      }));

      const savedDocuments = await DocModel.insertMany(documentsToSave);
      logger.info(`${savedDocuments.length} documents uploaded and saved successfully.`);

      res.status(201).json({
        success: true,
        message: `${savedDocuments.length} document(s) uploaded successfully.`,
        data: savedDocuments,
      });
    } catch (error: any) {
      logger.error('CRITICAL ERROR in uploadDocuments (DB save):', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      });
      // If DB save fails, try to clean up uploaded files
      files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) logger.error(`Failed to delete orphaned file ${file.path} after DB error:`, err);
        });
      });
      res.status(500).json({ success: false, message: 'Error saving document metadata.', errorDetails: error.message });
    }
  }

  // --- GET all documents (metadata) ---
  async getDocuments(req: Request, res: Response): Promise<void> {
    logger.info('Attempting to get documents. Query params:', req.query);
    try {
      const pageQuery = req.query.page as string | undefined;
      const limitQuery = req.query.limit as string | undefined;
      const { originalName, tags, relatedToType, relatedToId, sort = '-createdAt' } = req.query; // Default sort by newest

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
        .populate('uploadedBy', 'firstName lastName email') // Populate user info
        // Potentially populate relatedTo.id based on relatedTo.type if needed (more complex)
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
      logger.error('CRITICAL ERROR in getDocuments:', { /* ... */ });
      res.status(500).json({ success: false, message: 'Error fetching documents', errorDetails: error.message });
    }
  }

  // --- DOWNLOAD a document ---
  async downloadDocument(req: Request, res: Response): Promise<void> {
    logger.info(`Attempting to download document with ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid document ID format.' });
            return;
        }
        const doc = await DocModel.findById(id).lean();
        if (!doc || !doc.path) {
            res.status(404).json({ success: false, message: 'Document not found or path missing.' });
            return;
        }

        // Check if file exists at doc.path
        if (!fs.existsSync(doc.path)) {
            logger.error(`File not found on disk for document ${id} at path: ${doc.path}`);
            res.status(404).json({ success: false, message: 'File not found on server.' });
            return;
        }
        
        logger.info(`Streaming document: ${doc.originalName} from path: ${doc.path}`);
        // Set headers to prompt download with original name
        res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);
        res.setHeader('Content-Type', doc.mimetype);
        res.download(doc.path, doc.originalName, (err) => {
            if (err) {
                logger.error(`Error during file download stream for doc ID ${id}:`, err);
                // Avoid sending another response if headers already sent
                if (!res.headersSent) {
                    res.status(500).send({ success: false, message: 'Could not download file.'});
                }
            } else {
                 logger.info(`Document ${doc.originalName} downloaded successfully.`);
            }
        });

    } catch (error: any) {
        logger.error('Error in downloadDocument:', { message: error.message, stack: error.stack, id: req.params.id });
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error processing download request.', errorDetails: error.message });
        }
    }
  }

  // --- DELETE a document (metadata and file) ---
  async deleteDocument(req: Request, res: Response): Promise<void> {
    logger.info(`Attempting to delete document with ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid document ID format.' });
            return;
        }
        const doc = await DocModel.findById(id);
        if (!doc) {
            res.status(404).json({ success: false, message: 'Document not found.' });
            return;
        }

        const filePath = doc.path; // Path to the file on disk
        await DocModel.findByIdAndDelete(id); // Delete metadata from DB
        logger.info(`Document metadata deleted from DB for ID: ${id}`);

        // Attempt to delete file from disk
        if (filePath && fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) {
                    logger.error(`Failed to delete file ${filePath} from disk for doc ID ${id}:`, err);
                    // Don't fail the whole operation if file deletion fails, but log it
                } else {
                    logger.info(`File ${filePath} deleted successfully from disk for doc ID: ${id}`);
                }
            });
        } else {
            logger.warn(`File path not found or file does not exist for deleted document ID ${id}: ${filePath}`);
        }
        
        res.status(200).json({ success: true, message: 'Document deleted successfully.' });
    } catch (error: any) {
        logger.error('Error in deleteDocument:', { message: error.message, stack: error.stack, id: req.params.id });
        res.status(500).json({ success: false, message: 'Error deleting document.', errorDetails: error.message });
    }
  }
  
  // TODO: Implement updateDocumentTags (similar to shipmentController)
}