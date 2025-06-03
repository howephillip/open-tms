import mongoose, { Document } from 'mongoose';
export interface IReferenceNumber {
    type: string;
    value: string;
    _id?: mongoose.Types.ObjectId;
}
type ShipmentStatusType = 'quote' | 'booked' | 'dispatched' | 'at_pickup' | 'picked_up' | 'in_transit_origin_drayage' | 'at_origin_port_ramp' | 'in_transit_main_leg' | 'at_destination_port_ramp' | 'in_transit_destination_drayage' | 'at_delivery' | 'delivered' | 'pod_received' | 'invoiced' | 'paid' | 'cancelled' | 'on_hold' | 'problem';
export interface IQuoteAccessorial {
    accessorialTypeId: mongoose.Types.ObjectId;
    name?: string;
    quantity?: number;
    customerRate: number;
    carrierCost: number;
    notes?: string;
    _id?: mongoose.Types.ObjectId;
}
export interface IShipment extends Document {
    shipmentNumber: string;
    billOfLadingNumber?: string;
    proNumber?: string;
    deliveryOrderNumber?: string;
    bookingNumber?: string;
    containerNumber?: string;
    sealNumber?: string;
    pickupNumber?: string;
    proofOfDeliveryNumber?: string;
    purchaseOrderNumbers?: string[];
    otherReferenceNumbers?: IReferenceNumber[];
    fscType?: 'fixed' | 'percentage' | '';
    fscCustomerAmount?: number;
    fscCarrierAmount?: number;
    accessorials?: IQuoteAccessorial[];
    quoteNotes?: string;
    quoteValidUntil?: Date;
    quotedBy?: mongoose.Types.ObjectId;
    shipper: mongoose.Types.ObjectId;
    carrier: mongoose.Types.ObjectId;
    consignee?: {
        name?: string;
        address?: string;
        contactName?: string;
        contactPhone?: string;
        contactEmail?: string;
    };
    billTo?: mongoose.Types.ObjectId;
    modeOfTransport: 'truckload-ftl' | 'truckload-ltl' | 'drayage-import' | 'drayage-export' | 'intermodal-rail' | 'ocean-fcl' | 'ocean-lcl' | 'air-freight' | 'expedited-ground' | 'final-mile' | 'other';
    steamshipLine?: string;
    vesselName?: string;
    voyageNumber?: string;
    terminal?: string;
    lastFreeDayPort?: Date;
    lastFreeDayRail?: Date;
    emptyReturnDepot?: string;
    emptyContainerReturnByDate?: Date;
    chassisNumber?: string;
    chassisType?: string;
    chassisProvider?: string;
    chassisReturnByDate?: Date;
    railOriginRamp?: string;
    railDestinationRamp?: string;
    railCarrier?: string;
    airline?: string;
    flightNumber?: string;
    masterAirWaybill?: string;
    houseAirWaybill?: string;
    airportOfDeparture?: string;
    airportOfArrival?: string;
    isTransload?: boolean;
    transloadFacility?: {
        name?: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
    };
    transloadDate?: Date;
    origin: {
        name?: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        country?: string;
        locationType?: string;
        contactName?: string;
        contactPhone?: string;
        contactEmail?: string;
        notes?: string;
    };
    destination: {
        name?: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        country?: string;
        locationType?: string;
        contactName?: string;
        contactPhone?: string;
        contactEmail?: string;
        notes?: string;
    };
    scheduledPickupDate: Date;
    scheduledPickupTime?: string;
    pickupAppointmentNumber?: string;
    actualPickupDateTime?: Date;
    scheduledDeliveryDate: Date;
    scheduledDeliveryTime?: string;
    deliveryAppointmentNumber?: string;
    actualDeliveryDateTime?: Date;
    status: ShipmentStatusType;
    equipmentType: string;
    equipmentLength?: number;
    equipmentUnit?: 'ft' | 'm';
    commodityDescription: string;
    pieceCount?: number;
    packageType?: string;
    totalWeight?: number;
    weightUnit?: 'lbs' | 'kg';
    isHazardous?: boolean;
    unNumber?: string;
    hazmatClass?: string;
    isTemperatureControlled?: boolean;
    temperatureMin?: number;
    temperatureMax?: number;
    tempUnit?: 'C' | 'F';
    customerRate: number;
    carrierCostTotal: number;
    grossProfit?: number;
    margin?: number;
    totalCustomerRate?: number;
    totalCarrierCost?: number;
    internalNotes?: string;
    specialInstructions?: string;
    customTags?: string[];
    checkIns?: [
        {
            dateTime: Date;
            method: string;
            contactPerson?: string;
            currentLocation?: string;
            notes: string;
            statusUpdate?: IShipment['status'];
            createdBy: mongoose.Types.ObjectId;
            _id?: mongoose.Types.ObjectId;
        }
    ];
    documents?: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
}
export declare const Shipment: mongoose.Model<IShipment, {}, {}, {}, mongoose.Document<unknown, {}, IShipment> & IShipment & {
    _id: mongoose.Types.ObjectId;
}, any>;
export {};
//# sourceMappingURL=Shipment.d.ts.map