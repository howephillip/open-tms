// File: backend/src/db/seed.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); 

import { config } from '../config/database';
import { User, IUser } from '../models/User';
import { Shipper, IShipper } from '../models/Shipper';
import { Carrier, ICarrier } from '../models/Carrier';
import { Shipment, IShipment } from '../models/Shipment';
import { Document as DocModel, IDocument } from '../models/Document';
import { EquipmentType, IEquipmentType } from '../models/EquipmentType';
import { AccessorialType, IAccessorialType } from '../models/AccessorialType'; // IMPORTED
import { logger } from '../utils/logger';

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB Connected for Seeding...');
  } catch (err: any) {
    logger.error(`MongoDB Connection Error for Seeding: ${err.message}`);
    process.exit(1);
  }
};

const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Shipper.deleteMany({});
    await Carrier.deleteMany({});
    await Shipment.deleteMany({});
    await DocModel.deleteMany({});
    await EquipmentType.deleteMany({});
    await AccessorialType.deleteMany({}); // CLEAR ACCESSORIAL TYPES
    logger.info('Database cleared.');
  } catch (error: any) { // Added type for error
    logger.error('Error clearing database:', error);
    throw error; // Re-throw to stop seeding if clearing fails
  }
};

const seedUsers = async (): Promise<IUser[]> => {
  const usersData = [
    { firstName: 'Admin', lastName: 'User', email: 'admin@example.com', password: 'password123', role: 'admin' as const },
    { firstName: 'Dispatch', lastName: 'Person', email: 'dispatch@example.com', password: 'password123', role: 'dispatcher' as const },
  ];
  // Use try-catch for individual seed functions for better error isolation
  try {
    const users = await User.create(usersData);
    logger.info(`${users.length} users seeded.`);
    return users;
  } catch (error) {
    logger.error('Error seeding Users:', error);
    return []; // Return empty or throw
  }
};

const seedShippers = async (): Promise<IShipper[]> => {
  const shippersData: Partial<IShipper>[] = [ // Use Partial if not all required fields are provided directly
    { name: 'Global Goods Inc.', address: { street: '123 Commerce St', city: 'New York', state: 'NY', zip: '10001' }, contact: { name: 'Sarah Miller', phone: '212-555-0101', email: 'sarah.miller@globalgoods.com' }, billingInfo: { paymentTerms: 'Net 30', creditLimit: 50000, invoiceEmail: 'billing@globalgoods.com' }, industry: 'Retail Goods'},
    { name: 'Tech Parts Ltd.', address: { street: '456 Innovation Dr', city: 'San Francisco', state: 'CA', zip: '94107' }, contact: { name: 'John Doe', phone: '415-555-0202', email: 'john.doe@techparts.com' }, billingInfo: { paymentTerms: 'Net 15', creditLimit: 100000, invoiceEmail: 'ap@techparts.com' }, industry: 'Electronics'},
  ];
  try {
    const shippers = await Shipper.create(shippersData);
    logger.info(`${shippers.length} shippers seeded.`);
    return shippers;
  } catch (error) {
    logger.error('Error seeding Shippers:', error);
    return [];
  }
};

const seedCarriers = async (): Promise<ICarrier[]> => {
  const carriersData: Partial<ICarrier>[] = [
    { name: 'Speedy Freightways', mcNumber: '123456', dotNumber: '1122334', address: { street: '789 Logistics Ave', city: 'Chicago', state: 'IL', zip: '60607' }, contact: { name: 'Mike Brown', phone: '312-555-0303', email: 'mike.brown@speedyfreight.com' }, saferData: { lastUpdated: new Date(), saferRating: 'Satisfactory', status: 'Authorized for Property'}, equipment: ['Dry Van', 'Reefer']},
    { name: 'Reliable Transport', mcNumber: '654321', dotNumber: '4433221', address: { street: '321 Hauler Rd', city: 'Dallas', state: 'TX', zip: '75201' }, contact: { name: 'Laura Wilson', phone: '214-555-0404', email: 'laura.wilson@reliabletransport.com' }, saferData: { lastUpdated: new Date(), saferRating: 'Conditional', status: 'Authorized for Property'}, equipment: ['Flatbed']},
  ];
  try {
    const carriers = await Carrier.create(carriersData);
    logger.info(`${carriers.length} carriers seeded.`);
    return carriers;
  } catch (error) {
    logger.error('Error seeding Carriers:', error);
    return [];
  }
};

const seedEquipmentTypes = async (): Promise<IEquipmentType[]> => {
  const equipmentTypesData: Partial<IEquipmentType>[] = [
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
    await EquipmentType.bulkWrite(operations);
    const seededCount = await EquipmentType.countDocuments();
    logger.info(`${seededCount} equipment types seeded/updated.`);
    return EquipmentType.find({ isActive: true }).sort({ name: 1 }).lean();
  } catch (error) {
    logger.error('Error seeding EquipmentTypes:', error);
    return [];
  }
};

const seedAccessorialTypes = async (): Promise<IAccessorialType[]> => {
  const accessorialTypesData: Partial<IAccessorialType>[] = [
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
    await AccessorialType.bulkWrite(operations);
    const seededCount = await AccessorialType.countDocuments();
    logger.info(`${seededCount} accessorial types seeded/updated.`);
    return AccessorialType.find({ isActive: true }).sort({ category: 1, name: 1 }).lean();
  } catch (error) {
    logger.error('Error seeding AccessorialTypes:', error);
    return [];
  }
};


const seedShipments = async (shippers: IShipper[], carriers: ICarrier[], users: IUser[], equipmentTypes: IEquipmentType[]): Promise<IShipment[]> => {
  const adminUser = users.find(u => u.role === 'admin');
  if (!adminUser) { logger.error("Admin user not found. Aborting shipment seed."); return []; }
  if (shippers.length === 0 || carriers.length === 0 || equipmentTypes.length === 0) {
    logger.warn("Missing shippers, carriers, or equipment types. Cannot seed shipments fully.");
    return [];
  }

  const shipmentsData: Partial<IShipment>[] = [
    { // shipmentNumber will be auto-generated by pre-save hook
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
    { // A quote example
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
    const shipments = await Shipment.create(shipmentsData);
    logger.info(`${shipments.length} shipments seeded.`);
    return shipments;
  } catch (error) {
    logger.error('Error seeding Shipments:', error);
    return [];
  }
};

const seedDocuments = async (users: IUser[], shipments: IShipment[], carriers: ICarrier[], shippers: IShipper[]): Promise<IDocument[]> => {
  const adminUser = users.find(u => u.role === 'admin');
  if (!adminUser || shipments.length === 0 || carriers.length === 0) {
      logger.warn("Cannot seed documents due to missing admin user or shipments/carriers.");
      return [];
  }
  const documentsData: Partial<IDocument>[] = [
    { filename: 'dummy_bol_01.pdf', originalName: 'BOL_TMS-AUTO1.pdf', mimetype: 'application/pdf', size: 102400, path: `uploads/dummy_bol_01.pdf`, tags: ['BOL'], relatedTo: { type: 'shipment' as const, id: shipments[0]?._id }, uploadedBy: adminUser._id },
    { filename: 'dummy_pod_01.jpg', originalName: 'POD_TMS-AUTO1.jpg', mimetype: 'image/jpeg', size: 204800, path: `uploads/dummy_pod_01.jpg`, tags: ['POD'], relatedTo: { type: 'shipment' as const, id: shipments[0]?._id }, uploadedBy: adminUser._id },
    { filename: 'carrier_agreement_speedy.pdf', originalName: 'SpeedyFreight_MasterAgreement.pdf', mimetype: 'application/pdf', size: 512000, path: `uploads/carrier_agreement_speedy.pdf`, tags: ['Agreement', 'Contract'], relatedTo: { type: 'carrier' as const, id: carriers[0]?._id }, uploadedBy: adminUser._id },
  ];
   // Create dummy files in uploads folder if they don't exist for seed to work without actual uploads
    const dummyUploadsPath = path.join(__dirname, '../../../uploads'); // Adjust if your structure is different
    if (!fs.existsSync(dummyUploadsPath)) fs.mkdirSync(dummyUploadsPath, { recursive: true });
    documentsData.forEach(doc => {
        const filePath = path.join(dummyUploadsPath, doc.filename as string);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, "This is a dummy file for seeding.");
        }
        // Update path in docData to be relative to project root or as stored in DB
        doc.path = `uploads/${doc.filename}`; // Assuming 'uploads' is at project root level
    });


  try {
    const documents = await DocModel.create(documentsData);
    logger.info(`${documents.length} documents seeded.`);
    return documents;
  } catch (error) {
    logger.error('Error seeding Documents:', error);
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
  } else {
    logger.warn("Skipping shipment/document seeding due to missing prerequisite data (users, shippers, carriers, or equipment types).");
  }

  logger.info('Database seeding completed successfully!');
  await mongoose.disconnect();
  logger.info('MongoDB Disconnected.');
  process.exit(0);
};

seedDatabase().catch((error: any) => { // Added type for error
  logger.error('Error during database seeding:', { message: error.message, stack: error.stack });
  mongoose.disconnect().finally(() => process.exit(1));
});