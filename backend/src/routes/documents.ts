import { Router } from 'express';
import { DocumentController, upload } from '../controllers/documentController'; // Import controller and multer instance

const router = Router();
const documentController = new DocumentController();

// Use upload.array('files', 10) to accept up to 10 files under the field name 'files'
router.post('/upload', upload.array('files', 10), documentController.uploadDocuments);
router.get('/', documentController.getDocuments);
router.get('/download/:id', documentController.downloadDocument); // Download endpoint
router.delete('/:id', documentController.deleteDocument);
// router.patch('/:id/tags', documentController.updateDocumentTags); // Placeholder

// Fallback
router.all('/:id', (req, res) => res.status(405).json({ message: 'Method Not Allowed on this document resource.' }));
router.all('/', (req, res) => res.status(405).json({ message: 'Method Not Allowed on /documents.' }));

export { router as documentRoutes };