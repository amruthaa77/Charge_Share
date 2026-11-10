import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { User } from '../models/User.js';
import { Vehicle } from '../models/Vehicle.js';
import { Charger } from '../models/Charger.js';
import { Booking } from '../models/Booking.js';
import { Review } from '../models/Review.js';
import { Verification } from '../models/Verification.js';
import { BAY_IMAGES } from '../constants/bayImages.js';
import { connectDB } from '../config/db.js';

export const seedDatabase = async (exitOnComplete = true) => {
  const isProd = process.env.NODE_ENV === 'production';
  const isDemoMode = process.env.DEMO_MODE === 'true';

  if (isProd || !isDemoMode) {
    console.warn('[Seed] Refusing to run demo seed when NODE_ENV=production or DEMO_MODE is not true.');
    if (exitOnComplete) process.exit(0);
    return;
  }

  let mongoServer = null;
  try {
    if (mongoose.connection.readyState === 0) {
      try {
        await connectDB();
      } catch {
        console.log('[Seed] Local MongoDB (localhost:27017) not detected.');
        console.log('[Seed] Spawning embedded in-memory MongoDB to validate complete seed pipeline...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
        console.log('[Seed] Database connected successfully');
      }
    }

    console.log('[Seed] Connected to database. Preparing collections...');

    const existingAdmin = await User.findOne({ role: 'ADMIN' });

    await Promise.all([
      User.deleteMany({ role: { $ne: 'ADMIN' } }),
      Vehicle.deleteMany({}),
      Charger.deleteMany({}),
      Booking.deleteMany({}),
      Review.deleteMany({}),
      Verification.deleteMany({}),
    ]);

    console.log('[Seed] Collections cleared (Admin preserved if existed).');

    // 1. Create Users (All based in Bengaluru, Karnataka)
    console.log('[Seed] Creating Admin, Hosts, and EV Owners in Bengaluru...');

    const isProd = process.env.NODE_ENV === 'production';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || (process.env.DEMO_MODE === 'true' ? 'AdminPassword123!' : undefined); // Local demo only
    let admin = existingAdmin;
    if (!admin && !isProd && adminPassword) {
      admin = await User.create({
        name: 'Aditya Sen (Admin)',
        email: 'admin@chargeshare.in',
        password: adminPassword,
        phone: '+919999900001',
        role: 'ADMIN',
        city: 'Bengaluru',
        mustChangePassword: true,
        must_change_password: true,
        trustStatus: 'VERIFIED',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      });
      console.log('[Seed] Created default initial administrator account.');
    } else if (admin) {
      console.log('[Seed] Existing Admin account preserved; password and rotation status unchanged.');
    }

    const hostUsers = await User.create([
      {
        name: 'Rajesh Kumar',
        email: 'host1@chargeshare.in',
        password: 'HostPassword123!',
        phone: '+919888800001',
        role: 'HOST',
        city: 'Bengaluru',
        isVerifiedHost: true,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
      {
        name: 'Priya Sharma',
        email: 'host2@chargeshare.in',
        password: 'HostPassword123!',
        phone: '+919888800002',
        role: 'HOST',
        city: 'Bengaluru',
        isVerifiedHost: true,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      },
      {
        name: 'Amitabh Patel',
        email: 'host3@chargeshare.in',
        password: 'HostPassword123!',
        phone: '+919888800003',
        role: 'HOST',
        city: 'Bengaluru',
        isVerifiedHost: true,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      },
      {
        name: 'Vikram Reddy',
        email: 'host4@chargeshare.in',
        password: 'HostPassword123!',
        phone: '+919888800004',
        role: 'HOST',
        city: 'Bengaluru',
        isVerifiedHost: true,
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      },
      {
        name: 'Sneha Iyer',
        email: 'host5@chargeshare.in',
        password: 'HostPassword123!',
        phone: '+919888800005',
        role: 'HOST',
        city: 'Bengaluru',
        isVerifiedHost: true,
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      },
    ]);

    const evOwners = await User.create([
      {
        name: 'Ananya Verma',
        email: 'owner1@chargeshare.in',
        password: 'OwnerPassword123!',
        phone: '+919777700001',
        role: 'EV_OWNER',
        city: 'Bengaluru',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      },
      {
        name: 'Rohan Mehta',
        email: 'owner2@chargeshare.in',
        password: 'OwnerPassword123!',
        phone: '+919777700002',
        role: 'EV_OWNER',
        city: 'Bengaluru',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      },
      {
        name: 'Kavita Nair',
        email: 'owner3@chargeshare.in',
        password: 'OwnerPassword123!',
        phone: '+919777700003',
        role: 'EV_OWNER',
        city: 'Bengaluru',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150',
      },
    ]);

    // 2. Create EV Vehicles (Karnataka Registered)
    console.log('[Seed] Creating EV Vehicles...');
    const vehicles = await Vehicle.create([
      {
        userId: evOwners[0]._id,
        make: 'Tata',
        model: 'Nexon EV Max',
        year: 2023,
        registrationNumber: 'KA-01-EV-4050',
        connectorType: 'CCS2',
        batteryCapacityKWh: 40.5,
        isDefault: true,
      },
      {
        userId: evOwners[0]._id,
        make: 'Ather',
        model: '450X Gen 3',
        year: 2024,
        registrationNumber: 'KA-05-EQ-8899',
        connectorType: '3-pin',
        batteryCapacityKWh: 3.7,
        isDefault: false,
      },
      {
        userId: evOwners[1]._id,
        make: 'MG',
        model: 'ZS EV Excite',
        year: 2023,
        registrationNumber: 'KA-03-EZ-7711',
        connectorType: 'CCS2',
        batteryCapacityKWh: 50.3,
        isDefault: true,
      },
      {
        userId: evOwners[1]._id,
        make: 'Tata',
        model: 'Tiago EV',
        year: 2024,
        registrationNumber: 'KA-04-EV-2200',
        connectorType: 'Type 2',
        batteryCapacityKWh: 24,
        isDefault: false,
      },
      {
        userId: evOwners[2]._id,
        make: 'Hyundai',
        model: 'Ioniq 5',
        year: 2024,
        registrationNumber: 'KA-51-EV-9999',
        connectorType: 'CCS2',
        batteryCapacityKWh: 72.6,
        isDefault: true,
      },
    ]);

    // 3. Create 30 Chargers Strictly within Bengaluru Geofence
    // Latitude range: 12.80 to 13.15, Longitude range: 77.45 to 77.75
    console.log('[Seed] Creating 30 Chargers across Bengaluru Corridors (lat: 12.80-13.15, lng: 77.45-77.75)...');


    const chargerDataTemplates = [
      // Zone 1: Central & South-East Bengaluru (Koramangala, Indiranagar, HSR, Domlur, CV Raman Nagar, Bellandur)
      {
        host: hostUsers[0],
        list: [
          {
            title: 'Koramangala 4th Block High-Speed 50kW DC Fast Hub',
            desc: 'Dedicated covered driveway, 50kW CCS2 fast charger with 24/7 CCTV surveillance and clean restroom access.',
            addr: 'Plot 412, 17th Main, 4th Block, Koramangala',
            pin: '560034',
            coords: [77.6245, 12.9352],
            conn: 'CCS2',
            kw: 50,
            type: 'PER_KWH',
            price: 18,
            status: 'VERIFIED',
          },
          {
            title: 'Indiranagar 100ft Road Type-2 AC Wallbox (22kW)',
            desc: 'Convenient charging right off 100ft road next to cafes. Safe parking with MCB & RCCB dual protection.',
            addr: '12th A Main, Near Toit, Indiranagar',
            pin: '560038',
            coords: [77.6413, 12.9719],
            conn: 'Type 2',
            kw: 22,
            type: 'PER_KWH',
            price: 14,
            status: 'VERIFIED',
          },
          {
            title: 'HSR Layout Sector 1 Gated Villa 7.4kW Charger',
            desc: 'Quiet residential villa charger with shaded parking, solar powered earthing verified setup.',
            addr: '27th Main Rd, Sector 1, HSR Layout',
            pin: '560102',
            coords: [77.6514, 12.9121],
            conn: 'Type 2',
            kw: 7.4,
            type: 'PER_HOUR',
            price: 110,
            status: 'VERIFIED',
          },
          {
            title: 'Domlur Embassy Golf Links (EGL) 50kW Fast Bay',
            desc: 'Next to EGL Tech Park gate. Dual gun CCS2 fast charger with 24/7 security and Wi-Fi.',
            addr: 'Intermediate Ring Road, Domlur',
            pin: '560071',
            coords: [77.6452, 12.9606],
            conn: 'CCS2',
            kw: 50,
            type: 'PER_KWH',
            price: 19,
            status: 'VERIFIED',
          },
          {
            title: 'CV Raman Nagar Bagmane Tech Park 22kW Bay',
            desc: 'Located adjacent to Bagmane World Technology Centre. Weatherproof Type 2 Mennekes wallbox.',
            addr: '7th Cross, Kaggadasapura Main Rd, CV Raman Nagar',
            pin: '560093',
            coords: [77.6631, 12.9854],
            conn: 'Type 2',
            kw: 22,
            type: 'PER_KWH',
            price: 15,
            status: 'VERIFIED',
          },
          {
            title: 'Bellandur EcoSpace Adjacent 60kW DC Supercharger',
            desc: 'Ultra fast dual gun CCS2 charger on Outer Ring Road. Coffee kiosk nearby.',
            addr: 'Outer Ring Road, Near Ecospace, Bellandur',
            pin: '560103',
            coords: [77.6784, 12.926],
            conn: 'CCS2',
            kw: 60,
            type: 'PER_KWH',
            price: 21,
            status: 'VERIFIED',
          },
        ],
      },
      // Zone 2: East Bengaluru & Tech Corridor (Whitefield, ITPL, Marathahalli, Brookefield, Hoodi, Varthur)
      {
        host: hostUsers[1],
        list: [
          {
            title: 'Whitefield Prestige Tech Park Society Charger',
            desc: 'Convenient for tech professionals working in ITPL/Prestige. 11kW Type-2 AC charger.',
            addr: 'Prestige Ozone, Whitefield Main Road',
            pin: '560066',
            coords: [77.7495, 12.9698],
            conn: 'Type 2',
            kw: 11,
            type: 'PER_KWH',
            price: 15,
            status: 'VERIFIED',
          },
          {
            title: 'ITPL Main Road Export Promotion Zone CCS2 Hub',
            desc: 'High speed DC charging right outside International Tech Park Bangalore. Shaded canopy.',
            addr: 'Whitefield Main Road, Pattandur Agrahara',
            pin: '560066',
            coords: [77.7285, 12.9852],
            conn: 'CCS2',
            kw: 50,
            type: 'PER_KWH',
            price: 18,
            status: 'VERIFIED',
          },
          {
            title: 'Marathahalli Bridge ORR 50kW DC Fast Hub',
            desc: 'Convenient Outer Ring Road charging hub near multiplex. CCTV monitored with 24/7 security.',
            addr: 'Kalamandir Junction, Marathahalli',
            pin: '560037',
            coords: [77.7011, 12.9591],
            conn: 'CCS2',
            kw: 50,
            type: 'PER_KWH',
            price: 17,
            status: 'VERIFIED',
          },
          {
            title: 'Brookefield Kundalahalli Gate 11kW AC Bay',
            desc: 'Quiet gated residential community with dedicated charging bay. Reliable copper earthing.',
            addr: 'Kundalahalli Main Road, Brookefield',
            pin: '560037',
            coords: [77.7166, 12.9654],
            conn: 'Type 2',
            kw: 11,
            type: 'PER_KWH',
            price: 14,
            status: 'VERIFIED',
          },
          {
            title: 'Hoodi Circle Industrial Estate 50kW CCS2 Point',
            desc: 'Heavy-duty 50kW DC charger catering to commuters travelling between Whitefield and KR Puram.',
            addr: 'Hoodi Main Road, Mahadevapura Zone',
            pin: '560048',
            coords: [77.7188, 12.9922],
            conn: 'CCS2',
            kw: 50,
            type: 'PER_KWH',
            price: 18,
            status: 'VERIFIED',
          },
          {
            title: 'Varthur Lakeview Residential 3-Pin Socket (3.3kW)',
            desc: 'Ideal for EV bike and scooter slow charging. Awaiting property verification completion.',
            addr: 'Gunjur-Varthur Main Road, Varthur',
            pin: '560087',
            coords: [77.7392, 12.9378],
            conn: '3-pin',
            kw: 3.3,
            type: 'PER_HOUR',
            price: 55,
            status: 'PENDING_VERIFICATION',
          },
        ],
      },
      // Zone 3: North Bengaluru & Airport Corridor (Hebbal, Manyata, Yelahanka, Kalyan Nagar, Sadashivanagar, Malleshwaram)
      {
        host: hostUsers[2],
        list: [
          {
            title: 'Hebbal Flyover Junction 22kW Fast AC Station',
            desc: 'Strategically located near Hebbal flyover on airport approach road. Secure basement parking.',
            addr: 'Bellary Road, Near Baptist Hospital, Hebbal',
            pin: '560024',
            coords: [77.5925, 13.0358],
            conn: 'Type 2',
            kw: 22,
            type: 'PER_KWH',
            price: 15,
            status: 'VERIFIED',
          },
          {
            title: 'Manyata Tech Park Gateway 60kW DC Hyper-Bay',
            desc: 'High capacity fast DC charger right across Manyata Embassy Business Park Gate 1.',
            addr: 'Outer Ring Road, Nagavara, Manyata Tech Park',
            pin: '560045',
            coords: [77.6197, 13.0475],
            conn: 'CCS2',
            kw: 60,
            type: 'PER_KWH',
            price: 22,
            status: 'VERIFIED',
          },
          {
            title: 'Yelahanka New Town 4th Phase 3.3kW EV Socket',
            desc: 'Private gated villa charging port. 16A 3-pin setup ideal for electric scooters and overnight top-ups.',
            addr: 'Sector B, 4th Phase, Yelahanka New Town',
            pin: '560064',
            coords: [77.5963, 13.1007],
            conn: '3-pin',
            kw: 3.3,
            type: 'PER_HOUR',
            price: 50,
            status: 'VERIFIED',
          },
          {
            title: 'Kalyan Nagar HRBR Layout 2nd Block Bharat AC Hub',
            desc: 'Surrounded by cafes and retail stores. Reliable earthing and surge protection installed.',
            addr: 'CMR Road, HRBR Layout 2nd Block, Kalyan Nagar',
            pin: '560043',
            coords: [77.6432, 13.0238],
            conn: 'Bharat AC-001',
            kw: 10,
            type: 'PER_KWH',
            price: 13,
            status: 'VERIFIED',
          },
          {
            title: 'Sadashivanagar Bashyam Circle 22kW Fast Wallbox',
            desc: 'Upscale bungalow driveway with ample turnaround clearance for luxury electric SUVs.',
            addr: '11th Cross, Near Bashyam Circle, Sadashivanagar',
            pin: '560080',
            coords: [77.5812, 13.0068],
            conn: 'Type 2',
            kw: 22,
            type: 'PER_KWH',
            price: 16,
            status: 'VERIFIED',
          },
          {
            title: 'Malleshwaram 15th Cross Home Socket (3-pin 3.3kW)',
            desc: 'Ideal for overnight two-wheeler and four-wheeler slow AC top-ups in traditional residential area.',
            addr: '15th Cross, Sampige Road, Malleshwaram',
            pin: '560003',
            coords: [77.5713, 13.0031],
            conn: '3-pin',
            kw: 3.3,
            type: 'PER_HOUR',
            price: 55,
            status: 'VERIFIED',
          },
        ],
      },
      // Zone 4: South Bengaluru & Tech Corridor (Electronic City 1 & 2, BTM, JP Nagar, Bannerghatta, Jayanagar)
      {
        host: hostUsers[3],
        list: [
          {
            title: 'Electronic City Phase 1 Infosys Gate 50kW Station',
            desc: 'Prime tech park location near Infosys campus. Dual gun CCS2 fast charger with automated access.',
            addr: 'Hosur Road, Electronic City Phase 1',
            pin: '560100',
            coords: [77.6648, 12.8452],
            conn: 'CCS2',
            kw: 50,
            type: 'PER_KWH',
            price: 18,
            status: 'VERIFIED',
          },
          {
            title: 'Electronic City Phase 2 Tech Hub 22kW AC Wallbox',
            desc: 'Walking distance to major IT offices. Weatherproof installation with certified safety breakers.',
            addr: 'TVS Cross, Electronic City Phase 2',
            pin: '560100',
            coords: [77.6852, 12.8398],
            conn: 'Type 2',
            kw: 22,
            type: 'PER_KWH',
            price: 14,
            status: 'VERIFIED',
          },
          {
            title: 'BTM Layout 2nd Stage Udupi Garden 7.4kW Point',
            desc: 'Covered parking bay near Udupi Garden signal. Convenient for daily commuters.',
            addr: '100ft Road, BTM 2nd Stage',
            pin: '560076',
            coords: [77.6083, 12.9166],
            conn: 'Type 2',
            kw: 7.4,
            type: 'PER_HOUR',
            price: 95,
            status: 'VERIFIED',
          },
          {
            title: 'JP Nagar 7th Phase Brigade Gardenia EV Point',
            desc: 'Temporarily paused by host during society transformer maintenance.',
            addr: 'RBI Layout, JP Nagar 7th Phase',
            pin: '560078',
            coords: [77.5815, 12.8906],
            conn: '3-pin',
            kw: 3.3,
            type: 'PER_HOUR',
            price: 50,
            status: 'PAUSED',
          },
          {
            title: 'Bannerghatta Road Arekere Gate 30kW DC Fast Bay',
            desc: 'Located right off Bannerghatta Main Road. Fast charging with coffee shop in building.',
            addr: 'Near Arekere MICO Layout, Bannerghatta Road',
            pin: '560076',
            coords: [77.5992, 12.8872],
            conn: 'CCS2',
            kw: 30,
            type: 'PER_KWH',
            price: 16,
            status: 'VERIFIED',
          },
          {
            title: 'Jayanagar 4th Block Community Bharat AC-001 Point',
            desc: 'Under community verification. Reliable earthing and surge protection.',
            addr: '32nd Cross, 4th T Block, Jayanagar',
            pin: '560041',
            coords: [77.5833, 12.925],
            conn: 'Bharat AC-001',
            kw: 10,
            type: 'PER_KWH',
            price: 13,
            status: 'PENDING_VERIFICATION',
          },
        ],
      },
      // Zone 5: West & South-West Bengaluru (Rajajinagar, Basavanagudi, Banashankari, Peenya, Yeshwanthpur, Sarjapur)
      {
        host: hostUsers[4],
        list: [
          {
            title: 'Rajajinagar 1st Block Metro 11kW Type 2 Bay',
            desc: 'Just 100 meters from Rajajinagar Metro station. Dedicated MCB breaker and heavy earthing.',
            addr: 'Dr. Rajkumar Road, 1st Block, Rajajinagar',
            pin: '560010',
            coords: [77.5534, 12.9882],
            conn: 'Type 2',
            kw: 11,
            type: 'PER_KWH',
            price: 14,
            status: 'VERIFIED',
          },
          {
            title: 'Basavanagudi Gandhi Bazaar EV Point (3-pin 3.3kW)',
            desc: 'Heritage neighbourhood charging socket. Perfect for electric scooters while shopping.',
            addr: 'Gandhi Bazaar Main Road, Basavanagudi',
            pin: '560004',
            coords: [77.5736, 12.9421],
            conn: '3-pin',
            kw: 3.3,
            type: 'PER_HOUR',
            price: 50,
            status: 'VERIFIED',
          },
          {
            title: 'Banashankari 2nd Stage BDA Complex Bharat AC Bay',
            desc: 'Easy turnaround space for SUVs and commercial EVs. High voltage surge protection.',
            addr: '24th Cross, 2nd Stage, Banashankari',
            pin: '560070',
            coords: [77.5731, 12.9254],
            conn: 'Bharat AC-001',
            kw: 10,
            type: 'PER_KWH',
            price: 13,
            status: 'VERIFIED',
          },
          {
            title: 'Peenya 1st Stage Industrial 60kW DC Hyper-Charger',
            desc: 'Heavy duty 60kW fast charger for passenger and commercial EVs. Shaded industrial bay.',
            addr: 'Tumkur Road, Peenya 1st Stage',
            pin: '560058',
            coords: [77.5255, 13.0285],
            conn: 'CCS2',
            kw: 60,
            type: 'PER_KWH',
            price: 20,
            status: 'VERIFIED',
          },
          {
            title: 'Yeshwanthpur APMC Yard Junction Bharat AC Hub',
            desc: 'Rejected by admin due to missing property owner NOC documentation.',
            addr: 'Pipeline Road, Yeshwanthpur',
            pin: '560022',
            coords: [77.5458, 13.0238],
            conn: 'Bharat AC-001',
            kw: 10,
            type: 'PER_KWH',
            price: 12,
            status: 'REJECTED',
          },
          {
            title: 'Sarjapur Road Doddakannelli 7.4kW Fast AC Socket',
            desc: 'Quiet residential villa charger with shaded parking on Sarjapur tech corridor.',
            addr: 'Doddakannelli, Sarjapur Main Road',
            pin: '560035',
            coords: [77.6895, 12.9105],
            conn: 'Type 2',
            kw: 7.4,
            type: 'PER_HOUR',
            price: 100,
            status: 'VERIFIED',
          },
        ],
      },
    ];

    const allCreatedChargers = [];
    const allVerifications = [];

    let imgIndex = 0;
    for (const group of chargerDataTemplates) {
      for (const item of group.list) {
        // Deterministic round-robin assignment: neighboring bays alternate images (bay 1 -> image 1, bay 2 -> image 2, etc.)
        const assignedImage = BAY_IMAGES[imgIndex % BAY_IMAGES.length];
        const photos = [assignedImage];
        imgIndex++;

        const charger = await Charger.create({
          hostId: group.host._id,
          title: item.title,
          description: item.desc,
          address: item.addr,
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: item.pin,
          location: {
            type: 'Point',
            coordinates: item.coords,
          },
          connectorType: item.conn,
          powerKW: item.kw,
          pricingType: item.type,
          price: item.price,
          photos,
          houseRules: [
            'Park inside designated white grid lines',
            'No smoking in charger premises',
            'Please disconnect and clear bay once charging concludes',
          ],
          safetyFeatures: [
            'Dedicated Copper Rod Earthing (Tested < 3 Ohms)',
            'Schneider 32A MCB + 30mA RCCB Shock Protection',
            'IP65 Rated Weatherproof Enclosure',
            '24/7 CCTV Monitored Bay',
            'Dry Chemical Powder Fire Extinguisher',
          ],
          status: item.status,
          liveStatus: item.status === 'VERIFIED' ? 'AVAILABLE' : 'OFFLINE',
          instantBooking: true,
          emergencySupport: true,
          availabilityMode: 'INSTANT_BOOKING',
          allowsReservations: true,
          requiresApproval: false,
          responseTimeMinutes: 5,
          idleFeePerMinute: 2,
          contactPhone: group.host.phone,
          weeklySchedule: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
            day,
            open: '06:00',
            close: '23:00',
            isActive: true,
          })),
          ratingAvg: item.status === 'VERIFIED' ? 4.8 : 5.0,
          reviewCount: item.status === 'VERIFIED' ? 4 : 0,
        });

        allCreatedChargers.push(charger);

        // Create Verification document for each charger
        const isApproved = item.status === 'VERIFIED';
        const isRejected = item.status === 'REJECTED';
        const verStatus = isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING';

        const verification = await Verification.create({
          hostId: group.host._id,
          chargerId: charger._id,
          idProofType: 'AADHAAR',
          idProofUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
          propertyProofType: 'ELECTRICITY_BILL',
          propertyProofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
          nocDocumentUrl: isRejected ? '' : 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600',
          safetyChecklist: {
            earthingVerified: true,
            mcbRccbInstalled: true,
            weatherproofProtection: true,
            cctvSurveillance: true,
            fireExtinguisherNearby: true,
          },
          propertyConsentDeclared: true,
          status: verStatus,
          adminFeedback: isApproved
            ? 'BESCOM electrical earthing inspection and apartment society NOC verified. Approved for public listing.'
            : isRejected
            ? 'Society NOC missing seal and flat owner signature. Please re-upload.'
            : '',
          reviewedBy: isApproved || isRejected ? admin._id : undefined,
          reviewedAt: isApproved || isRejected ? new Date() : undefined,
        });

        allVerifications.push(verification);
      }
    }

    console.log(`[Seed] Created ${allCreatedChargers.length} Bengaluru chargers and verifications.`);

    // 4. Create 50 Bookings (Past, Today, Upcoming)
    console.log('[Seed] Creating 50 Bookings...');

    const verifiedChargers = allCreatedChargers.filter((c) => c.status === 'VERIFIED');
    const createdBookings = [];

    const now = new Date();
    const bookedSlotsSet = new Set();

    let bookingCounter = 1;
    const bookingConfigs = [
      ...Array.from({ length: 30 }, (_, i) => ({
        daysOffset: -(i % 14 + 1),
        hour: 8 + (i % 12),
        status: 'COMPLETED',
        paymentStatus: 'PAID',
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        daysOffset: (i % 5) + 1,
        hour: 9 + (i % 10),
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        daysOffset: 0,
        hour: (now.getUTCHours() + 2 + i) % 24,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        daysOffset: -(i + 2),
        hour: 14 + i,
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED',
      })),
    ];

    for (let i = 0; i < bookingConfigs.length; i++) {
      const config = bookingConfigs[i];
      const charger = verifiedChargers[i % verifiedChargers.length];
      const user = evOwners[i % evOwners.length];
      const vehicle = vehicles[i % vehicles.length];

      const slotDate = new Date();
      slotDate.setUTCDate(slotDate.getUTCDate() + config.daysOffset);
      slotDate.setUTCHours(config.hour, 0, 0, 0);

      const slotKey = `${charger._id}_${slotDate.toISOString()}`;
      if (bookedSlotsSet.has(slotKey)) {
        slotDate.setUTCHours((config.hour + 2) % 24, 0, 0, 0);
      }
      bookedSlotsSet.add(`${charger._id}_${slotDate.toISOString()}`);

      const slotEnd = new Date(slotDate.getTime() + 60 * 60 * 1000);
      const baseAmount = charger.pricingType === 'PER_HOUR' ? charger.price : Math.round(charger.price * 25);
      const platformFee = Math.round(baseAmount * 0.05);
      const totalAmount = baseAmount + platformFee;
      const hostEarnings = baseAmount;

      const codeNumber = String(1000 + bookingCounter++).padStart(4, '0');
      const bookingCode = `CS-BLR-${codeNumber}`;

      let qrCodeDataUrl = '';
      if (['CONFIRMED', 'COMPLETED'].includes(config.status)) {
        qrCodeDataUrl = await QRCode.toDataURL(
          JSON.stringify({
            code: bookingCode,
            chargerId: charger._id,
            slotStart: slotDate.toISOString(),
            status: config.status,
          })
        );
      }

      const booking = await Booking.create({
        bookingCode,
        userId: user._id,
        hostId: charger.hostId,
        chargerId: charger._id,
        vehicleId: vehicle._id,
        slotStart: slotDate,
        slotEnd,
        durationMinutes: 60,
        baseAmount,
        platformFee,
        totalAmount,
        hostEarnings,
        status: config.status,
        paymentStatus: config.paymentStatus,
        razorpayOrderId: `order_seed_${100000 + i}`,
        razorpayPaymentId: config.paymentStatus === 'PAID' ? `pay_seed_${200000 + i}` : '',
        razorpaySignature: config.paymentStatus === 'PAID' ? `sig_seed_${300000 + i}` : '',
        refundAmount: config.status === 'CANCELLED' ? totalAmount : 0,
        cancellationReason: config.status === 'CANCELLED' ? 'EV trip rescheduled by owner' : '',
        cancelledAt: config.status === 'CANCELLED' ? new Date() : undefined,
        heldUntil: new Date(Date.now() + 10 * 60 * 1000),
        qrCodeDataUrl,
        hasReview: false,
      });

      createdBookings.push(booking);
    }

    console.log(`[Seed] Created ${createdBookings.length} bookings.`);

    // 5. Create Reviews for Completed Bookings
    console.log('[Seed] Creating Reviews for completed bookings...');

    const completedBookings = createdBookings.filter((b) => b.status === 'COMPLETED');
    const sampleReviews = [
      { rating: 5, comment: 'Super fast charging and great hospitality! Host even offered drinking water while we waited in Koramangala.' },
      { rating: 5, comment: 'Clean driveway, secure premises, and zero hassle connecting my Nexon EV in Indiranagar. 10/10 recommendation.' },
      { rating: 4, comment: 'Solid 22kW output as promised. HSR Layout society security was polite and opened the boom barrier right away.' },
      { rating: 5, comment: 'Lifesaver during my Bangalore commute to Whitefield. Smooth slot reservation and QR scan.' },
      { rating: 4, comment: 'Very well maintained setup near Manyata Tech Park. Earthing light was green, charged my ZS EV to 80% in 50 minutes.' },
      { rating: 5, comment: 'Seamless payment via Razorpay. Host Rajesh was super friendly and knowledgeable about EVs.' },
      { rating: 5, comment: 'Great location right near Electronic City toll. Clean restroom and shade for the car.' },
      { rating: 4, comment: 'App is very intuitive. Booking confirmation was instant and check-in QR code worked smoothly at Bellandur.' },
    ];

    for (let i = 0; i < Math.min(completedBookings.length, 20); i++) {
      const booking = completedBookings[i];
      const revTemplate = sampleReviews[i % sampleReviews.length];

      await Review.create({
        bookingId: booking._id,
        chargerId: booking.chargerId,
        userId: booking.userId,
        rating: revTemplate.rating,
        comment: revTemplate.comment,
      });

      booking.hasReview = true;
      await booking.save();
    }

    console.log('==================================================');
    console.log('🎉 CHARGESHARE INDIA SEED DATA COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
    console.log(`Users: 1 Admin, 5 Hosts, 3 EV Owners (Bengaluru, Karnataka)`);
    console.log(`Vehicles: ${vehicles.length}`);
    console.log(`Chargers: ${allCreatedChargers.length} exclusively within Bengaluru (Lat: 12.80-13.15, Lng: 77.45-77.75)`);
    console.log(`Bookings: ${createdBookings.length}`);
    console.log(`==================================================`);
    console.log(`🔑 DEMO CREDENTIALS:`);
    if (!isProd) {
      console.log(`Admin:    admin@chargeshare.in    / ${adminPassword || '[Provisioned via SEED_ADMIN_PASSWORD or create-admin]'} (Local Dev Only)`);
      console.log(`Host:     host1@chargeshare.in    / HostPassword123!`);
      console.log(`EV Owner: owner1@chargeshare.in   / OwnerPassword123!`);
    } else {
      console.log(`Admin:    [PROD - Provisioned via 'npm run create-admin']`);
    }
    console.log('==================================================');

    if (exitOnComplete) process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/seed.js')) {
  seedDatabase(true);
}
