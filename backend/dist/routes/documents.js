"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentRoutes = void 0;
const express_1 = require("express");
const documentController_1 = require("../controllers/documentController"); // Import controller and multer instance
const router = (0, express_1.Router)();
exports.documentRoutes = router;
const documentController = new documentController_1.DocumentController();
// Use upload.array('files', 10) to accept up to 10 files under the field name 'files'
router.post('/upload', documentController_1.upload.array('files', 10), documentController.uploadDocuments);
router.get('/', documentController.getDocuments);
router.get('/download/:id', documentController.downloadDocument); // Download endpoint
router.delete('/:id', documentController.deleteDocument);
// router.patch('/:id/tags', documentController.updateDocumentTags); // Placeholder
// Fallback
router.all('/:id', (req, res) => res.status(405).json({ message: 'Method Not Allowed on this document resource.' }));
router.all('/', (req, res) => res.status(405).json({ message: 'Method Not Allowed on /documents.' }));
//# sourceMappingURL=documents.js.map