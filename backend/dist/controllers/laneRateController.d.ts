import { Response } from 'express';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
export declare class LaneRateController {
    getLaneRateSummary(req: AuthenticatedRequest, res: Response): Promise<void>;
    getLaneRateDetail(req: AuthenticatedRequest, res: Response): Promise<void>;
    getLaneRatesByCarrier(req: AuthenticatedRequest, res: Response): Promise<void>;
    createManualLaneRate(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateManualLaneRate(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteLaneRate(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=laneRateController.d.ts.map