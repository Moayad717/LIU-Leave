import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
  },
})

const CAMPUSES = [
  "Beirut",
  "Bekaa",
  "Saida",
  "Tripoli",
  "Nabatieh",
  "Mount Lebanon",
  "Tyre",
  "Rayak",
  "Halba",
]

async function main() {
  console.log("Wiping database...")

  // Delete in FK-safe order
  await prisma.leaveRequest.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
  await prisma.campus.deleteMany()
  await prisma.holiday.deleteMany()
  await prisma.appSettings.deleteMany()

  console.log("All data deleted.")

  // Create campuses
  for (const name of CAMPUSES) {
    await prisma.campus.create({ data: { name } })
  }

  console.log(`Created ${CAMPUSES.length} campuses: ${CAMPUSES.join(", ")}`)
  console.log("Done.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
