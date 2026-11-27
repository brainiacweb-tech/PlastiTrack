import "dotenv/config";
import cors from "cors";
import express from "express";
import {
  PrismaClient,
  Role,
  CollectionStatus,
  DeviceStatus,
  BinStatus,
  PlasticCategory,
  RecyclingRequestStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { allowRoles, requireAuth, signToken } from "./auth.js";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  console.error("Configuration error: set JWT_SECRET to at least 32 characters in server/.env (see server/.env.example).");
  process.exit(1);
}

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
const readingSchema = z.object({ fillPercent: z.number().int().min(0).max(100) });
const simulationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set"), fillPercent: z.number().int().min(0).max(100) }),
  z.object({ action: z.literal("increase"), amount: z.number().int().min(1).max(100) }),
  z.object({ action: z.literal("decrease"), amount: z.number().int().min(1).max(100) }),
  z.object({ action: z.literal("offline") }),
  z.object({ action: z.literal("online") }),
]);
const statusSchema = z.object({
  status: z.enum(["ACCEPTED", "EN_ROUTE", "ARRIVED", "COLLECTING", "COMPLETED"]),
  quantityKg: z.number().positive().max(10000).optional(),
});
const requestSchema = z.object({
  inventoryId: z.string().min(1),
  quantityKg: z.number().positive().max(100000),
});
const createBinSchema = z.object({
  code: z.string().trim().min(2).max(32),
  name: z.string().trim().min(2).max(100),
  locationName: z.string().trim().min(2).max(100),
  region: z.string().trim().min(2).max(80),
  address: z.string().trim().min(3).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: z.nativeEnum(PlasticCategory),
  capacityKg: z.number().positive().max(100000),
  deviceIdentifier: z.string().trim().min(3).max(80),
});

function binStatus(fillPercent: number): BinStatus {
  if (fillPercent >= 100) return BinStatus.FULL;
  if (fillPercent >= 80) return BinStatus.NEARLY_FULL;
  if (fillPercent >= 60) return BinStatus.FILLING_UP;
  if (fillPercent >= 30) return BinStatus.PARTIAL;
  return BinStatus.LOW;
}

function routeParam(req: express.Request, name: string) {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

async function notifyRoles(roles: Role[], title: string, message: string, href?: string) {
  const users = await prisma.user.findMany({ where: { role: { in: roles }, isActive: true }, select: { id: true } });
  if (users.length) {
    await prisma.notification.createMany({
      data: users.map(({ id }) => ({ userId: id, title, message, href })),
    });
  }
}

async function writeAudit(actorId: string, action: string, entityType: string, entityId?: string, metadata?: object) {
  await prisma.auditLog.create({
    data: { actorId, action, entityType, entityId, metadata },
  });
}

app.get("/api/v1/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", service: "PlastiTrack API" });
  } catch {
    res.status(503).json({
      status: "unavailable",
      database: "unavailable",
      error: "PostgreSQL is unavailable. Start the database and check DATABASE_URL in server/.env.",
    });
  }
});

app.post("/api/v1/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email and password." });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }
  const { passwordHash: _passwordHash, ...safeUser } = user;
  const payload = {
    userId: user.id,
    role: user.role,
    email: user.email,
    region: user.region,
    collectionPartnerId: user.collectionPartnerId,
    recyclingCompanyId: user.recyclingCompanyId,
  };
  await writeAudit(user.id, "LOGIN", "User", user.id);
  res.json({ token: signToken(payload), user: safeUser });
});

app.get("/api/v1/auth/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, name: true, email: true, role: true, region: true, collectionPartnerId: true, recyclingCompanyId: true },
  });
  if (!user) {
    res.status(401).json({ error: "Account is no longer available." });
    return;
  }
  res.json({ user });
});

app.get("/api/v1/dashboard", requireAuth, async (req, res) => {
  const [bins, activeBins, tasks, completed, inventory, readings, notifications, collectionRecords] = await Promise.all([
    prisma.smartBin.count(),
    prisma.smartBin.count({ where: { status: { in: [BinStatus.NEARLY_FULL, BinStatus.FULL] } } }),
    prisma.collectionTask.count({ where: { status: { notIn: [CollectionStatus.COMPLETED, CollectionStatus.CANCELLED] } } }),
    prisma.collectionRecord.aggregate({ _sum: { quantityKg: true }, _count: true }),
    prisma.plasticInventory.aggregate({ _sum: { availableKg: true } }),
    prisma.sensorReading.findMany({
      orderBy: { recordedAt: "desc" },
      take: 200,
      select: { fillPercent: true, recordedAt: true },
    }),
    prisma.notification.count({ where: { userId: req.auth!.userId, readAt: null } }),
    prisma.collectionRecord.findMany({
      where: { completedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } },
      select: { quantityKg: true, completedAt: true },
      orderBy: { completedAt: "asc" },
    }),
  ]);
  const avgFill = readings.length ? Math.round(readings.reduce((sum, item) => sum + item.fillPercent, 0) / readings.length) : 0;
  const monthly = new Map<string, number>();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - offset);
    monthly.set(date.toISOString().slice(0, 7), 0);
  }
  for (const record of collectionRecords) {
    const month = record.completedAt.toISOString().slice(0, 7);
    monthly.set(month, (monthly.get(month) ?? 0) + record.quantityKg);
  }
  res.json({
    metrics: {
      totalBins: bins,
      binsRequiringCollection: activeBins,
      activeTasks: tasks,
      completedCollections: completed._count,
      plasticCollectedKg: completed._sum.quantityKg ?? 0,
      availablePlasticKg: inventory._sum.availableKg ?? 0,
      averageFillPercent: avgFill,
      unreadNotifications: notifications,
    },
    monthlyCollections: [...monthly].map(([month, quantityKg]) => ({
      month: new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${month}-01T00:00:00.000Z`)),
      kg: Math.round(quantityKg),
    })),
  });
});

app.get(
  "/api/v1/bins",
  requireAuth,
  allowRoles(Role.ADMINISTRATOR, Role.COLLECTION_PARTNER, Role.WASTE_COLLECTOR, Role.LOCATION_MANAGER, Role.ENVIRONMENTAL_OFFICER),
  async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const status = typeof req.query.status === "string" && Object.values(BinStatus).includes(req.query.status as BinStatus)
    ? req.query.status as BinStatus
    : undefined;
  const partnerRegion = req.auth!.role === Role.COLLECTION_PARTNER && req.auth!.collectionPartnerId
    ? (await prisma.collectionPartner.findUnique({
      where: { id: req.auth!.collectionPartnerId },
      select: { region: true },
    }))?.region
    : undefined;
  const bins = await prisma.smartBin.findMany({
    where: {
      ...(req.auth!.role === Role.COLLECTION_PARTNER ? { location: { region: partnerRegion ?? "__UNASSIGNED__" } } : {}),
      ...(req.auth!.role === Role.LOCATION_MANAGER ? { location: { region: req.auth!.region ?? "__UNASSIGNED__" } } : {}),
      ...(req.auth!.role === Role.WASTE_COLLECTOR
        ? { tasks: { some: { assignedToId: req.auth!.userId } } }
        : {}),
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { location: { name: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
    },
    include: { location: true, device: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ bins });
  },
);

app.post(
  "/api/v1/bins",
  requireAuth,
  allowRoles(Role.ADMINISTRATOR),
  async (req, res) => {
    const parsed = createBinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Complete every bin and device field with a valid value." });
      return;
    }
    const input = parsed.data;
    try {
      const bin = await prisma.$transaction(async (tx) => {
        const location = await tx.binLocation.findFirst({
          where: { name: input.locationName, region: input.region },
        }) ?? await tx.binLocation.create({
          data: {
            name: input.locationName,
            region: input.region,
            address: input.address,
            latitude: input.latitude,
            longitude: input.longitude,
            isDemo: true,
          },
        });
        const created = await tx.smartBin.create({
          data: {
            code: input.code,
            name: input.name,
            locationId: location.id,
            category: input.category,
            capacityKg: input.capacityKg,
            installedAt: new Date(),
          },
        });
        const device = await tx.device.create({
          data: { deviceIdentifier: input.deviceIdentifier, binId: created.id, isSimulated: true },
        });
        await tx.sensorReading.create({
          data: { binId: created.id, deviceId: device.id, fillPercent: 0, source: "SIMULATED" },
        });
        return tx.smartBin.findUniqueOrThrow({
          where: { id: created.id },
          include: { location: true, device: true },
        });
      });
      await writeAudit(req.auth!.userId, "SMART_BIN_REGISTERED", "SmartBin", bin.id);
      res.status(201).json({ bin });
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        res.status(409).json({ error: "That bin code or device identifier is already registered." });
        return;
      }
      throw error;
    }
  },
);

app.get(
  "/api/v1/bins/:id",
  requireAuth,
  allowRoles(Role.ADMINISTRATOR, Role.COLLECTION_PARTNER, Role.WASTE_COLLECTOR, Role.LOCATION_MANAGER, Role.ENVIRONMENTAL_OFFICER),
  async (req, res) => {
  const partnerRegion = req.auth!.role === Role.COLLECTION_PARTNER && req.auth!.collectionPartnerId
    ? (await prisma.collectionPartner.findUnique({
      where: { id: req.auth!.collectionPartnerId },
      select: { region: true },
    }))?.region
    : undefined;
  const bin = await prisma.smartBin.findUnique({
    where: {
      id: routeParam(req, "id"),
      ...(req.auth!.role === Role.COLLECTION_PARTNER ? { location: { region: partnerRegion ?? "__UNASSIGNED__" } } : {}),
      ...(req.auth!.role === Role.LOCATION_MANAGER ? { location: { region: req.auth!.region ?? "__UNASSIGNED__" } } : {}),
      ...(req.auth!.role === Role.WASTE_COLLECTOR
        ? { tasks: { some: { assignedToId: req.auth!.userId } } }
        : {}),
    },
    include: {
      location: true,
      device: true,
      readings: { orderBy: { recordedAt: "desc" }, take: 30 },
      tasks: { orderBy: { createdAt: "desc" }, take: 10, include: { collector: true } },
    },
  });
  if (!bin) {
    res.status(404).json({ error: "Smart bin not found." });
    return;
  }
  res.json({ bin });
  },
);

async function recordReading(binId: string, fillPercent: number, source: string) {
  const bin = await prisma.smartBin.findUnique({ where: { id: binId }, include: { device: true } });
  if (!bin || !bin.device) throw new Error("Smart bin or device not found.");
  const previousFill = bin.fillPercent;
  const status = binStatus(fillPercent);
  const now = new Date();
  await prisma.$transaction([
    prisma.smartBin.update({ where: { id: binId }, data: { fillPercent, status } }),
    prisma.device.update({ where: { id: bin.device.id }, data: { status: DeviceStatus.ONLINE, lastCommunication: now } }),
    prisma.sensorReading.create({ data: { binId, deviceId: bin.device.id, fillPercent, source, recordedAt: now } }),
  ]);
  if (previousFill < 80 && fillPercent >= 80) {
    const activeTask = await prisma.collectionTask.findFirst({
      where: { binId, status: { notIn: [CollectionStatus.COMPLETED, CollectionStatus.CANCELLED] } },
    });
    const partner = await prisma.collectionPartner.findFirst();
    if (!activeTask && partner) {
      await prisma.collectionTask.create({ data: { binId, partnerId: partner.id } });
    }
    await notifyRoles(
      [Role.ADMINISTRATOR, Role.COLLECTION_PARTNER, Role.LOCATION_MANAGER],
      `${bin.code} needs collection`,
      `The ${source.toLowerCase()} reading reached ${fillPercent}%.`,
      "/app/bins",
    );
  }
  return { fillPercent, status, source, recordedAt: now };
}

app.post(
  "/api/v1/bins/:id/simulation",
  requireAuth,
  allowRoles(Role.ADMINISTRATOR),
  async (req, res) => {
    const parsed = simulationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid simulation action." });
      return;
    }
    const bin = await prisma.smartBin.findUnique({ where: { id: routeParam(req, "id") }, include: { device: true } });
    if (!bin || !bin.device) {
      res.status(404).json({ error: "Smart bin or device not found." });
      return;
    }
    if (parsed.data.action === "offline" || parsed.data.action === "online") {
      const online = parsed.data.action === "online";
      await prisma.device.update({
        where: { id: bin.device.id },
        data: { status: online ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE, lastCommunication: new Date() },
      });
      if (!online) {
        await notifyRoles(
          [Role.ADMINISTRATOR, Role.COLLECTION_PARTNER],
          `${bin.code} is offline`,
          "The simulated device has stopped communicating.",
          "/app/bins",
        );
      }
      await writeAudit(req.auth!.userId, "DEVICE_SIMULATED", "Device", bin.device.id, { action: parsed.data.action });
      res.json({ binId: bin.id, deviceStatus: online ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE });
      return;
    }
    const value = parsed.data.action === "set"
      ? parsed.data.fillPercent
      : Math.max(0, Math.min(100, bin.fillPercent + (parsed.data.action === "increase" ? parsed.data.amount : -parsed.data.amount)));
    const reading = await recordReading(bin.id, value, "SIMULATED");
    await writeAudit(req.auth!.userId, "SIMULATION_READING", "SmartBin", bin.id, { fillPercent: value });
    res.json({ binId: bin.id, reading });
  },
);

app.post("/api/v1/devices/:deviceIdentifier/readings", async (req, res) => {
  const expectedToken = process.env.DEVICE_INGEST_TOKEN;
  if (!expectedToken || req.header("x-device-token") !== expectedToken) {
    res.status(401).json({ error: "Device authentication failed." });
    return;
  }
  const parsed = readingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "fillPercent must be an integer from 0 to 100." });
    return;
  }
  const device = await prisma.device.findUnique({ where: { deviceIdentifier: routeParam(req, "deviceIdentifier") } });
  if (!device) {
    res.status(404).json({ error: "Device not registered." });
    return;
  }
  const reading = await recordReading(device.binId, parsed.data.fillPercent, "DEVICE");
  await prisma.device.update({ where: { id: device.id }, data: { isSimulated: false } });
  res.status(201).json({ reading });
});

app.get(
  "/api/v1/collections",
  requireAuth,
  allowRoles(Role.ADMINISTRATOR, Role.COLLECTION_PARTNER, Role.WASTE_COLLECTOR),
  async (req, res) => {
  const where = req.auth!.role === Role.COLLECTION_PARTNER && req.auth!.collectionPartnerId
    ? { partnerId: req.auth!.collectionPartnerId }
    : req.auth!.role === Role.WASTE_COLLECTOR
      ? { assignedToId: req.auth!.userId }
      : {};
  const tasks = await prisma.collectionTask.findMany({
    where,
    include: {
      bin: { include: { location: true, device: true } },
      collector: true,
      partner: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ tasks });
  },
);

app.post(
  "/api/v1/collections/:id/assign",
  requireAuth,
  allowRoles(Role.ADMINISTRATOR, Role.COLLECTION_PARTNER),
  async (req, res) => {
    const collectorId = z.string().min(1).safeParse(req.body?.collectorId);
    if (!collectorId.success) {
      res.status(400).json({ error: "Choose a collector." });
      return;
    }
    const task = await prisma.collectionTask.findUnique({ where: { id: routeParam(req, "id") } });
    if (!task || (req.auth!.role === Role.COLLECTION_PARTNER && task.partnerId !== req.auth!.collectionPartnerId)) {
      res.status(404).json({ error: "Collection task not found." });
      return;
    }
    const collector = await prisma.collector.findFirst({
      where: {
        id: collectorId.data,
        ...(req.auth!.role === Role.COLLECTION_PARTNER ? { partnerId: req.auth!.collectionPartnerId! } : {}),
      },
    });
    if (!collector) {
      res.status(400).json({ error: "Collector is not part of this collection team." });
      return;
    }
    const updated = await prisma.collectionTask.update({
      where: { id: task.id },
      data: { collectorId: collector.id, assignedToId: collector.userId, status: CollectionStatus.PENDING },
    });
    if (collector.userId) {
      await prisma.notification.create({
        data: {
          userId: collector.userId,
          title: "New collection task assigned",
          message: `You have been assigned to ${task.binId}.`,
          href: "/app/collections",
        },
      });
    }
    await writeAudit(req.auth!.userId, "COLLECTION_ASSIGNED", "CollectionTask", task.id, { collectorId: collector.id });
    res.json({ task: updated });
  },
);

app.patch("/api/v1/collections/:id/status", requireAuth, async (req, res) => {
  if (![Role.ADMINISTRATOR, Role.COLLECTION_PARTNER, Role.WASTE_COLLECTOR].includes(req.auth!.role as typeof Role.ADMINISTRATOR | typeof Role.COLLECTION_PARTNER | typeof Role.WASTE_COLLECTOR)) {
    res.status(403).json({ error: "You do not have permission to update collections." });
    return;
  }
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success || (parsed.data.status === "COMPLETED" && !parsed.data.quantityKg)) {
    res.status(400).json({ error: "A positive collection quantity is required to complete a task." });
    return;
  }
  const task = await prisma.collectionTask.findUnique({ where: { id: routeParam(req, "id") }, include: { bin: true } });
  if (!task) {
    res.status(404).json({ error: "Collection task not found." });
    return;
  }
  if (
    (req.auth!.role === Role.COLLECTION_PARTNER && task.partnerId !== req.auth!.collectionPartnerId) ||
    (req.auth!.role === Role.WASTE_COLLECTOR && task.assignedToId !== req.auth!.userId)
  ) {
    res.status(403).json({ error: "This collection is outside your assignment." });
    return;
  }
  if (task.status === CollectionStatus.COMPLETED || task.status === CollectionStatus.CANCELLED) {
    res.status(409).json({ error: "This collection is already closed." });
    return;
  }
  const status = parsed.data.status as CollectionStatus;
  const nextStatus: Partial<Record<CollectionStatus, CollectionStatus>> = {
    [CollectionStatus.PENDING]: CollectionStatus.ACCEPTED,
    [CollectionStatus.ACCEPTED]: CollectionStatus.EN_ROUTE,
    [CollectionStatus.EN_ROUTE]: CollectionStatus.ARRIVED,
    [CollectionStatus.ARRIVED]: CollectionStatus.COLLECTING,
    [CollectionStatus.COLLECTING]: CollectionStatus.COMPLETED,
  };
  if (nextStatus[task.status] !== status) {
    res.status(409).json({ error: `A ${task.status.toLowerCase().replaceAll("_", " ")} task cannot move directly to ${status.toLowerCase().replaceAll("_", " ")}.` });
    return;
  }
  if (req.auth!.role === Role.WASTE_COLLECTOR && !task.collectorId) {
    res.status(403).json({ error: "This task has not been assigned to a collector." });
    return;
  }
  if (status === CollectionStatus.COMPLETED) {
    const result = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.collectionTask.update({
        where: { id: task.id },
        data: { status, completedAt: new Date() },
      });
      const record = await tx.collectionRecord.create({
        data: {
          taskId: task.id,
          quantityKg: parsed.data.quantityKg!,
          completedById: req.auth!.userId,
        },
      });
      const inventory = await tx.plasticInventory.create({
        data: {
          category: task.bin.category,
          quantityKg: parsed.data.quantityKg!,
          availableKg: parsed.data.quantityKg!,
          binId: task.binId,
          collectionRecordId: record.id,
        },
      });
      await tx.smartBin.update({ where: { id: task.binId }, data: { fillPercent: 0, status: BinStatus.LOW } });
      const device = await tx.device.findUnique({ where: { binId: task.binId } });
      if (device) {
        await tx.device.update({ where: { id: device.id }, data: { lastCommunication: new Date() } });
        await tx.sensorReading.create({
          data: {
            binId: task.binId,
            deviceId: device.id,
            fillPercent: 0,
            source: "COLLECTION_RESET",
          },
        });
      }
      return { updatedTask, record, inventory };
    });
    await notifyRoles(
      [Role.ADMINISTRATOR, Role.ENVIRONMENTAL_OFFICER, Role.RECYCLING_COMPANY],
      "Collection completed",
      `${parsed.data.quantityKg} kg of ${task.bin.category} plastic is available for recycling.`,
      "/app/marketplace",
    );
    await writeAudit(req.auth!.userId, "COLLECTION_COMPLETED", "CollectionTask", task.id, { quantityKg: parsed.data.quantityKg });
    res.json(result);
    return;
  }
  const updated = await prisma.collectionTask.update({ where: { id: task.id }, data: { status } });
  await writeAudit(req.auth!.userId, "COLLECTION_STATUS_UPDATED", "CollectionTask", task.id, { status });
  res.json({ task: updated });
});

app.get("/api/v1/collectors", requireAuth, allowRoles(Role.ADMINISTRATOR, Role.COLLECTION_PARTNER), async (req, res) => {
  const collectors = await prisma.collector.findMany({
    where: req.auth!.role === Role.COLLECTION_PARTNER ? { partnerId: req.auth!.collectionPartnerId! } : {},
    include: { user: { select: { id: true, email: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ collectors });
});

app.get(
  "/api/v1/marketplace/inventory",
  requireAuth,
  allowRoles(Role.ADMINISTRATOR, Role.COLLECTION_PARTNER, Role.RECYCLING_COMPANY, Role.ENVIRONMENTAL_OFFICER),
  async (_req, res) => {
  const inventory = await prisma.plasticInventory.findMany({
  where: {
    availableKg: { gt: 0 },
    ...(_req.auth!.role === Role.COLLECTION_PARTNER && _req.auth!.collectionPartnerId
      ? { bin: { location: { region: (await prisma.collectionPartner.findUnique({ where: { id: _req.auth!.collectionPartnerId }, select: { region: true } }))?.region } } }
      : {}),
  },
    include: { bin: { include: { location: true } } },
    orderBy: { collectedAt: "desc" },
  });
  res.json({ inventory });
  },
);

app.get(
  "/api/v1/marketplace/requests",
  requireAuth,
  allowRoles(Role.ADMINISTRATOR, Role.RECYCLING_COMPANY),
  async (req, res) => {
  const requests = await prisma.recyclingRequest.findMany({
    where: req.auth!.role === Role.RECYCLING_COMPANY && req.auth!.recyclingCompanyId
      ? { companyId: req.auth!.recyclingCompanyId }
      : {},
    include: { inventory: { include: { bin: { include: { location: true } } } }, company: true, delivery: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ requests });
  },
);

app.post("/api/v1/marketplace/requests", requireAuth, allowRoles(Role.RECYCLING_COMPANY), async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success || !req.auth!.recyclingCompanyId) {
    res.status(400).json({ error: "Choose available inventory and enter a valid quantity." });
    return;
  }
  try {
    const created = await prisma.$transaction(async (tx) => {
      const inventory = await tx.plasticInventory.findUnique({ where: { id: parsed.data.inventoryId } });
      if (!inventory || inventory.availableKg < parsed.data.quantityKg) {
        throw new Error("INSUFFICIENT_INVENTORY");
      }
      const reserved = await tx.plasticInventory.updateMany({
        where: { id: inventory.id, availableKg: { gte: parsed.data.quantityKg } },
        data: { availableKg: { decrement: parsed.data.quantityKg } },
      });
      if (!reserved.count) throw new Error("INSUFFICIENT_INVENTORY");
      return tx.recyclingRequest.create({
        data: {
          companyId: req.auth!.recyclingCompanyId!,
          inventoryId: inventory.id,
          quantityKg: parsed.data.quantityKg,
        },
        include: { inventory: true },
      });
    });
    await notifyRoles([Role.ADMINISTRATOR], "New recycling request", `A company requested ${created.quantityKg} kg of ${created.inventory.category}.`, "/app/marketplace");
    await writeAudit(req.auth!.userId, "RECYCLING_REQUEST_CREATED", "RecyclingRequest", created.id);
    res.status(201).json({ request: created });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_INVENTORY") {
      res.status(409).json({ error: "The available quantity changed. Refresh inventory and try again." });
      return;
    }
    throw error;
  }
});

app.patch("/api/v1/marketplace/requests/:id/status", requireAuth, allowRoles(Role.ADMINISTRATOR), async (req, res) => {
  const parsed = z.enum(["APPROVED", "REJECTED", "PROCESSING", "DISPATCHED", "DELIVERED"]).safeParse(req.body?.status);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid recycling request status." });
    return;
  }
  const existing = await prisma.recyclingRequest.findUnique({ where: { id: routeParam(req, "id") } });
  if (!existing) {
    res.status(404).json({ error: "Recycling request not found." });
    return;
  }
  const allowedNext: Record<RecyclingRequestStatus, RecyclingRequestStatus[]> = {
    PENDING: [RecyclingRequestStatus.APPROVED, RecyclingRequestStatus.REJECTED],
    APPROVED: [RecyclingRequestStatus.PROCESSING],
    REJECTED: [],
    PROCESSING: [RecyclingRequestStatus.DISPATCHED],
    DISPATCHED: [RecyclingRequestStatus.DELIVERED],
    DELIVERED: [],
  };
  if (!allowedNext[existing.status].includes(parsed.data)) {
    res.status(409).json({ error: `A ${existing.status.toLowerCase()} request cannot move to ${parsed.data.toLowerCase()}.` });
    return;
  }
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.recyclingRequest.updateMany({
        where: { id: existing.id, status: existing.status },
        data: { status: parsed.data },
      });
      if (!changed.count) throw new Error("REQUEST_CHANGED");
      if (parsed.data === RecyclingRequestStatus.REJECTED) {
        await tx.plasticInventory.update({
          where: { id: existing.inventoryId },
          data: { availableKg: { increment: existing.quantityKg } },
        });
      } else {
        await tx.delivery.upsert({
          where: { requestId: existing.id },
          create: { requestId: existing.id, status: parsed.data },
          update: { status: parsed.data },
        });
      }
      return tx.recyclingRequest.findUniqueOrThrow({ where: { id: existing.id } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_CHANGED") {
      res.status(409).json({ error: "This request was updated by another user. Refresh and try again." });
      return;
    }
    throw error;
  }
  await writeAudit(req.auth!.userId, "RECYCLING_REQUEST_STATUS", "RecyclingRequest", existing.id, { status: parsed.data });
  res.json({ request: updated });
});

app.get("/api/v1/notifications", requireAuth, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ notifications });
});

app.patch("/api/v1/notifications/:id/read", requireAuth, async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { id: routeParam(req, "id"), userId: req.auth!.userId },
    data: { readAt: new Date() },
  });
  if (!result.count) {
    res.status(404).json({ error: "Notification not found." });
    return;
  }
  res.json({ success: true });
});

app.post(
  "/api/v1/demo/reset",
  requireAuth,
  allowRoles(Role.ADMINISTRATOR),
  async (_req, res) => {
    if (process.env.DEMO_MODE !== "true") {
      res.status(404).json({ error: "Demo reset is only available when DEMO_MODE=true." });
      return;
    }
    const demoBinIds = ["demo-bin-001", "demo-bin-002", "demo-bin-003", "demo-bin-004", "demo-bin-005", "demo-bin-006"];
    const demoUserIds = ["demo-admin", "demo-partner-user", "demo-collector-user", "demo-recycler-user", "demo-manager", "demo-officer"];
    const demoFills = [86, 52, 23, 93, 68, 0];
    await prisma.$transaction(async (tx) => {
      await tx.delivery.deleteMany({ where: { request: { companyId: "demo-recycler" } } });
      await tx.recyclingRequest.deleteMany({ where: { companyId: "demo-recycler" } });
      await tx.plasticInventory.deleteMany({ where: { binId: { in: demoBinIds } } });
      await tx.collectionRecord.deleteMany({ where: { task: { binId: { in: demoBinIds } } } });
      await tx.collectionTask.deleteMany({ where: { binId: { in: demoBinIds } } });
      await tx.notification.deleteMany({ where: { userId: { in: demoUserIds } } });
      await tx.auditLog.deleteMany({ where: { actorId: { in: demoUserIds } } });
      await tx.sensorReading.deleteMany({ where: { binId: { in: demoBinIds } } });
      for (let index = 0; index < demoBinIds.length; index += 1) {
        const binId = demoBinIds[index];
        const fillPercent = demoFills[index];
        if (!binId || fillPercent === undefined) continue;
        const device = await tx.device.findUnique({ where: { binId } });
        await tx.smartBin.update({ where: { id: binId }, data: { fillPercent, status: binStatus(fillPercent) } });
        if (device) {
          await tx.device.update({
            where: { id: device.id },
            data: {
              status: binId === "demo-bin-003" ? DeviceStatus.OFFLINE : DeviceStatus.ONLINE,
              isSimulated: true,
              lastCommunication: new Date(),
            },
          });
          await tx.sensorReading.create({
            data: {
              binId,
              deviceId: device.id,
              fillPercent,
              source: "SIMULATED",
            },
          });
        }
      }
      const collector = await tx.collector.findUnique({ where: { id: "demo-collector" } });
      const collectorUser = await tx.user.findUnique({ where: { id: "demo-collector-user" } });
      await tx.collectionTask.createMany({
        data: [
          {
            id: "demo-task-active",
            binId: "demo-bin-001",
            partnerId: "demo-partner",
            collectorId: collector?.id,
            assignedToId: collectorUser?.id,
            status: CollectionStatus.ACCEPTED,
          },
          { id: "demo-task-pending", binId: "demo-bin-004", partnerId: "demo-partner", status: CollectionStatus.PENDING },
          {
            id: "demo-task-completed",
            binId: "demo-bin-006",
            partnerId: "demo-partner",
            collectorId: collector?.id,
            assignedToId: collectorUser?.id,
            status: CollectionStatus.COMPLETED,
            completedAt: new Date(),
          },
        ],
      });
      const record = await tx.collectionRecord.create({
        data: { taskId: "demo-task-completed", quantityKg: 42, completedById: collectorUser?.id ?? "demo-collector-user" },
      });
      await tx.plasticInventory.create({
        data: {
          category: PlasticCategory.PET,
          quantityKg: 42,
          availableKg: 42,
          binId: "demo-bin-006",
          collectionRecordId: record.id,
        },
      });
    });
    res.json({ message: "Demonstration data has been reset." });
  },
);

app.get("/api/v1/analytics", requireAuth, allowRoles(Role.ADMINISTRATOR, Role.ENVIRONMENTAL_OFFICER), async (_req, res) => {
  const [records, bins, grouped, monthly, requests] = await Promise.all([
    prisma.collectionRecord.aggregate({ _sum: { quantityKg: true }, _count: true }),
    prisma.smartBin.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.collectionRecord.findMany({
      select: { quantityKg: true, completedAt: true, task: { select: { bin: { select: { category: true, location: { select: { region: true } } } } } } },
      orderBy: { completedAt: "asc" },
    }),
    prisma.recyclingRequest.groupBy({ by: ["status"], _count: { _all: true }, _sum: { quantityKg: true } }),
    prisma.smartBin.aggregate({ _avg: { fillPercent: true } }),
  ]);
  const byCategory = new Map<string, number>();
  const byRegion = new Map<string, number>();
  const byMonth = new Map<string, number>();
  for (const record of grouped) {
    const category = record.task.bin.category;
    const region = record.task.bin.location.region;
    const month = record.completedAt.toISOString().slice(0, 7);
    byCategory.set(category, (byCategory.get(category) ?? 0) + record.quantityKg);
    byRegion.set(region, (byRegion.get(region) ?? 0) + record.quantityKg);
    byMonth.set(month, (byMonth.get(month) ?? 0) + record.quantityKg);
  }
  res.json({
    metrics: {
      totalCollectedKg: records._sum.quantityKg ?? 0,
      completedCollections: records._count,
      totalBins: bins.reduce((total, item) => total + item._count._all, 0),
      averageFillPercent: Math.round(requests._avg.fillPercent ?? 0),
    },
    binsByStatus: bins.map(({ status, _count }) => ({ status, count: _count._all })),
    categoryDistribution: [...byCategory].map(([category, quantityKg]) => ({ category, quantityKg })),
    regionalPerformance: [...byRegion].map(([region, quantityKg]) => ({ region, quantityKg })),
    monthlyCollections: [...byMonth].map(([month, quantityKg]) => ({ month, quantityKg })),
    recyclingRequests: monthly.map(({ status, _count, _sum }) => ({ status, count: _count._all, quantityKg: _sum.quantityKg ?? 0 })),
  });
});

app.get("/api/v1/reports/collections.csv", requireAuth, allowRoles(Role.ADMINISTRATOR, Role.ENVIRONMENTAL_OFFICER), async (_req, res) => {
  const records = await prisma.collectionRecord.findMany({
    include: { task: { include: { bin: { include: { location: true } }, collector: true } } },
    orderBy: { completedAt: "desc" },
  });
  const rows = [
    ["Collection date", "Bin", "Region", "Collector", "Category", "Quantity kg"],
    ...records.map((record) => [
      record.completedAt.toISOString(),
      record.task.bin.code,
      record.task.bin.location.region,
      record.task.collector?.name ?? "Unassigned",
      record.task.bin.category,
      String(record.quantityKg),
    ]),
  ];
  const csv = rows.map((row) => row.map((field) => `"${field.replaceAll('"', '""')}"`).join(",")).join("\r\n");
  res.type("text/csv").attachment("plastitrack-collections.csv").send(csv);
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const errorName = err instanceof Error ? err.name : "";
  const errorCode = typeof err === "object" && err !== null && "code" in err && typeof err.code === "string"
    ? err.code
    : "";
  if (errorName === "PrismaClientInitializationError" || ["P1000", "P1001", "P1002", "P1003", "P1017"].includes(errorCode)) {
    console.error(`Database connection error${errorCode ? ` (${errorCode})` : ""}. Check PostgreSQL and DATABASE_URL.`);
    res.status(503).json({
      error: "PlastiTrack cannot connect to PostgreSQL. Start the database and check DATABASE_URL in server/.env.",
    });
    return;
  }
  if (["P2021", "P2022"].includes(errorCode)) {
    console.error(`Database schema is not ready (${errorCode}). Run npm run demo:setup.`);
    res.status(503).json({
      error: "The PlastiTrack database is not initialized. Run npm run demo:setup, then sign in again.",
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

const server = app.listen(port, () => console.log(`PlastiTrack API listening on http://localhost:${port}`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
