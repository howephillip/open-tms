// File: frontend/src/pages/shipments/utils/shipmentFormMappers.ts
import { 
    Shipment, // Assuming full Shipment interface is available from a shared types file or defined appropriately
    ShipmentFormDataForDialog, 
    QuoteFormData,
    ModeOfTransportType,
    StatusType,
    LocationType,
    EquipmentUnitType,
    WeightUnitType,
    TempUnitType,
    IReferenceNumberFE,
    IDocumentStubFE
} from '../ShipmentsPage'; // Adjust path if types are moved

// If Shipment interface is not exported from ShipmentsPage, you'd need to define it here or import from a central types file.
// For brevity, I'll assume it's accessible for now.

export const formatDateForInput = (dateString?: string | Date): string => { 
    if (!dateString) return ''; 
    try { const date = new Date(dateString); return date.toISOString().split('T')[0]; } catch (e) { return ''; }
};
export const formatDateTimeForInput = (dateTimeString?: string | Date): string => { 
    if (!dateTimeString) return ''; 
    try { const date = new Date(dateTimeString); return date.toISOString().substring(0, 16);} catch (e) {return '';}
};

export const initialShipmentFormData: ShipmentFormDataForDialog = { 
  _id: undefined, shipmentNumber: '', shipper: '', carrier: '',
  modeOfTransport: 'truckload-ftl', billOfLadingNumber: '', proNumber: '', deliveryOrderNumber: '', bookingNumber: '',
  containerNumber: '', sealNumber: '', pickupNumber: '', proofOfDeliveryNumber: '',
  purchaseOrderNumbers: '', otherReferenceNumbersString: '',
  steamshipLine: '', vesselName: '', voyageNumber: '', terminal: '',
  lastFreeDayPort: '', lastFreeDayRail: '', emptyReturnDepot: '', emptyContainerReturnByDate: '',
  chassisNumber: '', chassisType: '', chassisProvider: '', chassisReturnByDate: '',
  railOriginRamp: '', railDestinationRamp: '', railCarrier: '',
  airline: '', flightNumber: '', masterAirWaybill: '', houseAirWaybill: '', airportOfDeparture: '', airportOfArrival: '',
  isTransload: false, transloadFacilityName: '', transloadFacilityAddress: '', transloadFacilityCity: '', transloadFacilityState: '', transloadFacilityZip: '', transloadDate: '',
  originName: '', originAddress: '', originCity: '', originState: '', originZip: '', originCountry: 'USA', originLocationType: 'shipper_facility', originContactName: '', originContactPhone: '', originContactEmail: '', originNotes: '',
  destinationName: '', destinationAddress: '', destinationCity: '', destinationState: '', destinationZip: '', destinationCountry: 'USA', destinationLocationType: 'consignee_facility', destinationContactName: '', destinationContactPhone: '', destinationContactEmail: '', destinationNotes: '',
  scheduledPickupDate: '', scheduledPickupTime: '', pickupAppointmentNumber: '', actualPickupDateTime: '',
  scheduledDeliveryDate: '', scheduledDeliveryTime: '', deliveryAppointmentNumber: '', actualDeliveryDateTime: '',
  status: 'booked', equipmentType: '', equipmentLength: '', equipmentUnit: 'ft',
  commodityDescription: '', pieceCount: '', packageType: '', totalWeight: '', weightUnit: 'lbs',
  isHazardous: false, unNumber: '', hazmatClass: '', isTemperatureControlled: false, temperatureMin: '', temperatureMax: '', tempUnit: 'C',
  customerRate: '', carrierCostTotal: '', internalNotes: '', specialInstructions: '', customTags: '',
  documentIds: [], attachedDocuments: [],
};

export const initialQuoteFormData: QuoteFormData = {
  status: 'quote', shipper: '', carrier: '', modeOfTransport: 'truckload-ftl', equipmentType: '',
  originCity: '', originState: '', originZip: '', originLocationType: 'shipper_facility', originAddress: '',
  destinationCity: '', destinationState: '', destinationZip: '', destinationLocationType: 'consignee_facility', destinationAddress: '',
  scheduledPickupDate: '', scheduledDeliveryDate: '',
  commodityDescription: '', totalWeight: '', pieceCount: '',
  customerRate: '0', carrierCostTotal: '0',
  accessorials: [],
  quoteNotes: '', quoteValidUntil: '', purchaseOrderNumbers: '',
  _id: undefined, quoteNumber: '', billOfLadingNumber: '', proNumber: '', deliveryOrderNumber: '', bookingNumber: '',
  containerNumber: '', sealNumber: '', pickupNumber: '', proofOfDeliveryNumber: '', otherReferenceNumbersString: '',
  steamshipLine: '', vesselName: '', voyageNumber: '', terminal: '',
  lastFreeDayPort: '', lastFreeDayRail: '', emptyReturnDepot: '', emptyContainerReturnByDate: '',
  chassisNumber: '', chassisType: '', chassisProvider: '', chassisReturnByDate: '',
  railOriginRamp: '', railDestinationRamp: '', railCarrier: '',
  airline: '', flightNumber: '', masterAirWaybill: '', houseAirWaybill: '', airportOfDeparture: '', airportOfArrival: '',
  isTransload: false, transloadFacilityName: '', transloadFacilityAddress: '', transloadFacilityCity: '', transloadFacilityState: '', transloadFacilityZip: '', transloadDate: '',
  documentIds: [], attachedDocuments: [],
};


export const mapShipmentToShipmentFormData = (shipment: Shipment): ShipmentFormDataForDialog => {
    return {
        _id: shipment._id, shipmentNumber: shipment.shipmentNumber || '',
        shipper: typeof shipment.shipper === 'object' ? shipment.shipper?._id || '' : shipment.shipper || '',
        carrier: typeof shipment.carrier === 'object' ? shipment.carrier?._id || '' : shipment.carrier || '',
        modeOfTransport: shipment.modeOfTransport || 'truckload-ftl', billOfLadingNumber: shipment.billOfLadingNumber || '',
        proNumber: shipment.proNumber || '', deliveryOrderNumber: shipment.deliveryOrderNumber || '', bookingNumber: shipment.bookingNumber || '',
        containerNumber: shipment.containerNumber || '', sealNumber: shipment.sealNumber || '', pickupNumber: shipment.pickupNumber || '',
        proofOfDeliveryNumber: shipment.proofOfDeliveryNumber || '', purchaseOrderNumbers: shipment.purchaseOrderNumbers?.join(', ') || '',
        otherReferenceNumbersString: shipment.otherReferenceNumbers?.map(ref => `${ref.type}:${ref.value}`).join(', ') || '',
        steamshipLine: shipment.steamshipLine || '', vesselName: shipment.vesselName || '', voyageNumber: shipment.voyageNumber || '', terminal: shipment.terminal || '',
        lastFreeDayPort: formatDateForInput(shipment.lastFreeDayPort), lastFreeDayRail: formatDateForInput(shipment.lastFreeDayRail),
        emptyReturnDepot: shipment.emptyReturnDepot || '', emptyContainerReturnByDate: formatDateForInput(shipment.emptyContainerReturnByDate),
        chassisNumber: shipment.chassisNumber || '', chassisType: shipment.chassisType || '', chassisProvider: shipment.chassisProvider || '', chassisReturnByDate: formatDateForInput(shipment.chassisReturnByDate),
        railOriginRamp: shipment.railOriginRamp || '', railDestinationRamp: shipment.railDestinationRamp || '', railCarrier: shipment.railCarrier || '',
        airline: shipment.airline || '', flightNumber: shipment.flightNumber || '', masterAirWaybill: shipment.masterAirWaybill || '', houseAirWaybill: shipment.houseAirWaybill || '',
        airportOfDeparture: shipment.airportOfDeparture || '', airportOfArrival: shipment.airportOfArrival || '',
        isTransload: shipment.isTransload || false, transloadFacilityName: shipment.transloadFacility?.name || '',
        transloadFacilityAddress: shipment.transloadFacility?.address || '', transloadFacilityCity: shipment.transloadFacility?.city || '',
        transloadFacilityState: shipment.transloadFacility?.state || '', transloadFacilityZip: shipment.transloadFacility?.zip || '',
        transloadDate: formatDateForInput(shipment.transloadDate),
        originName: shipment.origin?.name || '', originAddress: shipment.origin?.address || '', originCity: shipment.origin?.city || '',
        originState: shipment.origin?.state || '', originZip: shipment.origin?.zip || '', originCountry: shipment.origin?.country || 'USA',
        originLocationType: shipment.origin?.locationType || 'shipper_facility', originContactName: shipment.origin?.contactName || '',
        originContactPhone: shipment.origin?.contactPhone || '', originContactEmail: shipment.origin?.contactEmail || '', originNotes: shipment.origin?.notes || '',
        destinationName: shipment.destination?.name || '', destinationAddress: shipment.destination?.address || '',
        destinationCity: shipment.destination?.city || '', destinationState: shipment.destination?.state || '',
        destinationZip: shipment.destination?.zip || '', destinationCountry: shipment.destination?.country || 'USA',
        destinationLocationType: shipment.destination?.locationType || 'consignee_facility',
        destinationContactName: shipment.destination?.contactName || '', destinationContactPhone: shipment.destination?.contactPhone || '',
        destinationContactEmail: shipment.destination?.contactEmail || '', destinationNotes: shipment.destination?.notes || '',
        scheduledPickupDate: formatDateForInput(shipment.scheduledPickupDate), scheduledPickupTime: shipment.scheduledPickupTime || '',
        pickupAppointmentNumber: shipment.pickupAppointmentNumber || '', actualPickupDateTime: formatDateTimeForInput(shipment.actualPickupDateTime),
        scheduledDeliveryDate: formatDateForInput(shipment.scheduledDeliveryDate), scheduledDeliveryTime: shipment.scheduledDeliveryTime || '',
        deliveryAppointmentNumber: shipment.deliveryAppointmentNumber || '', actualDeliveryDateTime: formatDateTimeForInput(shipment.actualDeliveryDateTime),
        status: shipment.status || 'booked', equipmentType: shipment.equipmentType || '',
        equipmentLength: (shipment.equipmentLength ?? '').toString(), equipmentUnit: shipment.equipmentUnit || 'ft',
        commodityDescription: shipment.commodityDescription || '', pieceCount: (shipment.pieceCount ?? '').toString(),
        packageType: shipment.packageType || '', totalWeight: (shipment.totalWeight ?? '').toString(),
        weightUnit: shipment.weightUnit || 'lbs', isHazardous: shipment.isHazardous || false,
        unNumber: shipment.unNumber || '', hazmatClass: shipment.hazmatClass || '',
        isTemperatureControlled: shipment.isTemperatureControlled || false,
        temperatureMin: (shipment.temperatureMin ?? '').toString(), temperatureMax: (shipment.temperatureMax ?? '').toString(),
        tempUnit: shipment.tempUnit || 'C', customerRate: (shipment.customerRate).toString(),
        carrierCostTotal: (shipment.carrierCostTotal).toString(), internalNotes: shipment.internalNotes || '',
        specialInstructions: shipment.specialInstructions || '', customTags: shipment.customTags?.join(', ') || '',
        documentIds: shipment.documents?.map(doc => typeof doc === 'string' ? doc : doc._id) || [],
        attachedDocuments: shipment.documents?.map(doc => (typeof doc !== 'string' ? { _id: doc._id, originalName: doc.originalName, mimetype: doc.mimetype, path: doc.path, size: doc.size, createdAt: doc.createdAt } : {_id: doc, originalName: 'Unknown ID Document'} as any) ) || []
    };
};

export const mapShipmentToQuoteFormData = (shipment: Shipment): QuoteFormData => {
    return {
        _id: shipment._id, quoteNumber: shipment.shipmentNumber, status: 'quote',
        shipper: typeof shipment.shipper === 'object' ? shipment.shipper?._id || '' : shipment.shipper || '',
        carrier: typeof shipment.carrier === 'object' ? shipment.carrier?._id || '' : shipment.carrier || '',
        modeOfTransport: shipment.modeOfTransport || 'truckload-ftl', equipmentType: shipment.equipmentType || '',
        originCity: shipment.origin?.city || '', originState: shipment.origin?.state || '', originZip: shipment.origin?.zip || '',
        originLocationType: shipment.origin?.locationType || 'shipper_facility', originAddress: shipment.origin?.address || '',
        destinationCity: shipment.destination?.city || '', destinationState: shipment.destination?.state || '',
        destinationZip: shipment.destination?.zip || '', destinationLocationType: shipment.destination?.locationType || 'consignee_facility',
        destinationAddress: shipment.destination?.address || '',
        scheduledPickupDate: formatDateForInput(shipment.scheduledPickupDate), scheduledDeliveryDate: formatDateForInput(shipment.scheduledDeliveryDate),
        commodityDescription: shipment.commodityDescription || '', totalWeight: (shipment.totalWeight ?? '').toString(), pieceCount: (shipment.pieceCount ?? '').toString(),
        customerRate: (shipment.customerRate ?? 0).toString(), carrierCostTotal: (shipment.carrierCostTotal ?? 0).toString(),
        
        // --- START OF THE FIX ---
        fscType: shipment.fscType || '',
        fscCustomerAmount: (shipment.fscCustomerAmount ?? '').toString(),
        fscCarrierAmount: (shipment.fscCarrierAmount ?? '').toString(),
        chassisCustomerCost: (shipment.chassisCustomerCost ?? '').toString(),
        chassisCarrierCost: (shipment.chassisCarrierCost ?? '').toString(),
        // --- END OF THE FIX ---

        accessorials: shipment.accessorials?.map(acc => ({
            _id: acc._id?.toString(),
            accessorialTypeId: typeof acc.accessorialTypeId === 'object' ? (acc.accessorialTypeId as any)._id : acc.accessorialTypeId,
            name: acc.name || '', quantity: acc.quantity || 1, customerRate: acc.customerRate || 0,
            carrierCost: acc.carrierCost || 0, notes: acc.notes || ''
        })) || [],
        quoteNotes: shipment.quoteNotes || shipment.internalNotes || '', quoteValidUntil: formatDateForInput(shipment.quoteValidUntil),
        purchaseOrderNumbers: shipment.purchaseOrderNumbers?.join(', ') || '',
        billOfLadingNumber: shipment.billOfLadingNumber || '', proNumber: shipment.proNumber || '', deliveryOrderNumber: shipment.deliveryOrderNumber || '',
        bookingNumber: shipment.bookingNumber || '', containerNumber: shipment.containerNumber || '', sealNumber: shipment.sealNumber || '',
        pickupNumber: shipment.pickupNumber || '', proofOfDeliveryNumber: shipment.proofOfDeliveryNumber || '',
        otherReferenceNumbersString: shipment.otherReferenceNumbers?.map(ref => `${ref.type}:${ref.value}`).join(', ') || '',
        steamshipLine: shipment.steamshipLine || '', vesselName: shipment.vesselName || '', voyageNumber: shipment.voyageNumber || '', terminal: shipment.terminal || '',
        lastFreeDayPort: formatDateForInput(shipment.lastFreeDayPort), lastFreeDayRail: formatDateForInput(shipment.lastFreeDayRail),
        emptyReturnDepot: shipment.emptyReturnDepot || '', emptyContainerReturnByDate: formatDateForInput(shipment.emptyContainerReturnByDate),
        chassisNumber: shipment.chassisNumber || '', chassisType: shipment.chassisType || '', chassisProvider: shipment.chassisProvider || '', chassisReturnByDate: formatDateForInput(shipment.chassisReturnByDate),
        railOriginRamp: shipment.railOriginRamp || '', railDestinationRamp: shipment.railDestinationRamp || '', railCarrier: shipment.railCarrier || '',
        airline: shipment.airline || '', flightNumber: shipment.flightNumber || '', masterAirWaybill: shipment.masterAirWaybill || '', houseAirWaybill: shipment.houseAirWaybill || '',
        airportOfDeparture: shipment.airportOfDeparture || '', airportOfArrival: shipment.airportOfArrival || '',
        isTransload: shipment.isTransload || false, transloadFacilityName: shipment.transloadFacility?.name || '',
        transloadFacilityAddress: shipment.transloadFacility?.address || '', transloadFacilityCity: shipment.transloadFacility?.city || '',
        transloadFacilityState: shipment.transloadFacility?.state || '', transloadFacilityZip: shipment.transloadFacility?.zip || '',
        transloadDate: formatDateForInput(shipment.transloadDate),
        originName: shipment.origin?.name || '', // Added
        destinationName: shipment.destination?.name || '', // Added
        originCountry: shipment.origin?.country || 'USA', // Added
        destinationCountry: shipment.destination?.country || 'USA', // Added
        originContactName: shipment.origin?.contactName || '', // Added
        originContactPhone: shipment.origin?.contactPhone || '', // Added
        originContactEmail: shipment.origin?.contactEmail || '', // Added
        originNotes: shipment.origin?.notes || '', // Added
        destinationContactName: shipment.destination?.contactName || '', // Added
        destinationContactPhone: shipment.destination?.contactPhone || '', // Added
        destinationContactEmail: shipment.destination?.contactEmail || '', // Added
        destinationNotes: shipment.destination?.notes || '', // Added
        scheduledPickupTime: shipment.scheduledPickupTime || '', pickupAppointmentNumber: shipment.pickupAppointmentNumber || '',
        actualPickupDateTime: formatDateTimeForInput(shipment.actualPickupDateTime), 
        scheduledDeliveryTime: shipment.scheduledDeliveryTime || '', deliveryAppointmentNumber: shipment.deliveryAppointmentNumber || '',
        actualDeliveryDateTime: formatDateTimeForInput(shipment.actualDeliveryDateTime), 
        equipmentLength: (shipment.equipmentLength ?? '').toString(), equipmentUnit: shipment.equipmentUnit || 'ft',
        packageType: shipment.packageType || '', weightUnit: shipment.weightUnit || 'lbs', 
        isHazardous: shipment.isHazardous || false, unNumber: shipment.unNumber || '', hazmatClass: shipment.hazmatClass || '',
        isTemperatureControlled: shipment.isTemperatureControlled || false,
        temperatureMin: (shipment.temperatureMin ?? '').toString(), temperatureMax: (shipment.temperatureMax ?? '').toString(),
        tempUnit: shipment.tempUnit || 'C', internalNotes: shipment.internalNotes || '', 
        specialInstructions: shipment.specialInstructions || '', customTags: shipment.customTags?.join(', ') || '',
        documentIds: shipment.documents?.map(doc => typeof doc === 'string' ? doc : doc._id) || [],
        attachedDocuments: shipment.documents?.map(doc => (typeof doc !== 'string' ? { _id: doc._id, originalName: doc.originalName, mimetype: doc.mimetype, path: doc.path, size: doc.size, createdAt: doc.createdAt } : {_id: doc, originalName: 'Unknown ID Document'} as any) ) || []
    };
};