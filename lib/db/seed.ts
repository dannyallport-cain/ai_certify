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

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  try {
    // Check if products already exist
    const existingProducts = await stripe.products.list({ limit: 10 });
    const baseExists = existingProducts.data.find(p => p.name === 'Base');
    const plusExists = existingProducts.data.find(p => p.name === 'Plus');

    if (!baseExists) {
      const baseProduct = await stripe.products.create({
        name: 'Base',
        description: 'Base subscription plan',
      });

      await stripe.prices.create({
        product: baseProduct.id,
        unit_amount: 800, // $8 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
          trial_period_days: 7,
        },
      });
      console.log('Base product created.');
    } else {
      console.log('Base product already exists, skipping.');
    }

    if (!plusExists) {
      const plusProduct = await stripe.products.create({
        name: 'Plus',
        description: 'Plus subscription plan',
      });

      await stripe.prices.create({
        product: plusProduct.id,
        unit_amount: 1200, // $12 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
          trial_period_days: 7,
        },
      });
      console.log('Plus product created.');
    } else {
      console.log('Plus product already exists, skipping.');
    }

    console.log('Stripe products and prices setup completed.');
  } catch (error) {
    console.warn('Stripe product creation failed (this is normal if Stripe is not configured):', error.message);
  }
}

async function createSampleUsers() {
  const sampleUsers = [
    { email: 'owner@test.com', name: 'John Owner', role: 'owner', password: 'admin123' },
    { email: 'manager@test.com', name: 'Sarah Manager', role: 'manager', password: 'manager123' },
    { email: 'inspector@test.com', name: 'Mike Inspector', role: 'inspector', password: 'inspector123' },
    { email: 'member@test.com', name: 'Lisa Member', role: 'member', password: 'member123' }
  ];

  const createdUsers = [];

  for (const userData of sampleUsers) {
    const existingUser = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
    
    if (existingUser.length === 0) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: userData.email,
          name: userData.name,
          passwordHash: await hashPassword(userData.password),
          role: userData.role,
        })
        .returning();
      
      createdUsers.push(newUser);
      console.log(`Created user: ${userData.email}`);
    } else {
      createdUsers.push(existingUser[0]);
      console.log(`User ${userData.email} already exists`);
    }
  }

  return createdUsers;
}

async function createSampleTeams(users) {
  const sampleTeams = [
    { 
      name: 'Fire Safety Pro Ltd',
      planName: 'Plus',
      subscriptionStatus: 'active'
    },
    { 
      name: 'Safe Buildings Co',
      planName: 'Base',
      subscriptionStatus: 'active'
    },
    { 
      name: 'City Inspectors Group',
      planName: 'Plus',
      subscriptionStatus: 'trial'
    }
  ];

  const createdTeams = [];

  for (const teamData of sampleTeams) {
    const [team] = await db
      .insert(teams)
      .values(teamData)
      .returning();
    
    createdTeams.push(team);
    console.log(`Created team: ${teamData.name}`);
  }

  return createdTeams;
}

async function createTeamMembers(users, teams) {
  const membershipData = [
    { teamId: teams[0].id, userId: users[0].id, role: 'owner' },
    { teamId: teams[0].id, userId: users[1].id, role: 'manager' },
    { teamId: teams[0].id, userId: users[2].id, role: 'inspector' },
    { teamId: teams[1].id, userId: users[1].id, role: 'owner' },
    { teamId: teams[2].id, userId: users[2].id, role: 'manager' }
  ];

  for (const membership of membershipData) {
    await db
      .insert(teamMembers)
      .values(membership);
    
    console.log(`Added user ${membership.userId} to team ${membership.teamId} as ${membership.role}`);
  }
}

async function createSampleCustomers(teams) {
  const customerData = [
    {
      teamId: teams[0].id,
      name: 'Office Tower One',
      email: 'management@towerfirst.com',
      phone: '020 7123 4567',
      address: '123 Business Street, London',
      postcode: 'EC1A 1BB',
      contactPerson: 'James Wilson'
    },
    {
      teamId: teams[0].id,
      name: 'Shopping Mall Complex',
      email: 'facilities@mallcomplex.com',
      phone: '020 7234 5678',
      address: '45 Retail Avenue, Manchester',
      postcode: 'M1 1AA',
      contactPerson: 'Emma Thompson'
    },
    {
      teamId: teams[1].id,
      name: 'City Hospital',
      email: 'maintenance@cityhospital.nhs.uk',
      phone: '020 7345 6789',
      address: '789 Health Street, Birmingham',
      postcode: 'B1 1CC',
      contactPerson: 'Dr. Robert Brown'
    }
  ];

  const createdCustomers = [];

  for (const customer of customerData) {
    const [newCustomer] = await db
      .insert(customers)
      .values(customer)
      .returning();
    
    createdCustomers.push(newCustomer);
    console.log(`Created customer: ${customer.name}`);
  }

  return createdCustomers;
}

async function createSampleCertificates(teams, customers) {
  const certificateData = [
    // BS5839-1 Fire Detection and Alarm System
    {
      teamId: teams[0].id,
      customerId: customers[0].id,
      certificateType: 'BS5839-1',
      certificateNumber: 'FS-2025-001',
      status: 'completed',
      siteName: 'Office Tower One',
      siteAddress: '123 Business Street, London',
      inspectionDate: '2025-05-15',
      nextInspectionDate: '2026-05-15',
      inspectorName: 'Mike Inspector',
      formData: {
        systemType: 'L1',
        numberOfDevices: 120,
        panelMake: 'Advanced',
        panelModel: 'MX-5000',
        systemCategory: 'P1',
        occupancyType: 'Office',
        clientReference: 'OT-2025-123'
      }
    },
    // BS5839-6 Domestic Fire Alarm
    {
      teamId: teams[0].id,
      customerId: customers[1].id,
      certificateType: 'BS5839-6',
      certificateNumber: 'FD-2025-001',
      status: 'completed',
      siteName: 'Riverside Apartments',
      siteAddress: '45 River Lane, Manchester',
      inspectionDate: '2025-05-16',
      nextInspectionDate: '2026-05-16',
      inspectorName: 'Sarah Manager',
      formData: {
        gradeOfSystem: 'Grade D1',
        numberOfSmokeSensors: 8,
        numberOfHeatSensors: 2,
        propertyType: 'Apartment Block',
        numberOfFloors: 3,
        numberOfBedrooms: 2
      }
    },
    // BS5266 Emergency Lighting
    {
      teamId: teams[1].id,
      customerId: customers[2].id,
      certificateType: 'BS5266',
      certificateNumber: 'EL-2025-001',
      status: 'completed',
      siteName: 'City Hospital',
      siteAddress: '789 Health Street, Birmingham',
      inspectionDate: '2025-05-01',
      nextInspectionDate: '2026-05-01',
      inspectorName: 'Sarah Manager',
      formData: {
        numberOfLuminaires: 85,
        systemType: 'Maintained',
        testDuration: '3 Hours',
        buildingType: 'Healthcare',
        floorsCovered: 'G, 1, 2, 3'
      }
    },
    // Fire Extinguisher Inspection
    {
      teamId: teams[0].id,
      customerId: customers[1].id,
      certificateType: 'FIRE_EXTINGUISHER',
      certificateNumber: 'FE-2025-001',
      status: 'completed',
      siteName: 'Shopping Mall Complex',
      siteAddress: '45 Retail Avenue, Manchester',
      inspectionDate: '2025-05-20',
      nextInspectionDate: '2026-05-20',
      inspectorName: 'Mike Inspector',
      formData: {
        totalExtinguishers: 24,
        serviceType: 'Annual',
        riskAssessmentDate: '2025-05-20',
        buildingUse: 'Retail'
      }
    },
    // Dry Riser Inspection
    {
      teamId: teams[1].id,
      customerId: customers[0].id,
      certificateType: 'DRY_RISER',
      certificateNumber: 'DR-2025-001',
      status: 'completed',
      siteName: 'Office Tower One',
      siteAddress: '123 Business Street, London',
      inspectionDate: '2025-05-10',
      nextInspectionDate: '2025-11-10',
      inspectorName: 'Mike Inspector',
      formData: {
        numberOfOutlets: 12,
        pressureTestResult: '12 Bar',
        testType: 'Six Monthly',
        floorsCovered: '1-12',
        inletLocation: 'Main Entrance'
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
    console.log(`Created certificate: ${cert.certificateNumber}`);
  }

  return createdCertificates;
}

async function createSampleCertificateItems(certificates) {
  const itemsData = [
    // BS5839-1 Items
    {
      certificateId: certificates[0].id,
      itemType: 'detector',
      location: 'Ground Floor Reception',
      description: 'Optical Smoke Detector',
      status: 'satisfactory',
      sortOrder: 1
    },
    {
      certificateId: certificates[0].id,
      itemType: 'panel',
      location: 'Security Room',
      description: 'Advanced MX-5000 Fire Panel',
      status: 'satisfactory',
      sortOrder: 2
    },
    {
      certificateId: certificates[0].id,
      itemType: 'call_point',
      location: 'Emergency Exit',
      description: 'Manual Call Point',
      status: 'satisfactory',
      sortOrder: 3
    },

    // BS5839-6 Items
    {
      certificateId: certificates[1].id,
      itemType: 'smoke_sensor',
      location: 'Living Room',
      description: 'Mains Powered Smoke Detector with Battery Backup',
      status: 'satisfactory',
      sortOrder: 1
    },
    {
      certificateId: certificates[1].id,
      itemType: 'heat_sensor',
      location: 'Kitchen',
      description: 'Heat Detector',
      status: 'satisfactory',
      sortOrder: 2
    },
    {
      certificateId: certificates[1].id,
      itemType: 'control_unit',
      location: 'Hallway',
      description: 'Grade D1 Control Panel',
      status: 'unsatisfactory',
      defects: 'Backup battery needs replacement',
      recommendations: 'Replace backup battery within 30 days',
      sortOrder: 3
    },

    // BS5266 Emergency Lighting Items
    {
      certificateId: certificates[2].id,
      itemType: 'emergency_light',
      location: 'Main Corridor - Ground Floor',
      description: '3W LED Emergency Light',
      status: 'satisfactory',
      sortOrder: 1
    },
    {
      certificateId: certificates[2].id,
      itemType: 'exit_sign',
      location: 'Fire Exit - First Floor',
      description: 'Illuminated Exit Sign',
      status: 'satisfactory',
      sortOrder: 2
    },
    {
      certificateId: certificates[2].id,
      itemType: 'emergency_light',
      location: 'Stairwell A',
      description: 'Emergency Downlight',
      status: 'unsatisfactory',
      defects: 'Failed duration test',
      recommendations: 'Replace battery pack',
      sortOrder: 3
    },

    // Fire Extinguisher Items
    {
      certificateId: certificates[3].id,
      itemType: 'extinguisher',
      location: 'Main Entrance',
      description: '6kg Powder Extinguisher',
      status: 'satisfactory',
      sortOrder: 1
    },
    {
      certificateId: certificates[3].id,
      itemType: 'extinguisher',
      location: 'Kitchen Area',
      description: '2kg CO2 Extinguisher',
      status: 'unsatisfactory',
      defects: 'Pressure gauge showing low pressure',
      recommendations: 'Replace extinguisher',
      sortOrder: 2
    },
    {
      certificateId: certificates[3].id,
      itemType: 'extinguisher',
      location: 'Server Room',
      description: '5kg CO2 Extinguisher',
      status: 'satisfactory',
      sortOrder: 3
    },

    // Dry Riser Items
    {
      certificateId: certificates[4].id,
      itemType: 'inlet',
      location: 'Ground Floor - Main Entrance',
      description: 'Double Fire Brigade Inlet',
      status: 'satisfactory',
      sortOrder: 1
    },
    {
      certificateId: certificates[4].id,
      itemType: 'outlet',
      location: '6th Floor Landing',
      description: 'Single Outlet Valve',
      status: 'satisfactory',
      sortOrder: 2
    },
    {
      certificateId: certificates[4].id,
      itemType: 'outlet',
      location: '12th Floor Landing',
      description: 'Single Outlet Valve',
      status: 'unsatisfactory',
      defects: 'Leaking valve stem',
      recommendations: 'Replace valve packing',
      sortOrder: 3
    }
  ];

  for (const item of itemsData) {
    await db
      .insert(certificateItems)
      .values(item);
    
    console.log(`Created certificate item: ${item.itemType} at ${item.location}`);
  }
}

async function createSampleActivityLogs(teams, users) {
  const activityData = [
    {
      teamId: teams[0].id,
      userId: users[0].id,
      action: 'Created new certificate BS5839-1',
      ipAddress: '192.168.1.1'
    },
    {
      teamId: teams[0].id,
      userId: users[1].id,
      action: 'Updated customer details',
      ipAddress: '192.168.1.2'
    },
    {
      teamId: teams[1].id,
      userId: users[2].id,
      action: 'Completed inspection',
      ipAddress: '192.168.1.3'
    }
  ];

  for (const activity of activityData) {
    await db
      .insert(activityLogs)
      .values(activity);
    
    console.log(`Created activity log: ${activity.action}`);
  }
}

async function createSampleInvitations(teams, users) {
  const invitationData = [
    {
      teamId: teams[0].id,
      email: 'pending@test.com',
      role: 'inspector',
      invitedBy: users[0].id,
      status: 'pending'
    },
    {
      teamId: teams[1].id,
      email: 'accepted@test.com',
      role: 'member',
      invitedBy: users[1].id,
      status: 'accepted'
    }
  ];

  for (const invitation of invitationData) {
    await db
      .insert(invitations)
      .values(invitation);
    
    console.log(`Created invitation for: ${invitation.email}`);
  }
}

async function seed() {
  console.log('Starting seed process...');

  await createStripeProducts();
  
  console.log('Creating users...');
  const users = await createSampleUsers();
  
  console.log('Creating teams...');
  const teams = await createSampleTeams(users);
  
  console.log('Creating team members...');
  await createTeamMembers(users, teams);
  
  console.log('Creating customers...');
  const customers = await createSampleCustomers(teams);
  
  console.log('Creating certificates...');
  const certificates = await createSampleCertificates(teams, customers);
  
  console.log('Creating certificate items...');
  await createSampleCertificateItems(certificates);
  
  console.log('Creating activity logs...');
  await createSampleActivityLogs(teams, users);
  
  console.log('Creating invitations...');
  await createSampleInvitations(teams, users);

  console.log('Seed process completed successfully!');
}

seed().catch(console.error);
