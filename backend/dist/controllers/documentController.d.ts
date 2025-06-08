import { Response } from 'express';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import multer from 'multer';
export declare const upload: multer.Multer;
export declare class DocumentController {
    uploadDocuments(req: AuthenticatedRequest, res: Response): Promise<void>;
    getDocuments(req: AuthenticatedRequest, res: Response): Promise<void>;
    downloadDocument(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteDocument(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=documentController.d.ts.map