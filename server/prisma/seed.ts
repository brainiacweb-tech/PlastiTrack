import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role, PlasticCategory, BinStatus, DeviceStatus, CollectionStatus } from "@prisma/client";

const prisma = new PrismaClient();
const demoPassword = "PlastiTrack!2026";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required before seeding.");
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const partner = await prisma.collectionPartner.upsert({
    where: { id: "demo-partner" },
    update: { name: "Asante Green Route", region: "Ashanti Region" },
    create: { id: "demo-partner", name: "Asante Green Route", region: "Ashanti Region" },
  });
  const company = await prisma.recyclingCompany.upsert({
    where: { id: "demo-recycler" },
    update: { name: "Kumasi Circular Materials", region: "Ashanti Region" },
    create: { id: "demo-recycler", name: "Kumasi Circular Materials", region: "Ashanti Region" },
  });
  const accounts = [
    { id: "demo-admin", name: "Amina Owusu", email: "admin@plastitrack.demo", role: Role.ADMINISTRATOR },
    { id: "demo-partner-user", name: "Kwame Mensah", email: "partner@plastitrack.demo", role: Role.COLLECTION_PARTNER, collectionPartnerId: partner.id },
    { id: "demo-collector-user", name: "Abena Boateng", email: "collector@plastitrack.demo", role: Role.WASTE_COLLECTOR, collectionPartnerId: partner.id },
    { id: "demo-recycler-user", name: "Kofi Addo", email: "recycler@plastitrack.demo", role: Role.RECYCLING_COMPANY, recyclingCompanyId: company.id },
    { id: "demo-manager", name: "Esi Nkrumah", email: "manager@plastitrack.demo", role: Role.LOCATION_MANAGER, region: "Ashanti Region" },
    { id: "demo-officer", name: "Yaw Asante", email: "officer@plastitrack.demo", role: Role.ENVIRONMENTAL_OFFICER },
  ];
  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, role: account.role, passwordHash, region: "region" in account ? account.region : null },
      create: { ...account, passwordHash },
    });
  }
  const collectorUser = await prisma.user.findUniqueOrThrow({ where: { email: "collector@plastitrack.demo" } });
  const collector = await prisma.collector.upsert({
    where: { id: "demo-collector" },
    update: { userId: collectorUser.id },
    create: { id: "demo-collector", name: collectorUser.name, phone: "+233 20 000 0000", partnerId: partner.id, userId: collectorUser.id },
  });

  const locations = [
    { id: "demo-location-adum", name: "Adum Market Demonstration Site", region: "Ashanti Region", address: "Demonstration location — Adum, Kumasi", latitude: 6.6929, longitude: -1.6244 },
    { id: "demo-location-bantama", name: "Bantama Market Demonstration Site", region: "Ashanti Region", address: "Demonstration location — Bantama, Kumasi", latitude: 6.7055, longitude: -1.6356 },
    { id: "demo-location-asokwa", name: "Asokwa Community Demonstration Site", region: "Ashanti Region", address: "Demonstration location — Asokwa, Kumasi", latitude: 6.665, longitude: -1.601 },
  ];
  for (const location of locations) {
    await prisma.binLocation.upsert({ where: { id: location.id }, update: location, create: location });
  }

  const bins = [
    { id: "demo-bin-001", code: "PT-001", name: "Adum PET Collection Point", locationId: locations[0].id, category: PlasticCategory.PET, fillPercent: 86, capacityKg: 120, status: BinStatus.NEARLY_FULL },
    { id: "demo-bin-002", code: "PT-002", name: "Bantama HDPE Collection Point", locationId: locations[1].id, category: PlasticCategory.HDPE, fillPercent: 52, capacityKg: 100, status: BinStatus.PARTIAL },
    { id: "demo-bin-003", code: "PT-003", name: "Asokwa Mixed Plastics Point", locationId: locations[2].id, category: PlasticCategory.MIXED, fillPercent: 23, capacityKg: 150, status: BinStatus.LOW },
    { id: "demo-bin-004", code: "PT-004", name: "Bantama PP Collection Point", locationId: locations[1].id, category: PlasticCategory.PP, fillPercent: 93, capacityKg: 100, status: BinStatus.NEARLY_FULL },
    { id: "demo-bin-005", code: "PT-005", name: "Adum LDPE Collection Point", locationId: locations[0].id, category: PlasticCategory.LDPE, fillPercent: 68, capacityKg: 100, status: BinStatus.FILLING_UP },
    { id: "demo-bin-006", code: "PT-006", name: "Asokwa PET Collection Point", locationId: locations[2].id, category: PlasticCategory.PET, fillPercent: 0, capacityKg: 120, status: BinStatus.LOW },
  ];
  for (const bin of bins) {
    await prisma.smartBin.upsert({ where: { id: bin.id }, update: bin, create: { ...bin, installedAt: new Date("2025-01-15T00:00:00Z") } });
    await prisma.device.upsert({
      where: { binId: bin.id },
      update: { status: bin.id === "demo-bin-003" ? DeviceStatus.OFFLINE : DeviceStatus.ONLINE },
      create: {
        deviceIdentifier: `PT-DEMO-${bin.code}`,
        binId: bin.id,
        status: bin.id === "demo-bin-003" ? DeviceStatus.OFFLINE : DeviceStatus.ONLINE,
        isSimulated: true,
      },
    });
  }

  for (const bin of bins) {
    const device = await prisma.device.findUniqueOrThrow({ where: { binId: bin.id } });
    const count = await prisma.sensorReading.count({ where: { binId: bin.id } });
    if (!count) {
      await prisma.sensorReading.create({
        data: { binId: bin.id, deviceId: device.id, fillPercent: bin.fillPercent, source: "SIMULATED" },
      });
    }
  }

  const activeTask = await prisma.collectionTask.upsert({
    where: { id: "demo-task-active" },
    update: { collectorId: collector.id, assignedToId: collectorUser.id },
    create: {
      id: "demo-task-active",
      binId: "demo-bin-001",
      partnerId: partner.id,
      collectorId: collector.id,
      assignedToId: collectorUser.id,
      status: CollectionStatus.ACCEPTED,
    },
  });
  const pendingTask = await prisma.collectionTask.upsert({
    where: { id: "demo-task-pending" },
    update: {},
    create: { id: "demo-task-pending", binId: "demo-bin-004", partnerId: partner.id, status: CollectionStatus.PENDING },
  });
  const completed = await prisma.collectionTask.upsert({
    where: { id: "demo-task-completed" },
    update: { status: CollectionStatus.COMPLETED, completedAt: new Date() },
    create: {
      id: "demo-task-completed",
      binId: "demo-bin-006",
      partnerId: partner.id,
      collectorId: collector.id,
      assignedToId: collectorUser.id,
      status: CollectionStatus.COMPLETED,
      completedAt: new Date(),
    },
  });
  const collectionRecord = await prisma.collectionRecord.upsert({
    where: { taskId: completed.id },
    update: {},
    create: { taskId: completed.id, quantityKg: 42, completedById: collectorUser.id },
  });
  await prisma.plasticInventory.upsert({
    where: { collectionRecordId: collectionRecord.id },
    update: {},
    create: {
      category: PlasticCategory.PET,
      quantityKg: 42,
      availableKg: 42,
      binId: "demo-bin-006",
      collectionRecordId: collectionRecord.id,
    },
  });
  for (const task of [activeTask, pendingTask]) {
    const count = await prisma.notification.count({ where: { userId: "demo-partner-user", title: "Collection task needs attention" } });
    if (!count) {
      await prisma.notification.create({
        data: {
          userId: "demo-partner-user",
          title: "Collection task needs attention",
          message: `${task.binId} is ready for partner review.`,
          href: "/app/collections",
        },
      });
    }
  }

  console.log("Demo data is ready.");
  console.log(`Demo login password: ${demoPassword}`);
  console.log("Accounts: admin, partner, collector, recycler, manager, officer @plastitrack.demo");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
