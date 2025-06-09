import { Router } from 'express';
import { DocumentController, upload } from '../controllers/documentController'; // Import from controller

const router = Router();
const documentController = new DocumentController();

router.post('/upload', upload.array('files', 10), documentController.uploadDocuments);
router.get('/', documentController.getDocuments);
router.get('/download/:id', documentController.downloadDocument);
router.delete('/:id', documentController.deleteDocument);

export { router as documentRoutes };