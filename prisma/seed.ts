import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
  },
})

const CAMPUSES = [
  "Beirut", "Bekaa", "Saida", "Tripoli", "Nabatieh",
  "Mount Lebanon", "Tyre", "Rayak", "Halba",
]

const DEPARTMENTS = [
  "Computer and Communication", "Electrical and Electronics",
  "Mechanical", "Biomedical", "Industrial", "Surveying",
]

async function main() {
  console.log("Seeding campuses...")
  for (const name of CAMPUSES) {
    await prisma.campus.upsert({ where: { name }, update: {}, create: { name } })
  }

  console.log("Seeding departments...")
  for (const name of DEPARTMENTS) {
    await prisma.department.upsert({ where: { name }, update: {}, create: { name } })
  }

  console.log("Seeding default app settings...")
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      submissionsOpen: true,
      maxLeaveDays: 22,
      campusOverlapThreshold: 3,
      deptOverlapEnabled: true,
      deptOverlapThreshold: 2,
    },
  })

  console.log("Done.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
