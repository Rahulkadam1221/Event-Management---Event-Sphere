import { PrismaClient, UserRole, EventStatus, TicketType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding EventSphere database...');

  // Clean slate
  await prisma.messageReaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.ticketTier.deleteMany();
  await prisma.event.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('password123', 12);

  // Create users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@eventsphere.com',
      password,
      name: 'EventSphere Admin',
      role: UserRole.ADMIN,
      isVerified: true,
    },
  });

  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@eventsphere.com',
      password,
      name: 'Sarah Jenkins',
      role: UserRole.ORGANIZER,
      isVerified: true,
      bio: 'Premier tech event organizer with 10+ years of experience.',
    },
  });

  const attendee = await prisma.user.create({
    data: {
      email: 'attendee@eventsphere.com',
      password,
      name: 'Alex Kumar',
      role: UserRole.ATTENDEE,
      isVerified: true,
    },
  });

  console.log(`✅ Created users: ${admin.email}, ${organizer.email}, ${attendee.email}`);

  // Create Events
  const eventsData = [
    {
      title: 'NextGen Tech Summit 2026',
      slug: 'nextgen-tech-summit-2026',
      description: 'The premier technology conference bringing together 5000+ developers, designers, and innovators. Three days of cutting-edge keynotes, workshops, and networking.',
      shortDesc: 'The premier tech conference for developers and innovators.',
      category: 'Technology',
      tags: ['AI', 'Web3', 'Cloud', 'DevOps', 'React'],
      venue: 'Bombay Exhibition Centre',
      address: '1234 Tech Park, NESCO Complex',
      city: 'Mumbai',
      state: 'Maharashtra',
      startDate: new Date('2026-09-15'),
      endDate: new Date('2026-09-17'),
      startTime: '09:00',
      endTime: '18:00',
      capacity: 5000,
      availableSeats: 4750,
      isFeatured: true,
      isTrending: true,
      status: EventStatus.PUBLISHED,
      organizerId: organizer.id,
    },
    {
      title: 'Neon Horizons Music Festival',
      slug: 'neon-horizons-music-festival-2026',
      description: 'A three-day music extravaganza featuring 50+ artists across 5 stages. International DJs, live bands, art installations, and gourmet food courts.',
      shortDesc: '3-day festival with 50+ artists across 5 stages.',
      category: 'Music',
      tags: ['EDM', 'Live Music', 'Festival', 'DJ'],
      venue: 'MMRDA Grounds',
      address: 'Bandra Kurla Complex',
      city: 'Mumbai',
      state: 'Maharashtra',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-03'),
      startTime: '16:00',
      endTime: '02:00',
      capacity: 15000,
      availableSeats: 12000,
      isFeatured: true,
      isTrending: true,
      status: EventStatus.PUBLISHED,
      organizerId: organizer.id,
    },
    {
      title: 'Design Systems Workshop',
      slug: 'design-systems-workshop-2026',
      description: 'An intensive full-day workshop on building scalable design systems with Figma, Tokens Studio, and React. Led by industry design leaders from Airbnb and Figma.',
      shortDesc: 'Build scalable design systems with Figma and React.',
      category: 'Design',
      tags: ['Figma', 'Design Systems', 'UI/UX', 'React'],
      venue: 'WeWork BKC',
      address: 'G Block, Bandra Kurla Complex',
      city: 'Mumbai',
      state: 'Maharashtra',
      startDate: new Date('2026-08-20'),
      endDate: new Date('2026-08-20'),
      startTime: '10:00',
      endTime: '18:00',
      capacity: 200,
      availableSeats: 45,
      isFeatured: false,
      isTrending: true,
      status: EventStatus.PUBLISHED,
      organizerId: organizer.id,
    },
    {
      title: 'Startup Founders Summit',
      slug: 'startup-founders-summit-2026',
      description: 'Connect with 500+ startup founders, VCs, and angel investors. Pitch competitions, panel discussions, and exclusive networking sessions with industry leaders.',
      shortDesc: 'Connect with founders, VCs, and investors.',
      category: 'Business',
      tags: ['Startup', 'VC', 'Networking', 'Pitch'],
      venue: 'ITC Grand Central',
      address: '287 Dr. B. Ambedkar Rd',
      city: 'Mumbai',
      state: 'Maharashtra',
      startDate: new Date('2026-11-05'),
      endDate: new Date('2026-11-06'),
      startTime: '09:00',
      endTime: '19:00',
      capacity: 800,
      availableSeats: 320,
      isFeatured: true,
      isTrending: false,
      status: EventStatus.PUBLISHED,
      organizerId: organizer.id,
    },
    {
      title: 'Michelin Chef Masterclass',
      slug: 'michelin-chef-masterclass-2026',
      description: 'An exclusive culinary experience with Michelin-starred chef Vikas Khanna. Learn professional cooking techniques, plating, and food science in this hands-on masterclass.',
      shortDesc: 'Learn from Michelin-starred chef Vikas Khanna.',
      category: 'Food',
      tags: ['Cooking', 'Masterclass', 'Culinary', 'Michelin'],
      venue: 'Sofitel Mumbai BKC',
      address: 'C-57, G Block, BKC',
      city: 'Mumbai',
      state: 'Maharashtra',
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-10'),
      startTime: '11:00',
      endTime: '16:00',
      capacity: 50,
      availableSeats: 12,
      isFeatured: false,
      isTrending: false,
      status: EventStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  ];

  for (const eventData of eventsData) {
    const event = await prisma.event.create({ data: eventData });

    const generalPrice = eventData.category === 'Music' ? 2499 : eventData.category === 'Technology' ? 4999 : 1999;
    const vipPrice = eventData.category === 'Music' ? 6999 : eventData.category === 'Technology' ? 12999 : 4999;
    const studentPrice = eventData.category === 'Music' ? 999 : eventData.category === 'Technology' ? 1999 : 799;

    await prisma.ticketTier.createMany({
      data: [
        {
          eventId: event.id,
          name: 'General Admission',
          type: TicketType.GENERAL,
          price: generalPrice,
          quantity: Math.floor(event.capacity * 0.6),
          sold: Math.floor(Math.random() * 100),
          description: 'Standard entry with access to all general areas.',
          perks: [],
        },
        {
          eventId: event.id,
          name: 'VIP Access',
          type: TicketType.VIP,
          price: vipPrice,
          quantity: Math.floor(event.capacity * 0.2),
          sold: Math.floor(Math.random() * 30),
          description: 'VIP lounge access, premium seating, and exclusive networking.',
          perks: ['VIP Lounge', 'Premium Seating', 'Exclusive Networking', 'Gift Bag'],
        },
        {
          eventId: event.id,
          name: 'Student Pass',
          type: TicketType.STUDENT,
          price: studentPrice,
          quantity: Math.floor(event.capacity * 0.2),
          sold: Math.floor(Math.random() * 50),
          description: 'Discounted entry for students with valid ID.',
          perks: [],
        },
      ],
    });

    console.log(`✅ Created event: ${event.title}`);
  }

  // Create coupons
  await prisma.coupon.createMany({
    data: [
      {
        code: 'SPHERE20',
        discountType: 'percentage',
        discountValue: 20,
        maxUses: 100,
        minOrderAmount: 1000,
      },
      {
        code: 'EARLYBIRD',
        discountType: 'percentage',
        discountValue: 15,
        maxUses: 200,
        minOrderAmount: 500,
      },
      {
        code: 'FLAT500',
        discountType: 'fixed',
        discountValue: 500,
        maxUses: 50,
        minOrderAmount: 2000,
      },
    ],
  });

  console.log('✅ Created coupons: SPHERE20, EARLYBIRD, FLAT500');
  console.log('\n🎉 Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Admin:     admin@eventsphere.com     / password123');
  console.log('📧 Organizer: organizer@eventsphere.com / password123');
  console.log('📧 Attendee:  attendee@eventsphere.com  / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
