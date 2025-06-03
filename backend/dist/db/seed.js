"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// File: backend/src/db/seed.ts
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const Shipper_1 = require("../models/Shipper");
const Carrier_1 = require("../models/Carrier");
const Shipment_1 = require("../models/Shipment");
const Document_1 = require("../models/Document");
const EquipmentType_1 = require("../models/EquipmentType");
const AccessorialType_1 = require("../models/AccessorialType"); // IMPORTED
const logger_1 = require("../utils/logger");
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(database_1.config.mongoUri);
        logger_1.logger.info('MongoDB Connected for Seeding...');
    }
    catch (err) {
        logger_1.logger.error(`MongoDB Connection Error for Seeding: ${err.message}`);
        process.exit(1);
    }
};
const clearDatabase = async () => {
    try {
        await User_1.User.deleteMany({});
        await Shipper_1.Shipper.deleteMany({});
        await Carrier_1.Carrier.deleteMany({});
        await Shipment_1.Shipment.deleteMany({});
        await Document_1.Document.deleteMany({});
        await EquipmentType_1.EquipmentType.deleteMany({});
        await AccessorialType_1.AccessorialType.deleteMany({}); // CLEAR ACCESSORIAL TYPES
        logger_1.logger.info('Database cleared.');
    }
    catch (error) { // Added type for error
        logger_1.logger.error('Error clearing database:', error);
        throw error; // Re-throw to stop seeding if clearing fails
    }
};
const seedUsers = async () => {
    const usersData = [
        { firstName: 'Admin', lastName: 'User', email: 'admin@example.com', password: 'password123', role: 'admin' },
        { firstName: 'Dispatch', lastName: 'Person', email: 'dispatch@example.com', password: 'password123', role: 'dispatcher' },
    ];
    // Use try-catch for individual seed functions for better error isolation
    try {
        const users = await User_1.User.create(usersData);
        logger_1.logger.info(`${users.length} users seeded.`);
        return users;
    }
    catch (error) {
        logger_1.logger.error('Error seeding Users:', error);
        return []; // Return empty or throw
    }
};
const seedShippers = async () => {
    const shippersData = [
        { name: 'Global Goods Inc.', address: { street: '123 Commerce St', city: 'New York', state: 'NY', zip: '10001' }, contact: { name: 'Sarah Miller', phone: '212-555-0101', email: 'sarah.miller@globalgoods.com' }, billingInfo: { paymentTerms: 'Net 30', creditLimit: 50000, invoiceEmail: 'billing@globalgoods.com' }, industry: 'Retail Goods' },
        { name: 'Tech Parts Ltd.', address: { street: '456 Innovation Dr', city: 'San Francisco', state: 'CA', zip: '94107' }, contact: { name: 'John Doe', phone: '415-555-0202', email: 'john.doe@techparts.com' }, billingInfo: { paymentTerms: 'Net 15', creditLimit: 100000, invoiceEmail: 'ap@techparts.com' }, industry: 'Electronics' },
    ];
    try {
        const shippers = await Shipper_1.Shipper.create(shippersData);
        logger_1.logger.info(`${shippers.length} shippers seeded.`);
        return shippers;
    }
    catch (error) {
        logger_1.logger.error('Error seeding Shippers:', error);
        return [];
    }
};
const seedCarriers = async () => {
    const carriersData = [
        { name: 'Speedy Freightways', mcNumber: '123456', dotNumber: '1122334', address: { street: '789 Logistics Ave', city: 'Chicago', state: 'IL', zip: '60607' }, contact: { name: 'Mike Brown', phone: '312-555-0303', email: 'mike.brown@speedyfreight.com' }, saferData: { lastUpdated: new Date(), saferRating: 'Satisfactory', status: 'Authorized for Property' }, equipment: ['Dry Van', 'Reefer'] },
        { name: 'Reliable Transport', mcNumber: '654321', dotNumber: '4433221', address: { street: '321 Hauler Rd', city: 'Dallas', state: 'TX', zip: '75201' }, contact: { name: 'Laura Wilson', phone: '214-555-0404', email: 'laura.wilson@reliabletransport.com' }, saferData: { lastUpdated: new Date(), saferRating: 'Conditional', status: 'Authorized for Property' }, equipment: ['Flatbed'] },
    ];
    try {
        const carriers = await Carrier_1.Carrier.create(carriersData);
        logger_1.logger.info(`${carriers.length} carriers seeded.`);
        return carriers;
    }
    catch (error) {
        logger_1.logger.error('Error seeding Carriers:', error);
        return [];
    }
};
const seedEquipmentTypes = async () => {
    const equipmentTypesData = [
        { name: "53' Dry Van", category: 'trailer', code: 'DV53' }, { name: "48' Dry Van", category: 'trailer', code: 'DV48' },
        { name: "53' Reefer", category: 'trailer', code: 'RF53' }, { name: "48' Reefer", category: 'trailer', code: 'RF48' },
        { name: "Flatbed", category: 'trailer', code: 'FB' }, { name: "Step Deck", category: 'trailer', code: 'SD' },
        { name: "20' Standard Container", category: 'container', code: 'CON20STD' },
        { name: "40' Standard Container", category: 'container', code: 'CON40STD' },
        { name: "40' High Cube Container", category: 'container', code: 'CON40HC' },
        { name: "45' High Cube Container", category: 'container', code: 'CON45HC' },
        { name: "20' Reefer Container", category: 'container', code: 'RFCON20' },
        { name: "40' Reefer Container", category: 'container', code: 'RFCON40' },
        { name: "20' Tank Container", category: 'container', code: 'TANK20' },
        { name: "Standard Chassis (20'/40')", category: 'chassis', code: 'CHASSTD' },
        { name: "Slider Chassis", category: 'chassis', code: 'CHASSLD' },
        { name: "Tri-Axle Chassis", category: 'chassis', code: 'CHASTRI' },
        { name: "Power Only", category: 'other', code: 'PO' },
        { name: "Sprinter Van", category: 'other', code: 'SPRINTER' },
        { name: "Box Truck", category: 'other', code: 'BOXTRK' },
    ];
    try {
        const operations = equipmentTypesData.map(eq => ({
            updateOne: { filter: { name: eq.name }, update: { $set: eq }, upsert: true }
        }));
        await EquipmentType_1.EquipmentType.bulkWrite(operations);
        const seededCount = await EquipmentType_1.EquipmentType.countDocuments();
        logger_1.logger.info(`${seededCount} equipment types seeded/updated.`);
        return EquipmentType_1.EquipmentType.find({ isActive: true }).sort({ name: 1 }).lean();
    }
    catch (error) {
        logger_1.logger.error('Error seeding EquipmentTypes:', error);
        return [];
    }
};
const seedAccessorialTypes = async () => {
    const accessorialTypesData = [
        { name: "Chassis Split", code: "CHASSPL", appliesToModes: ['drayage-import', 'drayage-export', 'intermodal-rail'], category: "Equipment", defaultCustomerRate: 150, defaultCarrierCost: 100 },
        { name: "Pre-Pull", code: "PREPULL", appliesToModes: ['drayage-import', 'drayage-export'], category: "Handling", defaultCustomerRate: 200, defaultCarrierCost: 150 },
        { name: "Port Storage / Demurrage", code: "DEM", appliesToModes: ['drayage-import', 'ocean-fcl', 'ocean-lcl'], category: "Wait Time", isPerUnit: true, unitName: "day" },
        { name: "Per Diem (Container/Chassis)", code: "PERDIEM", appliesToModes: ['drayage-import', 'drayage-export', 'intermodal-rail'], category: "Equipment", isPerUnit: true, unitName: "day" },
        { name: "Driver Detention @ Port/Ramp", code: "DETPR", appliesToModes: ['drayage-import', 'drayage-export', 'intermodal-rail'], category: "Wait Time", isPerUnit: true, unitName: "hour", defaultCustomerRate: 75, defaultCarrierCost: 60 },
        { name: "Driver Detention @ Shipper/Receiver", code: "DETSR", appliesToModes: ['truckload-ftl', 'truckload-ltl'], category: "Wait Time", isPerUnit: true, unitName: "hour", defaultCustomerRate: 75, defaultCarrierCost: 60 },
        { name: "Lumper / Unloading Fee", code: "LUMPER", appliesToModes: ['truckload-ftl', 'truckload-ltl'], category: "Handling" },
        { name: "Fuel Surcharge (FSC)", code: "FSC", appliesToModes: ['truckload-ftl', 'truckload-ltl', 'drayage-import', 'drayage-export', 'intermodal-rail'], category: "Fuel", isPerUnit: true, unitName: "% of linehaul" },
    ];
    try {
        const operations = accessorialTypesData.map(acc => ({
            updateOne: { filter: { name: acc.name }, update: { $set: acc }, upsert: true }
        }));
        await AccessorialType_1.AccessorialType.bulkWrite(operations);
        const seededCount = await AccessorialType_1.AccessorialType.countDocuments();
        logger_1.logger.info(`${seededCount} accessorial types seeded/updated.`);
        return AccessorialType_1.AccessorialType.find({ isActive: true }).sort({ category: 1, name: 1 }).lean();
    }
    catch (error) {
        logger_1.logger.error('Error seeding AccessorialTypes:', error);
        return [];
    }
};
const seedShipments = async (shippers, carriers, users, equipmentTypes) => {
    const adminUser = users.find(u => u.role === 'admin');
    if (!adminUser) {
        logger_1.logger.error("Admin user not found. Aborting shipment seed.");
        return [];
    }
    if (shippers.length === 0 || carriers.length === 0 || equipmentTypes.length === 0) {
        logger_1.logger.warn("Missing shippers, carriers, or equipment types. Cannot seed shipments fully.");
        return [];
    }
    const shipmentsData = [
        {
            shipper: shippers[0]._id, carrier: carriers[0]._id, createdBy: adminUser._id,
            modeOfTransport: 'truckload-ftl',
            origin: { name: 'Global Goods NJ Warehouse', address: '100 Factory Ln', city: 'Newark', state: 'NJ', zip: '07101', locationType: 'shipper_facility' },
            destination: { name: 'LA Distribution Hub', address: '200 Distribution Way', city: 'Los Angeles', state: 'CA', zip: '90001', locationType: 'warehouse' },
            scheduledPickupDate: new Date('2024-08-10'), scheduledPickupTime: "09:00",
            scheduledDeliveryDate: new Date('2024-08-15'), scheduledDeliveryTime: "17:00",
            status: 'booked', equipmentType: equipmentTypes.find(e => e.code === 'DV53')?.name || "53' Dry Van",
            commodityDescription: 'Palletized General Merchandise', totalWeight: 42500, weightUnit: 'lbs', pieceCount: 26, packageType: 'Pallets',
            customerRate: 3800, carrierCostTotal: 3000, purchaseOrderNumbers: ['PO-GG-001', 'PO-GG-002'],
            internalNotes: 'Standard FTL, live load/unload.', proNumber: "SPDY1001"
        },
        {
            shipper: shippers[1]._id, carrier: carriers[1]._id, createdBy: adminUser._id,
            modeOfTransport: 'drayage-import', containerNumber: 'MSCU7654321', bookingNumber: 'BKNG-IMPORT-777',
            steamshipLine: 'Oceanic Transport Co.', terminal: 'APM Terminal - Los Angeles', lastFreeDayPort: new Date('2024-08-12'),
            origin: { name: 'Port of LA - APM', address: '2500 Navy Way', city: 'Los Angeles', state: 'CA', zip: '90731', locationType: 'port_terminal' },
            destination: { name: 'Tech Parts TX Warehouse', address: '789 Innovation Blvd', city: 'Dallas', state: 'TX', zip: '75201', locationType: 'warehouse' },
            scheduledPickupDate: new Date('2024-08-11'), pickupAppointmentNumber: 'APPTLAX007',
            scheduledDeliveryDate: new Date('2024-08-14'),
            status: 'dispatched', equipmentType: equipmentTypes.find(e => e.code === 'CON40HC')?.name || "40' High Cube Container",
            commodityDescription: 'High-Value Electronics', customerRate: 1500, carrierCostTotal: 1100,
            billOfLadingNumber: 'MBL-SEAXYZ990', deliveryOrderNumber: "DO-LAX-556"
        },
        {
            shipper: shippers[0]._id, createdBy: adminUser._id, // Carrier might not be assigned on a quote yet
            // Let's assign a carrier for now for simplicity of data, but in real quote it could be null
            carrier: carriers[0]._id,
            modeOfTransport: 'truckload-ltl', status: 'quote',
            origin: { name: 'Supplier Dock A', address: '50 Manufacturing Row', city: 'Edison', state: 'NJ', zip: '08817', locationType: 'shipper_facility' },
            destination: { name: 'Customer Store #12', address: '75 Retail Plaza', city: 'Philadelphia', state: 'PA', zip: '19103', locationType: 'consignee_facility' },
            scheduledPickupDate: new Date('2024-08-20'), scheduledDeliveryDate: new Date('2024-08-21'),
            equipmentType: "LTL Van", commodityDescription: "3 Pallets - Mixed Goods", totalWeight: 1500, pieceCount: 3,
            customerRate: 450, carrierCostTotal: 300, // Estimated costs for quote
            quoteNotes: "Rate valid for 7 days. Subject to LTL carrier availability.", quoteValidUntil: new Date(new Date().setDate(new Date().getDate() + 7))
        }
    ];
    try {
        const shipments = await Shipment_1.Shipment.create(shipmentsData);
        logger_1.logger.info(`${shipments.length} shipments seeded.`);
        return shipments;
    }
    catch (error) {
        logger_1.logger.error('Error seeding Shipments:', error);
        return [];
    }
};
const seedDocuments = async (users, shipments, carriers, shippers) => {
    const adminUser = users.find(u => u.role === 'admin');
    if (!adminUser || shipments.length === 0 || carriers.length === 0) {
        logger_1.logger.warn("Cannot seed documents due to missing admin user or shipments/carriers.");
        return [];
    }
    const documentsData = [
        { filename: 'dummy_bol_01.pdf', originalName: 'BOL_TMS-AUTO1.pdf', mimetype: 'application/pdf', size: 102400, path: `uploads/dummy_bol_01.pdf`, tags: ['BOL'], relatedTo: { type: 'shipment', id: shipments[0]?._id }, uploadedBy: adminUser._id },
        { filename: 'dummy_pod_01.jpg', originalName: 'POD_TMS-AUTO1.jpg', mimetype: 'image/jpeg', size: 204800, path: `uploads/dummy_pod_01.jpg`, tags: ['POD'], relatedTo: { type: 'shipment', id: shipments[0]?._id }, uploadedBy: adminUser._id },
        { filename: 'carrier_agreement_speedy.pdf', originalName: 'SpeedyFreight_MasterAgreement.pdf', mimetype: 'application/pdf', size: 512000, path: `uploads/carrier_agreement_speedy.pdf`, tags: ['Agreement', 'Contract'], relatedTo: { type: 'carrier', id: carriers[0]?._id }, uploadedBy: adminUser._id },
    ];
    // Create dummy files in uploads folder if they don't exist for seed to work without actual uploads
    const dummyUploadsPath = path_1.default.join(__dirname, '../../../uploads'); // Adjust if your structure is different
    if (!fs.existsSync(dummyUploadsPath))
        fs.mkdirSync(dummyUploadsPath, { recursive: true });
    documentsData.forEach(doc => {
        const filePath = path_1.default.join(dummyUploadsPath, doc.filename);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, "This is a dummy file for seeding.");
        }
        // Update path in docData to be relative to project root or as stored in DB
        doc.path = `uploads/${doc.filename}`; // Assuming 'uploads' is at project root level
    });
    try {
        const documents = await Document_1.Document.create(documentsData);
        logger_1.logger.info(`${documents.length} documents seeded.`);
        return documents;
    }
    catch (error) {
        logger_1.logger.error('Error seeding Documents:', error);
        return [];
    }
};
const seedDatabase = async () => {
    await connectDB();
    await clearDatabase();
    const equipmentTypes = await seedEquipmentTypes();
    const accessorialTypes = await seedAccessorialTypes();
    const users = await seedUsers();
    const shippers = await seedShippers();
    const carriers = await seedCarriers();
    if (users.length > 0 && shippers.length > 0 && carriers.length > 0 && equipmentTypes.length > 0) {
        const shipments = await seedShipments(shippers, carriers, users, equipmentTypes);
        if (shipments.length > 0) {
            await seedDocuments(users, shipments, carriers, shippers);
        }
    }
    else {
        logger_1.logger.warn("Skipping shipment/document seeding due to missing prerequisite data (users, shippers, carriers, or equipment types).");
    }
    logger_1.logger.info('Database seeding completed successfully!');
    await mongoose_1.default.disconnect();
    logger_1.logger.info('MongoDB Disconnected.');
    process.exit(0);
};
seedDatabase().catch((error) => {
    logger_1.logger.error('Error during database seeding:', { message: error.message, stack: error.stack });
    mongoose_1.default.disconnect().finally(() => process.exit(1));
});
//# sourceMappingURL=seed.js.map