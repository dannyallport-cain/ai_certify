import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { 
  users, 
  teams, 
  teamMembers, 
  activityLogs, 
  customers, 
  certificates, 
  certificateItems,
  invitations 
} from './schema';
import { hashPassword } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

// Enhanced sample certificate data with 3 certificates per type
async function createEnhancedSampleCertificates(teams: any[], customers: any[]) {
  console.log('Creating enhanced sample certificates...');
  
  const certificateData = [
    // ===== BS5839-1 Fire Detection and Alarm Systems (Commercial) - 3 certificates =====
    {
      teamId: teams[0].id,
      customerId: customers[0].id,
      certificateType: 'BS5839-1',
      certificateNumber: 'FS-2025-001',
      status: 'completed',
      siteName: 'Central Business Tower',
      siteAddress: '123 Corporate Plaza, London EC1A 1BB',
      inspectionDate: '2025-03-15',
      nextInspectionDate: '2026-03-15',
      inspectorName: 'James Richardson',
      formData: {
        systemType: 'L1 - Life Protection',
        numberOfDevices: 145,
        panelMake: 'Advanced Electronics',
        panelModel: 'MX-5000 Pro',
        systemCategory: 'P1',
        occupancyType: 'Office Building',
        clientReference: 'CBT-2025-001',
        floors: 15,
        totalFloorArea: '12500 sqm',
        testType: 'Annual Inspection',
        batteryType: '24V Sealed Lead Acid',
        batteryCapacity: '18Ah',
        standbyTime: '72 hours'
      }
    },
    {
      teamId: teams[0].id,
      customerId: customers[1].id,
      certificateType: 'BS5839-1',
      certificateNumber: 'FS-2025-002',
      status: 'completed',
      siteName: 'Metro Shopping Centre',
      siteAddress: '456 Retail Street, Manchester M1 2CD',
      inspectionDate: '2025-03-20',
      nextInspectionDate: '2026-03-20',
      inspectorName: 'Sarah Williams',
      formData: {
        systemType: 'L2 - Property Protection',
        numberOfDevices: 98,
        panelMake: 'FireGuard Systems',
        panelModel: 'FG-2000X',
        systemCategory: 'P2',
        occupancyType: 'Shopping Centre',
        clientReference: 'MSC-2025-002',
        floors: 3,
        totalFloorArea: '8500 sqm',
        testType: 'Six Monthly Test',
        batteryType: '24V Lithium',
        batteryCapacity: '12Ah',
        standbyTime: '48 hours'
      }
    },
    {
      teamId: teams[1].id,
      customerId: customers[2].id,
      certificateType: 'BS5839-1',
      certificateNumber: 'FS-2025-003',
      status: 'issued',
      siteName: 'University Medical Research Center',
      siteAddress: '789 Research Way, Birmingham B2 3EF',
      inspectionDate: '2025-03-25',
      nextInspectionDate: '2026-03-25',
      inspectorName: 'Michael Thompson',
      formData: {
        systemType: 'L3 - Enhanced Property Protection',
        numberOfDevices: 267,
        panelMake: 'Hochiki Europe',
        panelModel: 'FIREscape Plus',
        systemCategory: 'P1',
        occupancyType: 'Healthcare/Research',
        clientReference: 'UMRC-2025-003',
        floors: 8,
        totalFloorArea: '15000 sqm',
        testType: 'Annual Inspection',
        batteryType: '24V AGM',
        batteryCapacity: '26Ah',
        standbyTime: '72 hours'
      }
    },

    // ===== BS5839-6 Domestic Fire Detection Systems - 3 certificates =====
    {
      teamId: teams[0].id,
      customerId: customers[0].id,
      certificateType: 'BS5839-6',
      certificateNumber: 'FD-2025-001',
      status: 'completed',
      siteName: 'Riverside Apartments Block A',
      siteAddress: '15 Waterfront Drive, London E14 5GH',
      inspectionDate: '2025-04-01',
      nextInspectionDate: '2026-04-01',
      inspectorName: 'Emma Davis',
      formData: {
        gradeOfSystem: 'Grade D1 - Mains Powered',
        numberOfSmokeSensors: 12,
        numberOfHeatSensors: 4,
        numberOfCOSensors: 2,
        propertyType: 'High-rise Residential',
        numberOfFloors: 6,
        numberOfUnits: 24,
        interconnectionMethod: 'Hard-wired',
        powerSupply: 'Mains with battery backup',
        clientReference: 'RAB-2025-001'
      }
    },
    {
      teamId: teams[1].id,
      customerId: customers[1].id,
      certificateType: 'BS5839-6',
      certificateNumber: 'FD-2025-002',
      status: 'completed',
      siteName: 'Suburban Family Homes - Phase 1',
      siteAddress: '32-48 Green Valley Road, Manchester M20 4JK',
      inspectionDate: '2025-04-05',
      nextInspectionDate: '2026-04-05',
      inspectorName: 'Robert Johnson',
      formData: {
        gradeOfSystem: 'Grade D2 - Battery Powered',
        numberOfSmokeSensors: 6,
        numberOfHeatSensors: 2,
        numberOfCOSensors: 1,
        propertyType: 'Detached Houses',
        numberOfFloors: 2,
        numberOfUnits: 8,
        interconnectionMethod: 'Radio frequency',
        powerSupply: 'Sealed lithium battery',
        clientReference: 'SFH-2025-002'
      }
    },
    {
      teamId: teams[0].id,
      customerId: customers[2].id,
      certificateType: 'BS5839-6',
      certificateNumber: 'FD-2025-003',
      status: 'draft',
      siteName: 'Student Accommodation Complex',
      siteAddress: '101 University Avenue, Birmingham B15 2TT',
      inspectionDate: '2025-04-10',
      nextInspectionDate: '2026-04-10',
      inspectorName: 'Lisa Carter',
      formData: {
        gradeOfSystem: 'Grade A - L1 System',
        numberOfSmokeSensors: 156,
        numberOfHeatSensors: 24,
        numberOfCOSensors: 12,
        propertyType: 'Purpose Built Student Accommodation',
        numberOfFloors: 12,
        numberOfUnits: 180,
        interconnectionMethod: 'Addressable system',
        powerSupply: 'Mains with standby battery',
        clientReference: 'SAC-2025-003'
      }
    },

    // ===== BS5266 Emergency Lighting Systems - 3 certificates =====
    {
      teamId: teams[1].id,
      customerId: customers[0].id,
      certificateType: 'BS5266',
      certificateNumber: 'EL-2025-001',
      status: 'completed',
      siteName: 'City General Hospital',
      siteAddress: '22 Healthcare Boulevard, London SW1A 1AA',
      inspectionDate: '2025-02-15',
      nextInspectionDate: '2026-02-15',
      inspectorName: 'David Wilson',
      formData: {
        numberOfLuminaires: 234,
        systemType: 'Maintained',
        testDuration: '3 Hours',
        buildingType: 'Healthcare Facility',
        floorsCovered: 'B1, G, 1-8',
        emergencyDuration: '3 hours',
        batteryType: 'NiMH',
        centralBatterySystem: 'Yes',
        clientReference: 'CGH-2025-001'
      }
    },
    {
      teamId: teams[0].id,
      customerId: customers[1].id,
      certificateType: 'BS5266',
      certificateNumber: 'EL-2025-002',
      status: 'completed',
      siteName: 'Technology Innovation Hub',
      siteAddress: '88 Innovation Drive, Manchester M4 6WX',
      inspectionDate: '2025-02-20',
      nextInspectionDate: '2026-02-20',
      inspectorName: 'Hannah Miller',
      formData: {
        numberOfLuminaires: 167,
        systemType: 'Non-Maintained',
        testDuration: '1 Hour',
        buildingType: 'Office/Research',
        floorsCovered: 'G, 1-4',
        emergencyDuration: '1 hour',
        batteryType: 'Li-Ion',
        centralBatterySystem: 'No',
        clientReference: 'TIH-2025-002'
      }
    },
    {
      teamId: teams[1].id,
      customerId: customers[2].id,
      certificateType: 'BS5266',
      certificateNumber: 'EL-2025-003',
      status: 'issued',
      siteName: 'Entertainment Complex Arena',
      siteAddress: '199 Arena Street, Birmingham B1 1BB',
      inspectionDate: '2025-02-25',
      nextInspectionDate: '2026-02-25',
      inspectorName: 'Peter Brown',
      formData: {
        numberOfLuminaires: 445,
        systemType: 'Sustained',
        testDuration: '3 Hours',
        buildingType: 'Entertainment Venue',
        floorsCovered: 'B2-B1, G, 1-3',
        emergencyDuration: '3 hours',
        batteryType: 'NiCd',
        centralBatterySystem: 'Yes',
        clientReference: 'ECA-2025-003'
      }
    },

    // ===== Fire Extinguisher Inspections - 3 certificates =====
    {
      teamId: teams[0].id,
      customerId: customers[0].id,
      certificateType: 'FIRE_EXTINGUISHER',
      certificateNumber: 'FE-2025-001',
      status: 'completed',
      siteName: 'Industrial Manufacturing Plant',
      siteAddress: '45 Industrial Estate, London E6 7YH',
      inspectionDate: '2025-01-15',
      nextInspectionDate: '2026-01-15',
      inspectorName: 'Andrew Clark',
      formData: {
        totalExtinguishers: 48,
        waterExtinguishers: 12,
        foamExtinguishers: 8,
        co2Extinguishers: 16,
        dryPowderExtinguishers: 10,
        wetChemicalExtinguishers: 2,
        serviceType: 'Annual Service',
        riskAssessmentDate: '2025-01-15',
        buildingUse: 'Manufacturing',
        clientReference: 'IMP-2025-001'
      }
    },
    {
      teamId: teams[1].id,
      customerId: customers[1].id,
      certificateType: 'FIRE_EXTINGUISHER',
      certificateNumber: 'FE-2025-002',
      status: 'completed',
      siteName: 'Corporate Office Complex',
      siteAddress: '123 Business Park, Manchester M15 6PA',
      inspectionDate: '2025-01-20',
      nextInspectionDate: '2026-01-20',
      inspectorName: 'Sophie Taylor',
      formData: {
        totalExtinguishers: 32,
        waterExtinguishers: 20,
        foamExtinguishers: 4,
        co2Extinguishers: 8,
        dryPowderExtinguishers: 0,
        wetChemicalExtinguishers: 0,
        serviceType: 'Annual Service',
        riskAssessmentDate: '2025-01-20',
        buildingUse: 'Office',
        clientReference: 'COC-2025-002'
      }
    },
    {
      teamId: teams[0].id,
      customerId: customers[2].id,
      certificateType: 'FIRE_EXTINGUISHER',
      certificateNumber: 'FE-2025-003',
      status: 'draft',
      siteName: 'Educational Campus',
      siteAddress: '567 Learning Avenue, Birmingham B25 8QR',
      inspectionDate: '2025-01-25',
      nextInspectionDate: '2026-01-25',
      inspectorName: 'Mark Anderson',
      formData: {
        totalExtinguishers: 78,
        waterExtinguishers: 35,
        foamExtinguishers: 12,
        co2Extinguishers: 20,
        dryPowderExtinguishers: 8,
        wetChemicalExtinguishers: 3,
        serviceType: 'Annual Service',
        riskAssessmentDate: '2025-01-25',
        buildingUse: 'Educational',
        clientReference: 'EC-2025-003'
      }
    },

    // ===== Dry Riser Systems - 3 certificates =====
    {
      teamId: teams[1].id,
      customerId: customers[0].id,
      certificateType: 'DRY_RISER',
      certificateNumber: 'DR-2025-001',
      status: 'completed',
      siteName: 'Skyline Residential Tower',
      siteAddress: '777 Towering Heights, London E14 9QP',
      inspectionDate: '2025-05-01',
      nextInspectionDate: '2025-11-01',
      inspectorName: 'Kevin Roberts',
      formData: {
        numberOfOutlets: 18,
        pressureTestResult: '12.5 Bar',
        testType: 'Six Monthly Inspection',
        floorsCovered: '1-18',
        inletLocation: 'Ground Floor - Main Entrance',
        outletType: 'Landing Valve',
        pipeSize: '100mm',
        systemType: 'Wet Riser',
        pumpDetails: 'Grundfos Hydro MPC-E 2 CR64-2-2',
        clientReference: 'SRT-2025-001'
      }
    },
    {
      teamId: teams[0].id,
      customerId: customers[1].id,
      certificateType: 'DRY_RISER',
      certificateNumber: 'DR-2025-002',
      status: 'completed',
      siteName: 'Commercial High-Rise',
      siteAddress: '999 Corporate Center, Manchester M2 5TG',
      inspectionDate: '2025-05-05',
      nextInspectionDate: '2025-11-05',
      inspectorName: 'Rachel Green',
      formData: {
        numberOfOutlets: 24,
        pressureTestResult: '12.0 Bar',
        testType: 'Six Monthly Inspection',
        floorsCovered: '1-24',
        inletLocation: 'Ground Floor - Fire Brigade Access',
        outletType: 'Landing Valve',
        pipeSize: '150mm',
        systemType: 'Dry Riser',
        pumpDetails: 'N/A - Dry System',
        clientReference: 'CHR-2025-002'
      }
    },
    {
      teamId: teams[1].id,
      customerId: customers[2].id,
      certificateType: 'DRY_RISER',
      certificateNumber: 'DR-2025-003',
      status: 'issued',
      siteName: 'Mixed-Use Development',
      siteAddress: '333 Development Plaza, Birmingham B3 2HJ',
      inspectionDate: '2025-05-10',
      nextInspectionDate: '2025-11-10',
      inspectorName: 'Thomas White',
      formData: {
        numberOfOutlets: 20,
        pressureTestResult: '11.8 Bar',
        testType: 'Six Monthly Inspection',
        floorsCovered: 'B1, G, 1-18',
        inletLocation: 'Ground Floor - Service Yard',
        outletType: 'Landing Valve',
        pipeSize: '100mm',
        systemType: 'Combined System',
        pumpDetails: 'Lowara e-SV 33/7/A',
        clientReference: 'MUD-2025-003'
      }
    }
  ];

  const createdCertificates = [];

  for (const cert of certificateData) {
    const [newCert] = await db
      .insert(certificates)
      .values(cert)
      .returning();
    
    createdCertificates.push(newCert);
    console.log(`Created certificate: ${cert.certificateNumber} (${cert.certificateType})`);
  }

  return createdCertificates;
}

// Enhanced certificate items with realistic inspection data
async function createEnhancedCertificateItems(certificates: any[]) {
  console.log('Creating enhanced certificate items...');
  
  const itemsData = [
    // BS5839-1 Certificate 1 Items (Central Business Tower)
    {
      certificateId: certificates[0].id,
      itemType: 'control_panel',
      location: 'Ground Floor - Security Office',
      description: 'Advanced MX-5000 Pro Fire Control Panel',
      status: 'satisfactory',
      sortOrder: 1
    },
    {
      certificateId: certificates[0].id,
      itemType: 'smoke_detector',
      location: '5th Floor - Open Office Area',
      description: 'Optical Smoke Detector - Hochiki DCD-1E',
      status: 'satisfactory',
      sortOrder: 2
    },
    {
      certificateId: certificates[0].id,
      itemType: 'heat_detector',
      location: '2nd Floor - Server Room',
      description: 'Rate of Rise Heat Detector - Apollo 55000-400',
      status: 'unsatisfactory',
      defects: 'Detector head requires cleaning, response time exceeded standard',
      recommendations: 'Clean detector head and test response time within 7 days',
      sortOrder: 3
    },
    {
      certificateId: certificates[0].id,
      itemType: 'manual_call_point',
      location: '8th Floor - Emergency Exit',
      description: 'Break Glass Manual Call Point - KAC MCP3A-R000SF',
      status: 'satisfactory',
      sortOrder: 4
    },
    {
      certificateId: certificates[0].id,
      itemType: 'sounder',
      location: '12th Floor - Conference Room',
      description: 'Electronic Sounder - Fulleon SOLISTA LX',
      status: 'satisfactory',
      sortOrder: 5
    },

    // BS5839-1 Certificate 2 Items (Metro Shopping Centre)
    {
      certificateId: certificates[1].id,
      itemType: 'control_panel',
      location: 'Ground Floor - Security Control Room',
      description: 'FireGuard FG-2000X Addressable Panel',
      status: 'satisfactory',
      sortOrder: 1
    },
    {
      certificateId: certificates[1].id,
      itemType: 'beam_detector',
      location: 'Ground Floor - Main Atrium',
      description: 'Projected Beam Smoke Detector - Fireray 50/50R',
      status: 'satisfactory',
      sortOrder: 2
    },
    {
      certificateId: certificates[1].id,
      itemType: 'aspirating_detector',
      location: '1st Floor - Food Court Kitchen',
      description: 'Aspirating Smoke Detection - Vesda VLF-500',
      status: 'unsatisfactory',
      defects: 'Sampling tube blocked, reduced sensitivity',
      recommendations: 'Clear blockage and recalibrate sensitivity settings',
      sortOrder: 3
    },

    // BS5839-6 Certificate 1 Items (Riverside Apartments)
    {
      certificateId: certificates[3].id,
      itemType: 'smoke_sensor',
      location: 'Flat 12A - Living Room',
      description: 'Mains Powered Optical Smoke Alarm - Aico Ei146',
      status: 'satisfactory',
      sortOrder: 1
    },
    {
      certificateId: certificates[3].id,
      itemType: 'heat_sensor',
      location: 'Flat 15C - Kitchen',
      description: 'Heat Alarm - Aico Ei144',
      status: 'satisfactory',
      sortOrder: 2
    },
    {
      certificateId: certificates[3].id,
      itemType: 'carbon_monoxide_sensor',
      location: 'Flat 8B - Utility Room',
      description: 'Carbon Monoxide Alarm - Aico Ei208',
      status: 'unsatisfactory',
      defects: 'End of life warning activated',
      recommendations: 'Replace unit immediately - beyond serviceable life',
      sortOrder: 3
    },

    // BS5266 Certificate 1 Items (City General Hospital)
    {
      certificateId: certificates[6].id,
      itemType: 'emergency_luminaire',
      location: 'Ground Floor - Main Corridor',
      description: '8W LED Emergency Luminaire - Ansell Tornado',
      status: 'satisfactory',
      sortOrder: 1
    },
    {
      certificateId: certificates[6].id,
      itemType: 'exit_sign',
      location: '3rd Floor - Ward Exit',
      description: 'LED Exit Sign with Pictogram - Ansell Eagle',
      status: 'satisfactory',
      sortOrder: 2
    },
    {
      certificateId: certificates[6].id,
      itemType: 'central_battery',
      location: 'Basement - Plant Room',
      description: 'Central Battery System - Ziton ZP3-CB-50-3',
      status: 'unsatisfactory',
      defects: 'Battery voltage below acceptable threshold',
      recommendations: 'Replace battery bank within 30 days',
      sortOrder: 3
    },

    // Fire Extinguisher Certificate 1 Items (Industrial Manufacturing Plant)
    {
      certificateId: certificates[9].id,
      itemType: 'water_extinguisher',
      location: 'Production Area 1 - Station A',
      description: '9L Water Extinguisher - Britannia P50 Rating 13A',
      status: 'satisfactory',
      sortOrder: 1
    },
    {
      certificateId: certificates[9].id,
      itemType: 'foam_extinguisher',
      location: 'Fuel Storage Area',
      description: '6L AFFF Foam Extinguisher - Commander 21A 183B',
      status: 'satisfactory',
      sortOrder: 2
    },
    {
      certificateId: certificates[9].id,
      itemType: 'co2_extinguisher',
      location: 'Electrical Switchroom',
      description: '5kg CO2 Extinguisher - Britannia 89B Rating',
      status: 'unsatisfactory',
      defects: 'Pressure gauge reading below green zone',
      recommendations: 'Recharge extinguisher immediately and investigate leak',
      sortOrder: 3
    },

    // Dry Riser Certificate 1 Items (Skyline Residential Tower)
    {
      certificateId: certificates[12].id,
      itemType: 'inlet_valve',
      location: 'Ground Floor - Main Entrance',
      description: 'Fire Brigade Inlet 100mm BS750 Instantaneous Male',
      status: 'satisfactory',
      sortOrder: 1
    },
    {
      certificateId: certificates[12].id,
      itemType: 'landing_valve',
      location: '9th Floor - Landing',
      description: 'Landing Valve 65mm with integral shut-off valve',
      status: 'satisfactory',
      sortOrder: 2
    },
    {
      certificateId: certificates[12].id,
      itemType: 'pressure_gauge',
      location: '18th Floor - Top Outlet',
      description: 'Pressure Gauge 0-20 Bar with isolation valve',
      status: 'unsatisfactory',
      defects: 'Gauge glass cracked, reading inaccurate',
      recommendations: 'Replace pressure gauge before next inspection',
      sortOrder: 3
    }
  ];

  for (const item of itemsData) {
    await db
      .insert(certificateItems)
      .values(item);
  }

  console.log(`Created ${itemsData.length} certificate items`);
}

// Main enhanced seeding function
export async function enhancedSeed() {
  console.log('🌱 Starting enhanced database seeding...');
  
  try {
    // Get existing teams and customers
    const existingTeams = await db.select().from(teams);
    const existingCustomers = await db.select().from(customers);
    
    if (existingTeams.length === 0 || existingCustomers.length === 0) {
      console.log('❌ No existing teams or customers found. Please run the main seed script first.');
      return;
    }

    // Create enhanced certificates (3 per type = 15 total)
    const createdCertificates = await createEnhancedSampleCertificates(existingTeams, existingCustomers);
    
    // Create certificate items for the new certificates
    await createEnhancedCertificateItems(createdCertificates);
    
    console.log('✅ Enhanced database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   • ${createdCertificates.length} certificates created`);
    console.log(`   • 5 certificate types covered:`);
    console.log(`     - BS5839-1 (Fire Detection - Commercial): 3 certificates`);
    console.log(`     - BS5839-6 (Fire Detection - Domestic): 3 certificates`);
    console.log(`     - BS5266 (Emergency Lighting): 3 certificates`);
    console.log(`     - FIRE_EXTINGUISHER: 3 certificates`);
    console.log(`     - DRY_RISER: 3 certificates`);
    
  } catch (error) {
    console.error('❌ Enhanced seeding failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  enhancedSeed()
    .then(() => {
      console.log('✅ Enhanced seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Enhanced seeding script failed:', error);
      process.exit(1);
    });
} 