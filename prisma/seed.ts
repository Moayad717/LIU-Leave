import { PrismaClient } from "@prisma/client"
import { addDays } from "date-fns"

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

const AY_START = new Date("2025-09-01")
const d = (...offsets: number[]) => offsets.map((n) => addDays(AY_START, n))

async function main() {
  console.log("Wiping database...")
  await prisma.leaveRequest.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
  await prisma.campus.deleteMany()
  await prisma.department.deleteMany()
  await prisma.holiday.deleteMany()
  await prisma.appSettings.deleteMany()
  console.log("All data deleted.")

  const campuses: Record<string, string> = {}
  for (const name of CAMPUSES) {
    const c = await prisma.campus.create({ data: { name } })
    campuses[name] = c.id
  }

  const departments: Record<string, string> = {}
  for (const name of DEPARTMENTS) {
    const dep = await prisma.department.create({ data: { name } })
    departments[name] = dep.id
  }

  console.log(`Created ${CAMPUSES.length} campuses, ${DEPARTMENTS.length} departments.`)

  const admin = await prisma.user.create({
    data: {
      name: "System Admin",
      email: "admin@liu.edu.lb",
      role: "ADMIN",
      campusId: campuses["Beirut"],
      departmentId: departments["Computer and Communication"],
    },
  })

  const profData = [
    // Beirut — 4 profs, 3 share days 60-65 to trigger overlap alert
    { name: "Dr. Rami Khalil",    email: "r.khalil@liu.edu.lb",   campus: "Beirut",        dept: "Computer and Communication" },
    { name: "Dr. Lara Saad",      email: "l.saad@liu.edu.lb",     campus: "Beirut",        dept: "Electrical and Electronics" },
    { name: "Dr. Elie Rizk",      email: "e.rizk@liu.edu.lb",     campus: "Beirut",        dept: "Mechanical" },
    { name: "Dr. Ziad Mansour",   email: "z.mansour@liu.edu.lb",  campus: "Beirut",        dept: "Biomedical" },
    // Tripoli — 2
    { name: "Dr. Karim Nasser",   email: "k.nasser@liu.edu.lb",   campus: "Tripoli",       dept: "Industrial" },
    { name: "Dr. Rana Tabbara",   email: "r.tabbara@liu.edu.lb",  campus: "Tripoli",       dept: "Surveying" },
    // Saida — 2
    { name: "Dr. Maya Haddad",    email: "m.haddad@liu.edu.lb",   campus: "Saida",         dept: "Computer and Communication" },
    { name: "Dr. Fady Khoury",    email: "f.khoury@liu.edu.lb",   campus: "Saida",         dept: "Mechanical" },
    // Mount Lebanon — 2
    { name: "Dr. Joelle Azzi",    email: "j.azzi@liu.edu.lb",     campus: "Mount Lebanon", dept: "Biomedical" },
    { name: "Dr. Charbel Abi Nader", email: "c.abinader@liu.edu.lb", campus: "Mount Lebanon", dept: "Electrical and Electronics" },
    // Nabatieh — 1
    { name: "Dr. Mia Nassar",     email: "m.nassar@liu.edu.lb",   campus: "Nabatieh",      dept: "Industrial" },
    // Bekaa — 1
    { name: "Dr. Pierre Gemayel", email: "p.gemayel@liu.edu.lb",  campus: "Bekaa",         dept: "Surveying" },
    // Tyre — 1
    { name: "Dr. Nada Jabbour",   email: "n.jabbour@liu.edu.lb",  campus: "Tyre",          dept: "Computer and Communication" },
    // Rayak — 1
    { name: "Dr. Georges Frem",   email: "g.frem@liu.edu.lb",     campus: "Rayak",         dept: "Mechanical" },
    // Halba — 1
    { name: "Dr. Sara Karam",     email: "s.karam@liu.edu.lb",    campus: "Halba",         dept: "Biomedical" },
  ]

  const profs: Record<string, string> = {}
  for (const p of profData) {
    const u = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        role: "PROFESSOR",
        campusId: campuses[p.campus],
        departmentId: departments[p.dept],
      },
    })
    profs[p.email] = u.id
  }
  console.log(`Created ${profData.length} professors.`)

  const leaveData = [
    // ── Beirut overlap: Khalil + Saad + Rizk all share days 60-64 (APPROVED) ──
    {
      professorId: profs["r.khalil@liu.edu.lb"],
      dates: d(60,61,62,63,64,65,66,67,68,69),
      status: "APPROVED" as const,
      adminComment: "Approved.",
      reviewedAt: new Date("2025-11-05"),
      reviewedById: admin.id,
    },
    {
      professorId: profs["l.saad@liu.edu.lb"],
      dates: d(60,61,62,63,64,90,91,92,93,94),
      status: "APPROVED" as const,
      adminComment: "Approved.",
      reviewedAt: new Date("2025-11-05"),
      reviewedById: admin.id,
    },
    {
      professorId: profs["e.rizk@liu.edu.lb"],
      dates: d(60,61,62,63,64,120,121,122,123,124),
      status: "APPROVED" as const,
      adminComment: "Approved for research leave.",
      reviewedAt: new Date("2025-11-06"),
      reviewedById: admin.id,
    },
    {
      professorId: profs["z.mansour@liu.edu.lb"],
      dates: d(150,151,152,153,154,155,156,157,158,159),
      status: "PENDING" as const,
    },
    // ── Tripoli ──────────────────────────────────────────────────────────────
    {
      professorId: profs["k.nasser@liu.edu.lb"],
      dates: d(30,31,32,33,34,35),
      status: "APPROVED" as const,
      adminComment: "Approved.",
      reviewedAt: new Date("2025-10-05"),
      reviewedById: admin.id,
    },
    {
      professorId: profs["r.tabbara@liu.edu.lb"],
      dates: d(10,11,12,13,14),
      status: "REJECTED" as const,
      adminComment: "Cannot approve the following dates: Mon Sep 11, Tue Sep 12, Wed Sep 13.\nOverlaps with semester orientation week.",
      reviewedAt: new Date("2025-09-12"),
      reviewedById: admin.id,
    },
    // ── Saida ─────────────────────────────────────────────────────────────────
    {
      professorId: profs["m.haddad@liu.edu.lb"],
      dates: d(70,71,72,73,74,75,76,77),
      status: "APPROVED" as const,
      adminComment: "Approved for medical conference.",
      reviewedAt: new Date("2025-11-10"),
      reviewedById: admin.id,
    },
    {
      professorId: profs["f.khoury@liu.edu.lb"],
      dates: d(200,201,202,203,204,205,206,207,208,209,210,211),
      status: "PENDING" as const,
    },
    // ── Mount Lebanon ─────────────────────────────────────────────────────────
    {
      professorId: profs["j.azzi@liu.edu.lb"],
      dates: d(140,141,142,143,144,145,146,147,148,149),
      status: "APPROVED" as const,
      adminComment: "Approved.",
      reviewedAt: new Date("2026-01-10"),
      reviewedById: admin.id,
    },
    {
      professorId: profs["c.abinader@liu.edu.lb"],
      dates: d(180,181,182,183,184,185),
      status: "PENDING" as const,
    },
    // ── Nabatieh ──────────────────────────────────────────────────────────────
    {
      professorId: profs["m.nassar@liu.edu.lb"],
      dates: d(50,51,52,53,54,55,56,57,58,59,100,101,102),
      status: "APPROVED" as const,
      adminComment: "Approved.",
      reviewedAt: new Date("2025-10-20"),
      reviewedById: admin.id,
    },
    // ── Bekaa ─────────────────────────────────────────────────────────────────
    {
      professorId: profs["p.gemayel@liu.edu.lb"],
      dates: d(300,301,302,303,304,305),
      status: "PENDING" as const,
    },
    // ── Tyre ──────────────────────────────────────────────────────────────────
    {
      professorId: profs["n.jabbour@liu.edu.lb"],
      dates: d(250,251,252,253,254,255,256,257,258,259),
      status: "REJECTED" as const,
      adminComment: "Cannot approve the following dates: Mon May 11, Tue May 12.\nExam supervision required.",
      reviewedAt: new Date("2026-05-01"),
      reviewedById: admin.id,
    },
    // ── Rayak ─────────────────────────────────────────────────────────────────
    {
      professorId: profs["g.frem@liu.edu.lb"],
      dates: d(80,81,82,83,84,85,86,87,88,89),
      status: "APPROVED" as const,
      adminComment: "Approved for sabbatical.",
      reviewedAt: new Date("2025-11-20"),
      reviewedById: admin.id,
    },
    // ── Halba ─────────────────────────────────────────────────────────────────
    {
      professorId: profs["s.karam@liu.edu.lb"],
      dates: d(210,211,212,213,214,215,216,217),
      status: "PENDING" as const,
    },
  ]

  for (const req of leaveData) {
    await prisma.leaveRequest.create({ data: req })
  }

  console.log(`Created ${leaveData.length} leave requests.`)
  console.log("Done.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
