import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
  },
})

async function main() {
  console.log("Clearing test data...")
  await prisma.leaveRequest.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
  console.log("Done. Campuses, departments, and settings are untouched.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
