import bcrypt from "bcryptjs";
import { getPrisma } from "../src/prisma.js";
import { Role } from "@prisma/client";

const CATEGORIES = [
  "Account and Access",
  "Hardware",
  "Software",
  "Network",
];

const RELATED_SYSTEMS = [
  { name: "Email", description: "Corporate Exchange / Webmail" },
  { name: "Campus Wi-Fi", description: "Wireless network connectivity" },
  { name: "VPN", description: "Remote corporate VPN access" },
  { name: "LEB2 App", description: "Learning platform" },
  { name: "Grade Submission App", description: "Academic portal" },
  { name: "Printer", description: "Office network printers" },
  { name: "Corporate Laptop", description: "Assigned laptop hardware" },
];

const LAB2_REQUESTERS = [
  {
    fullName: "Sorawit Chaithong",
    email: "sorawit.chaithong@email.com",
    department: "Science",
    isActive: true,
  },
  {
    fullName: "Piti Srisongkram",
    email: "piti.srisongkram@gmail.com",
    department: "Engineering",
    isActive: true,
  },
  {
    fullName: "John Doe",
    email: "john.doe@email.com",
    department: "Finance",
    isActive: true,
  },
  {
    fullName: "Jane Doe",
    email: "jane.doe@email.com",
    department: "Human Resources",
    isActive: true,
  },
  {
    fullName: "Alexanders Aleisters (Inactive)",
    email: "alexanders.aleisters@email.com",
    department: "Operations",
    isActive: false,
  },
];

interface SeedUser {
  fullName: string;
  email: string;
  role: Role;
  department: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

const SEED_USERS: SeedUser[] = [
  // 1-5: Lab 2 1:1 sequence alignment
  {
    fullName: "Sorawit Chaithong",
    email: "sorawit.chaithong@email.com",
    role: Role.REQUESTER,
    department: "Science",
    isActive: true,
    mustChangePassword: false,
  },
  {
    fullName: "Piti Srisongkram",
    email: "piti.srisongkram@gmail.com",
    role: Role.IT_STAFF,
    department: "Engineering",
    isActive: true,
    mustChangePassword: false,
  },
  {
    fullName: "John Doe",
    email: "john.doe@email.com",
    role: Role.REQUESTER,
    department: "Finance",
    isActive: true,
    mustChangePassword: false,
  },
  {
    fullName: "Jane Doe",
    email: "jane.doe@email.com",
    role: Role.REQUESTER,
    department: "Human Resources",
    isActive: true,
    mustChangePassword: false,
  },
  {
    fullName: "Alexanders Aleisters (Inactive)",
    email: "alexanders.aleisters@email.com",
    role: Role.REQUESTER,
    department: "Operations",
    isActive: false,
    mustChangePassword: true,
  },
  // Lab 3 Additional Accounts & Aliases
  {
    fullName: "Piti Srisongkram",
    email: "piti.srisongkram@email.com",
    role: Role.IT_STAFF,
    department: "Engineering",
    isActive: true,
    mustChangePassword: false,
  },
  {
    fullName: "Alexanders Aleisters (Inactive)",
    email: "alexanders.inactive@email.com",
    role: Role.REQUESTER,
    department: "Operations",
    isActive: false,
    mustChangePassword: true,
  },
  {
    fullName: "Bob Smith",
    email: "bob.smith@email.com",
    role: Role.REQUESTER,
    department: "Finance",
    isActive: true,
    mustChangePassword: true, // For first-login password test
  },
  {
    fullName: "Alice Johnson",
    email: "alice.johnson@email.com",
    role: Role.REQUESTER,
    department: "Marketing",
    isActive: true,
    mustChangePassword: false,
  },
  {
    fullName: "Somchai Jaidee",
    email: "somchai.it@email.com",
    role: Role.IT_STAFF,
    department: "IT Support",
    isActive: true,
    mustChangePassword: false,
  },
  {
    fullName: "Wichai Service",
    email: "wichai.it@email.com",
    role: Role.IT_STAFF,
    department: "IT Infrastructure",
    isActive: true,
    mustChangePassword: false,
  },
  {
    fullName: "Charlie Inactive",
    email: "charlie.it.inactive@email.com",
    role: Role.IT_STAFF,
    department: "IT Support",
    isActive: false,
    mustChangePassword: true,
  },
  {
    fullName: "Admin TokTickIT",
    email: "admin.toktickit@email.com",
    role: Role.ADMIN,
    department: "IT Administration",
    isActive: true,
    mustChangePassword: false,
  },
];

async function main() {
  const prisma = getPrisma();
  const defaultPasswordHash = await bcrypt.hash("Password@2026", 10);

  // 1. Seed Categories (idempotent: never overwrites isActive)
  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }
  console.log("Seeded categories successfully:", CATEGORIES);

  // 2. Seed Related Systems (idempotent: never overwrites isActive)
  for (const system of RELATED_SYSTEMS) {
    await prisma.relatedSystem.upsert({
      where: { name: system.name },
      update: { description: system.description },
      create: { name: system.name, description: system.description, isActive: true },
    });
  }
  console.log("Seeded related systems successfully:", RELATED_SYSTEMS.map((s) => s.name));

  // 3. Seed Users (idempotent: preserve passwordHash, mustChangePassword, and isActive)
  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        role: u.role,
        department: u.department,
      },
      create: {
        fullName: u.fullName,
        email: u.email,
        passwordHash: defaultPasswordHash,
        role: u.role,
        department: u.department,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
      },
    });
  }
  console.log("Seeded Lab 3 users successfully:", SEED_USERS.map((u) => u.email));

  // 4. Seed RequesterUser strictly matching Lab 2 expectations (idempotent: no destructive deleteMany)
  for (const req of LAB2_REQUESTERS) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: { fullName: req.fullName, department: req.department },
      create: { fullName: req.fullName, email: req.email, department: req.department, isActive: req.isActive },
    });
  }
  console.log("Seeded Lab 2 requester users successfully:", LAB2_REQUESTERS.map((r) => r.fullName));

  // 5. Seed TicketSequence for current year
  const currentYear = new Date().getFullYear();
  await prisma.ticketSequence.upsert({
    where: { year: currentYear },
    update: {},
    create: { year: currentYear, lastSequence: 0 },
  });
  console.log(`Seeded ticket sequence for year ${currentYear}`);

  // 6. Seed Sample Tickets and Actions Taken for Lab 4
  const sorawit = await prisma.user.findUnique({ where: { email: "sorawit.chaithong@email.com" } });
  const john = await prisma.user.findUnique({ where: { email: "john.doe@email.com" } });
  const piti = await prisma.user.findUnique({ where: { email: "piti.srisongkram@gmail.com" } });
  const somchai = await prisma.user.findUnique({ where: { email: "somchai.it@email.com" } });
  const wichai = await prisma.user.findUnique({ where: { email: "wichai.it@email.com" } });

  const catNetwork = await prisma.category.findUnique({ where: { name: "Network" } });
  const catAccount = await prisma.category.findUnique({ where: { name: "Account and Access" } });
  const catHardware = await prisma.category.findUnique({ where: { name: "Hardware" } });
  const catSoftware = await prisma.category.findUnique({ where: { name: "Software" } });

  const sysWifi = await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } });
  const sysEmail = await prisma.relatedSystem.findUnique({ where: { name: "Email" } });
  const sysLaptop = await prisma.relatedSystem.findUnique({ where: { name: "Corporate Laptop" } });
  const sysGrade = await prisma.relatedSystem.findUnique({ where: { name: "Grade Submission App" } });

  if (
    sorawit &&
    piti &&
    somchai &&
    wichai &&
    john &&
    catNetwork &&
    catAccount &&
    catHardware &&
    catSoftware &&
    sysWifi &&
    sysEmail &&
    sysLaptop &&
    sysGrade
  ) {
    const t1 = await prisma.ticket.upsert({
      where: { ticketNumber: "TKT-2026-000001" },
      update: {},
      create: {
        ticketNumber: "TKT-2026-000001",
        requesterId: sorawit.id,
        categoryId: catNetwork.id,
        relatedSystemId: sysWifi.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
        summary: "Campus Wi-Fi intermittent connection in CB2 4th Floor",
        description: "Wi-Fi connection keeps dropping every 10-15 minutes when attending lectures in CB2-401.",
        ticketOwner: piti.fullName,
        ticketOwnerId: piti.id,
      },
    });

    const t1ActionCount = await prisma.actionTaken.count({ where: { ticketId: t1.id } });
    if (t1ActionCount === 0) {
      await prisma.actionTaken.create({
        data: {
          ticketId: t1.id,
          performedById: piti.id,
          actionDateTime: new Date("2026-10-02T09:00:00Z"),
          description: "Inspected AP signal strength and frequency logs in room CB2-401.",
          result: "Discovered severe co-channel interference on 2.4GHz band from neighboring rogue AP.",
          followUpRequired: true,
          followUpNote: "Re-tune AP channel to 6 or 11 after hours and re-test throughput.",
          attachmentNotes: "See Wi-Fi survey spectrum heatmap wifi_cb2_4f.png",
        },
      });

      await prisma.actionTaken.create({
        data: {
          ticketId: t1.id,
          performedById: somchai.id,
          actionDateTime: new Date("2026-10-02T11:30:00Z"),
          description: "Adjusted channel width to 20MHz and forced 5GHz band steering on AP-CB2-401.",
          result: "Signal-to-noise ratio improved by 14dB; ping latency dropped below 12ms.",
          followUpRequired: false,
        },
      });
    }

    await prisma.ticket.upsert({
      where: { ticketNumber: "TKT-2026-000002" },
      update: {},
      create: {
        ticketNumber: "TKT-2026-000002",
        requesterId: sorawit.id,
        categoryId: catAccount.id,
        relatedSystemId: sysEmail.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "OPEN",
        summary: "Request secondary email alias for research lab",
        description: "Need research-alias@eng.kmutt.ac.th linked to primary email account.",
        ticketOwner: "Unassigned",
        ticketOwnerId: null,
      },
    });

    const t3 = await prisma.ticket.upsert({
      where: { ticketNumber: "TKT-2026-000003" },
      update: {},
      create: {
        ticketNumber: "TKT-2026-000003",
        requesterId: sorawit.id,
        categoryId: catHardware.id,
        relatedSystemId: sysLaptop.id,
        requestedPriority: "URGENT",
        itPriority: "URGENT",
        currentStatus: "WAITING_FOR_REQUESTER",
        summary: "Laptop screen flickering with vertical lines after display hinge dropped",
        description: "Staff laptop dropped from desk; right hinge is loose and display shows artifacts.",
        ticketOwner: wichai.fullName,
        ticketOwnerId: wichai.id,
      },
    });

    const t3ActionCount = await prisma.actionTaken.count({ where: { ticketId: t3.id } });
    if (t3ActionCount === 0) {
      await prisma.actionTaken.create({
        data: {
          ticketId: t3.id,
          performedById: wichai.id,
          actionDateTime: new Date("2026-10-02T13:15:00Z"),
          description: "Inspected eDP display ribbon cable and housing.",
          result: "Found pinched ribbon cable inside right hinge mechanism; requested user bring device for panel assembly swap.",
          followUpRequired: true,
          followUpNote: "Awaiting user drop-off at Service Desk counter CB2 1st floor.",
          attachmentNotes: "Hardware diagnostic log and hinge photo attached.",
        },
      });
    }

    const t4 = await prisma.ticket.upsert({
      where: { ticketNumber: "TKT-2026-000004" },
      update: {},
      create: {
        ticketNumber: "TKT-2026-000004",
        requesterId: john.id,
        categoryId: catSoftware.id,
        relatedSystemId: sysGrade.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "RESOLVED",
        summary: "Error 500 when exporting midterm grade summary CSV",
        description: "Clicking export midterm grades throws unhandled server exception for class CPE334.",
        ticketOwner: piti.fullName,
        ticketOwnerId: piti.id,
      },
    });

    const t4ActionCount = await prisma.actionTaken.count({ where: { ticketId: t4.id } });
    if (t4ActionCount === 0) {
      await prisma.actionTaken.create({
        data: {
          ticketId: t4.id,
          performedById: piti.id,
          actionDateTime: new Date("2026-10-02T14:45:00Z"),
          description: "Debugged CSV streaming service; patched character encoding for UTF-8 Thai student names.",
          result: "Export completed with HTTP 200 and valid 2,400 row CSV payload.",
          followUpRequired: false,
        },
      });
    }

    const seq = await prisma.ticketSequence.findUnique({ where: { year: currentYear } });
    if (seq && seq.lastSequence < 4) {
      await prisma.ticketSequence.update({
        where: { year: currentYear },
        data: { lastSequence: 4 },
      });
    }

    console.log("Seeded Lab 4 tickets and Actions Taken successfully.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });