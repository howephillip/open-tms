import { Request, Response } from 'express';
export declare class ShipmentController {
    createShipment(req: Request, res: Response): Promise<void>;
    getShipments(req: Request, res: Response): Promise<void>;
    updateShipment(req: Request, res: Response): Promise<void>;
    getShipmentById(req: Request, res: Response): Promise<void>;
    addCheckIn(req: Request, res: Response): Promise<void>;
    generateStatusEmail(req: Request, res: Response): Promise<void>;
    updateShipmentTags(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=shipmentController.d.ts.map