"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const Shipment_1 = require("../models/Shipment"); // Import IShipment
const Carrier_1 = require("../models/Carrier");
const Shipper_1 = require("../models/Shipper");
const logger_1 = require("../utils/logger");
const moment_1 = __importDefault(require("moment"));
class DashboardController {
    async getKPIs(req, res) {
        logger_1.logger.info('Fetching KPIs for dashboard');
        try {
            const totalShipments = await Shipment_1.Shipment.countDocuments();
            const realizedShipmentStatuses = ['delivered', 'invoiced', 'paid']; // Use IShipment
            const financialAgg = await Shipment_1.Shipment.aggregate([
                { $match: { status: { $in: realizedShipmentStatuses } } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$customerRate' },
                        totalCost: { $sum: '$carrierCostTotal' },
                    }
                }
            ]);
            let totalRevenue = 0;
            let totalCost = 0;
            if (financialAgg.length > 0 && financialAgg[0]) { // Added check for financialAgg[0]
                totalRevenue = financialAgg[0].totalRevenue || 0;
                totalCost = financialAgg[0].totalCost || 0;
            }
            const grossProfit = totalRevenue - totalCost;
            const averageMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
            const totalCarriers = await Carrier_1.Carrier.countDocuments({ isActive: true });
            const totalShippers = await Shipper_1.Shipper.countDocuments();
            res.status(200).json({
                success: true,
                data: {
                    totalShipments,
                    totalRevenue,
                    grossProfit,
                    averageMargin: parseFloat(averageMargin.toFixed(2)),
                    totalCarriers,
                    totalShippers,
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching KPIs for dashboard:', { message: error.message, stack: error.stack });
            res.status(500).json({ success: false, message: 'Error fetching dashboard KPIs', errorDetails: error.message });
        }
    }
    async getRevenueProfitTrends(req, res) {
        logger_1.logger.info('Fetching revenue/profit trends for dashboard');
        try {
            const months = 6;
            const monthlyData = [];
            const realizedShipmentStatuses = ['delivered', 'invoiced', 'paid']; // Use IShipment
            for (let i = months - 1; i >= 0; i--) {
                const targetMonth = (0, moment_1.default)().subtract(i, 'months');
                const monthName = targetMonth.format('MMM');
                const year = targetMonth.year();
                const startOfMonth = targetMonth.startOf('month').toDate();
                const endOfMonth = targetMonth.endOf('month').toDate();
                const aggResult = await Shipment_1.Shipment.aggregate([
                    {
                        $match: {
                            status: { $in: realizedShipmentStatuses },
                            scheduledDeliveryDate: {
                                $gte: startOfMonth,
                                $lte: endOfMonth
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: '$customerRate' },
                            totalCost: { $sum: '$carrierCostTotal' }
                        }
                    }
                ]);
                let revenue = 0;
                let cost = 0;
                if (aggResult.length > 0 && aggResult[0]) {
                    revenue = aggResult[0].totalRevenue || 0;
                    cost = aggResult[0].totalCost || 0;
                }
                monthlyData.push({
                    month: `${monthName} '${year.toString().slice(-2)}`,
                    year: year,
                    revenue: revenue,
                    profit: revenue - cost
                });
            }
            res.status(200).json({ success: true, data: { trends: monthlyData } });
        }
        catch (error) {
            logger_1.logger.error('Error fetching revenue/profit trends:', { message: error.message, stack: error.stack });
            res.status(500).json({ success: false, message: 'Error fetching trends data', errorDetails: error.message });
        }
    }
    async getShipmentStatusDistribution(req, res) {
        logger_1.logger.info('Fetching shipment status distribution for dashboard');
        try {
            const statusDistribution = await Shipment_1.Shipment.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: '$_id',
                        value: '$count'
                    }
                },
                {
                    $sort: { value: -1 }
                }
            ]);
            res.status(200).json({ success: true, data: { distribution: statusDistribution } });
        }
        catch (error) {
            logger_1.logger.error('Error fetching shipment status distribution:', { message: error.message, stack: error.stack });
            res.status(500).json({ success: false, message: 'Error fetching status distribution', errorDetails: error.message });
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=dashboardController.js.map