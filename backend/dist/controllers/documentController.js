"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentController = exports.upload = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const Document_1 = require("../models/Document");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
const UPLOADS_DIR = path_1.default.join(__dirname, '../../../uploads');
if (!fs_1.default.existsSync(UPLOADS_DIR)) {
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
    logger_1.logger.info(`Uploads directory created at: ${UPLOADS_DIR}`);
}
else {
    logger_1.logger.info(`Uploads directory already exists at: ${UPLOADS_DIR}`);
}
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) { cb(null, UPLOADS_DIR); },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 25 },
    fileFilter: (req, file, cb) => { cb(null, true); }
});
class DocumentController {
    async uploadDocuments(req, res) {
        logger_1.logger.info('Attempting to upload documents. Body:', req.body, 'Files:', req.files);
        const files = req.files;
        if (!files || files.length === 0) {
            logger_1.logger.warn('No files were uploaded.');
            res.status(400).json({ success: false, message: 'No files were uploaded.' });
            return;
        }
        const { relatedToType, relatedToId, tags } = req.body;
        const uploadedByUserId = req.user?._id;
        if (relatedToType && relatedToType !== 'general' && !relatedToId) {
            logger_1.logger.warn('relatedToId is required when relatedToType is not general.');
            res.status(400).json({ success: false, message: `An ID for '${relatedToType}' must be provided.` });
            return;
        }
        if (relatedToId && !mongoose_1.default.Types.ObjectId.isValid(relatedToId)) {
            logger_1.logger.warn(`Invalid relatedToId format: ${relatedToId}`);
            res.status(400).json({ success: false, message: `Invalid ID format for '${relatedToType}'.` });
            return;
        }
        let finalUploadedBy = uploadedByUserId;
        if (!finalUploadedBy) {
            const defaultUser = await User_1.User.findOne({ role: 'admin' }).select('_id').lean();
            if (defaultUser) {
                finalUploadedBy = defaultUser._id; // This is an ObjectId
                logger_1.logger.info(`No authenticated user found, using default admin user: ${finalUploadedBy} for upload.`);
            }
            else {
                logger_1.logger.error('CRITICAL: No user available to associate with uploaded documents and no default admin user found.');
                files.forEach(file => fs_1.default.unlink(file.path, err => { if (err)
                    logger_1.logger.error(`Failed to delete orphaned file ${file.path}`, err); }));
                res.status(500).json({ success: false, message: 'Cannot process upload: No user context available.' });
                return;
            }
        }
        // Ensure finalUploadedBy is defined before proceeding
        if (!finalUploadedBy) {
            logger_1.logger.error('CRITICAL: finalUploadedBy became undefined unexpectedly before saving document metadata.');
            files.forEach(file => fs_1.default.unlink(file.path, err => { if (err)
                logger_1.logger.error(`Failed to delete orphaned file ${file.path}`, err); }));
            res.status(500).json({ success: false, message: 'Internal error: User context for upload became undefined.' });
            return;
        }
        try {
            const documentsToSave = files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path,
                tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
                relatedTo: relatedToType ? {
                    type: relatedToType,
                    id: relatedToId ? new mongoose_1.default.Types.ObjectId(relatedToId) : undefined
                } : { type: 'general' },
                uploadedBy: new mongoose_1.default.Types.ObjectId(finalUploadedBy.toString()), // finalUploadedBy is now guaranteed to be defined
            }));
            const savedDocuments = await Document_1.Document.insertMany(documentsToSave);
            logger_1.logger.info(`${savedDocuments.length} documents uploaded and saved successfully.`);
            res.status(201).json({
                success: true,
                message: `${savedDocuments.length} document(s) uploaded successfully.`,
                data: savedDocuments,
            });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in uploadDocuments (DB save):', { message: error.message, name: error.name, stack: error.stack, errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2) });
            files.forEach(file => { fs_1.default.unlink(file.path, (err) => { if (err)
                logger_1.logger.error(`Failed to delete orphaned file ${file.path} after DB error:`, err); }); });
            res.status(500).json({ success: false, message: 'Error saving document metadata.', errorDetails: error.message });
        }
    }
    async getDocuments(req, res) {
        logger_1.logger.info('Attempting to get documents. Query params:', req.query);
        try {
            const pageQuery = req.query.page;
            const limitQuery = req.query.limit;
            const { originalName, tags, relatedToType, relatedToId, sort = '-createdAt' } = req.query;
            const page = pageQuery ? parseInt(pageQuery, 10) : 1;
            const limit = limitQuery ? parseInt(limitQuery, 10) : 100;
            const query = {};
            if (originalName)
                query.originalName = { $regex: originalName, $options: 'i' };
            if (tags)
                query.tags = { $in: tags.split(',') };
            if (relatedToType)
                query['relatedTo.type'] = relatedToType;
            if (relatedToId && mongoose_1.default.Types.ObjectId.isValid(relatedToId)) {
                query['relatedTo.id'] = new mongoose_1.default.Types.ObjectId(relatedToId);
            }
            const documents = await Document_1.Document.find(query)
                .populate('uploadedBy', 'firstName lastName email')
                .sort(sort)
                .limit(limit)
                .skip((page - 1) * limit)
                .lean();
            const total = await Document_1.Document.countDocuments(query);
            logger_1.logger.info(`Found ${documents.length} documents, total matching query: ${total}.`);
            res.status(200).json({
                success: true,
                message: "Documents fetched successfully",
                data: {
                    documents,
                    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
                },
            });
        }
        catch (error) {
            logger_1.logger.error('CRITICAL ERROR in getDocuments:', { message: error.message });
            res.status(500).json({ success: false, message: 'Error fetching documents', errorDetails: error.message });
        }
    }
    async downloadDocument(req, res) {
        logger_1.logger.info(`Attempting to download document with ID: ${req.params.id}`);
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ success: false, message: 'Invalid document ID format.' });
                return;
            }
            const doc = await Document_1.Document.findById(id).lean();
            if (!doc || !doc.path) {
                res.status(404).json({ success: false, message: 'Document not found or path missing.' });
                return;
            }
            if (!fs_1.default.existsSync(doc.path)) {
                logger_1.logger.error(`File not found on disk for document ${id} at path: ${doc.path}`);
                res.status(404).json({ success: false, message: 'File not found on server.' });
                return;
            }
            logger_1.logger.info(`Streaming document: ${doc.originalName} from path: ${doc.path}`);
            res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);
            res.setHeader('Content-Type', doc.mimetype);
            res.download(doc.path, doc.originalName, (err) => {
                if (err) {
                    logger_1.logger.error(`Error during file download stream for doc ID ${id}:`, err);
                    if (!res.headersSent) {
                        res.status(500).send({ success: false, message: 'Could not download file.' });
                    }
                }
                else {
                    logger_1.logger.info(`Document ${doc.originalName} downloaded successfully.`);
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error in downloadDocument:', { message: error.message, stack: error.stack, id: req.params.id });
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Error processing download request.', errorDetails: error.message });
            }
        }
    }
    async deleteDocument(req, res) {
        logger_1.logger.info(`Attempting to delete document with ID: ${req.params.id}`);
        try {
            const { id } = req.params;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                res.status(400).json({ success: false, message: 'Invalid document ID format.' });
                return;
            }
            const doc = await Document_1.Document.findById(id);
            if (!doc) {
                res.status(404).json({ success: false, message: 'Document not found.' });
                return;
            }
            const filePath = doc.path;
            await Document_1.Document.findByIdAndDelete(id);
            logger_1.logger.info(`Document metadata deleted from DB for ID: ${id}`);
            if (filePath && fs_1.default.existsSync(filePath)) {
                fs_1.default.unlink(filePath, (err) => {
                    if (err) {
                        logger_1.logger.error(`Failed to delete file ${filePath} from disk for doc ID ${id}:`, err);
                    }
                    else {
                        logger_1.logger.info(`File ${filePath} deleted successfully from disk for doc ID: ${id}`);
                    }
                });
            }
            else {
                logger_1.logger.warn(`File path not found or file does not exist for deleted document ID ${id}: ${filePath}`);
            }
            res.status(200).json({ success: true, message: 'Document deleted successfully.' });
        }
        catch (error) {
            logger_1.logger.error('Error in deleteDocument:', { message: error.message, stack: error.stack, id: req.params.id });
            res.status(500).json({ success: false, message: 'Error deleting document.', errorDetails: error.message });
        }
    }
}
exports.DocumentController = DocumentController;
//# sourceMappingURL=documentController.js.map