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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });