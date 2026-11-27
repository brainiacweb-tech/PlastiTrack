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
    update: {},
    create: { id: "demo-partner", name: "Green Route Demo Partner", region: "Central" },
  });
  const company = await prisma.recyclingCompany.upsert({
    where: { id: "demo-recycler" },
    update: {},
    create: { id: "demo-recycler", name: "Circular Materials Demo Co.", region: "Central" },
  });
  const accounts = [
    { id: "demo-admin", name: "Amina Owusu", email: "admin@plastitrack.demo", role: Role.ADMINISTRATOR },
    { id: "demo-partner-user", name: "Kwame Mensah", email: "partner@plastitrack.demo", role: Role.COLLECTION_PARTNER, collectionPartnerId: partner.id },
    { id: "demo-collector-user", name: "Abena Boateng", email: "collector@plastitrack.demo", role: Role.WASTE_COLLECTOR, collectionPartnerId: partner.id },
    { id: "demo-recycler-user", name: "Kofi Addo", email: "recycler@plastitrack.demo", role: Role.RECYCLING_COMPANY, recyclingCompanyId: company.id },
    { id: "demo-manager", name: "Esi Nkrumah", email: "manager@plastitrack.demo", role: Role.LOCATION_MANAGER, region: "Central" },
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
    { id: "demo-location-central", name: "Central Market Demo Site", region: "Central", address: "Demonstration location — Central", latitude: 5.5601, longitude: -0.2057 },
    { id: "demo-location-north", name: "North District Demo Site", region: "North", address: "Demonstration location — North", latitude: 5.6148, longitude: -0.1889 },
    { id: "demo-location-coast", name: "Coastal District Demo Site", region: "Coastal", address: "Demonstration location — Coastal", latitude: 5.5350, longitude: -0.1810 },
  ];
  for (const location of locations) {
    await prisma.binLocation.upsert({ where: { id: location.id }, update: location, create: location });
  }

  const bins = [
    { id: "demo-bin-001", code: "PT-001", name: "Central PET Station", locationId: locations[0].id, category: PlasticCategory.PET, fillPercent: 86, capacityKg: 120, status: BinStatus.NEARLY_FULL },
    { id: "demo-bin-002", code: "PT-002", name: "North HDPE Point", locationId: locations[1].id, category: PlasticCategory.HDPE, fillPercent: 52, capacityKg: 100, status: BinStatus.PARTIAL },
    { id: "demo-bin-003", code: "PT-003", name: "Coastal Mixed Plastics", locationId: locations[2].id, category: PlasticCategory.MIXED, fillPercent: 23, capacityKg: 150, status: BinStatus.LOW },
    { id: "demo-bin-004", code: "PT-004", name: "North PP Collection", locationId: locations[1].id, category: PlasticCategory.PP, fillPercent: 93, capacityKg: 100, status: BinStatus.NEARLY_FULL },
    { id: "demo-bin-005", code: "PT-005", name: "Central LDPE Station", locationId: locations[0].id, category: PlasticCategory.LDPE, fillPercent: 68, capacityKg: 100, status: BinStatus.FILLING_UP },
    { id: "demo-bin-006", code: "PT-006", name: "Coastal PET Station", locationId: locations[2].id, category: PlasticCategory.PET, fillPercent: 0, capacityKg: 120, status: BinStatus.LOW },
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
