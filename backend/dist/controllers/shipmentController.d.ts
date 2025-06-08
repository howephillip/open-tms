import { Response } from 'express';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
export declare class ShipmentController {
    createShipment(req: AuthenticatedRequest, res: Response): Promise<void>;
    getShipments(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateShipment(req: AuthenticatedRequest, res: Response): Promise<void>;
    getShipmentById(req: AuthenticatedRequest, res: Response): Promise<void>;
    addCheckIn(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteShipment(req: AuthenticatedRequest, res: Response): Promise<void>;
    generateStatusEmail(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateShipmentTags(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=shipmentController.d.ts.map