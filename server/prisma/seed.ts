import { getPrisma } from "../src/prisma.js";

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

const REQUESTERS = [
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

async function main() {
  const prisma = getPrisma();

  // Seed Categories (idempotent)
  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log("Seeded categories successfully:", CATEGORIES);

  // Seed Related Systems (idempotent)
  for (const system of RELATED_SYSTEMS) {
    await prisma.relatedSystem.upsert({
      where: { name: system.name },
      update: { description: system.description, isActive: true },
      create: { name: system.name, description: system.description, isActive: true },
    });
  }
  console.log("Seeded related systems successfully:", RELATED_SYSTEMS.map((s) => s.name));

  // 3. Seed Development Requesters (idempotent)
  for (const req of REQUESTERS) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: { fullName: req.fullName, department: req.department, isActive: req.isActive },
      create: { fullName: req.fullName, email: req.email, department: req.department, isActive: req.isActive },
    });
  }
  console.log("Seeded requesters successfully:", REQUESTERS.map((r) => r.fullName));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });