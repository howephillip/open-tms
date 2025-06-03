import { Request, Response } from 'express';
import multer from 'multer';
export declare const upload: multer.Multer;
export declare class DocumentController {
    uploadDocuments(req: Request, res: Response): Promise<void>;
    getDocuments(req: Request, res: Response): Promise<void>;
    downloadDocument(req: Request, res: Response): Promise<void>;
    deleteDocument(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=documentController.d.ts.map