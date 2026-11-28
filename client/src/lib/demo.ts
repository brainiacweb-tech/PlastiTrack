import type { Bin, CollectionTask, Role, User } from './api'

export const DEMO_PASSWORD = 'PlastiTrack!2026'
export const DEMO_TOKEN_PREFIX = 'local-demo:'
const DEMO_STATE_KEY = 'plastitrack-demo-state'

export const demoAccounts: User[] = [
  { id: 'demo-admin', name: 'Amina Owusu', email: 'admin@plastitrack.demo', role: 'ADMINISTRATOR', region: null, collectionPartnerId: null, recyclingCompanyId: null },
  { id: 'demo-partner-user', name: 'Kwame Mensah', email: 'partner@plastitrack.demo', role: 'COLLECTION_PARTNER', region: null, collectionPartnerId: 'demo-partner', recyclingCompanyId: null },
  { id: 'demo-collector-user', name: 'Abena Boateng', email: 'collector@plastitrack.demo', role: 'WASTE_COLLECTOR', region: null, collectionPartnerId: 'demo-partner', recyclingCompanyId: null },
  { id: 'demo-recycler-user', name: 'Kofi Addo', email: 'recycler@plastitrack.demo', role: 'RECYCLING_COMPANY', region: null, collectionPartnerId: null, recyclingCompanyId: 'demo-recycler' },
  { id: 'demo-manager', name: 'Esi Nkrumah', email: 'manager@plastitrack.demo', role: 'LOCATION_MANAGER', region: 'Ashanti Region', collectionPartnerId: null, recyclingCompanyId: null },
  { id: 'demo-officer', name: 'Yaw Asante', email: 'officer@plastitrack.demo', role: 'ENVIRONMENTAL_OFFICER', region: null, collectionPartnerId: null, recyclingCompanyId: null },
]

type DemoReading = { id: string; fillPercent: number; source: string; recordedAt: string }
type DemoBin = Bin & { device: NonNullable<Bin['device']> & { id: string }; readings: DemoReading[] }
type DemoTask = {
  id: string
  binId: string
  partnerId: string
  collectorId: string | null
  assignedToId: string | null
  status: string
  createdAt: string
  completedAt: string | null
}
type DemoCollector = { id: string; name: string; userId: string | null; partnerId: string }
type DemoInventory = { id: string; category: string; quantityKg: number; availableKg: number; collectedAt: string; binId: string }
type DemoRequest = { id: string; quantityKg: number; status: string; createdAt: string; inventoryId: string; companyId: string }
type DemoRecord = { id: string; taskId: string; quantityKg: number; completedAt: string; completedById: string; category: string; region: string }
type DemoNotification = { id: string; userId: string; title: string; message: string; href: string | null; readAt: string | null; createdAt: string }
type DemoState = {
  bins: DemoBin[]
  tasks: DemoTask[]
  collectors: DemoCollector[]
  inventory: DemoInventory[]
  requests: DemoRequest[]
  records: DemoRecord[]
  notifications: DemoNotification[]
}

const demoLocations = [
  { id: 'demo-location-adum', name: 'Adum Market Demonstration Site', region: 'Ashanti Region', address: 'Demonstration location — Adum, Kumasi', latitude: 6.6929, longitude: -1.6244 },
  { id: 'demo-location-bantama', name: 'Bantama Market Demonstration Site', region: 'Ashanti Region', address: 'Demonstration location — Bantama, Kumasi', latitude: 6.7055, longitude: -1.6356 },
  { id: 'demo-location-asokwa', name: 'Asokwa Community Demonstration Site', region: 'Ashanti Region', address: 'Demonstration location — Asokwa, Kumasi', latitude: 6.665, longitude: -1.601 },
]

const dateHoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
const dateDaysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

function createInitialState(): DemoState {
  const binSeeds = [
    { id: 'demo-bin-001', code: 'PT-001', name: 'Adum PET Collection Point', locationIndex: 0, category: 'PET', fillPercent: 86, capacityKg: 120, deviceStatus: 'ONLINE' },
    { id: 'demo-bin-002', code: 'PT-002', name: 'Bantama HDPE Collection Point', locationIndex: 1, category: 'HDPE', fillPercent: 52, capacityKg: 100, deviceStatus: 'ONLINE' },
    { id: 'demo-bin-003', code: 'PT-003', name: 'Asokwa Mixed Plastics Point', locationIndex: 2, category: 'MIXED', fillPercent: 23, capacityKg: 150, deviceStatus: 'OFFLINE' },
    { id: 'demo-bin-004', code: 'PT-004', name: 'Bantama PP Collection Point', locationIndex: 1, category: 'PP', fillPercent: 93, capacityKg: 100, deviceStatus: 'ONLINE' },
    { id: 'demo-bin-005', code: 'PT-005', name: 'Adum LDPE Collection Point', locationIndex: 0, category: 'LDPE', fillPercent: 68, capacityKg: 100, deviceStatus: 'ONLINE' },
    { id: 'demo-bin-006', code: 'PT-006', name: 'Asokwa PET Collection Point', locationIndex: 2, category: 'PET', fillPercent: 0, capacityKg: 120, deviceStatus: 'ONLINE' },
  ]

  const bins: DemoBin[] = binSeeds.map((seed, index) => {
    const location = demoLocations[seed.locationIndex]
    const timestamp = dateHoursAgo(index + 1)
    return {
      id: seed.id,
      code: seed.code,
      name: seed.name,
      category: seed.category,
      fillPercent: seed.fillPercent,
      capacityKg: seed.capacityKg,
      status: binStatus(seed.fillPercent),
      updatedAt: timestamp,
      location: { name: location.name, region: location.region, address: location.address, latitude: location.latitude, longitude: location.longitude },
      device: { id: `demo-device-${index + 1}`, status: seed.deviceStatus, lastCommunication: timestamp, isSimulated: true },
      readings: [{ id: `demo-reading-${index + 1}`, fillPercent: seed.fillPercent, source: 'SIMULATED', recordedAt: timestamp }],
    }
  })

  const collector: DemoCollector = { id: 'demo-collector', name: 'Abena Boateng', userId: 'demo-collector-user', partnerId: 'demo-partner' }
  const completedAt = dateDaysAgo(2)
  return {
    bins,
    collectors: [collector, { id: 'demo-collector-2', name: 'Kojo Asare', userId: null, partnerId: 'demo-partner' }],
    tasks: [
      { id: 'demo-task-active', binId: 'demo-bin-001', partnerId: 'demo-partner', collectorId: collector.id, assignedToId: collector.userId, status: 'ACCEPTED', createdAt: dateHoursAgo(5), completedAt: null },
      { id: 'demo-task-pending', binId: 'demo-bin-004', partnerId: 'demo-partner', collectorId: null, assignedToId: null, status: 'PENDING', createdAt: dateHoursAgo(2), completedAt: null },
      { id: 'demo-task-completed', binId: 'demo-bin-006', partnerId: 'demo-partner', collectorId: collector.id, assignedToId: collector.userId, status: 'COMPLETED', createdAt: completedAt, completedAt },
    ],
    inventory: [{ id: 'demo-inventory-001', category: 'PET', quantityKg: 42, availableKg: 42, collectedAt: completedAt, binId: 'demo-bin-006' }],
    requests: [],
    records: [{ id: 'demo-record-001', taskId: 'demo-task-completed', quantityKg: 42, completedAt, completedById: collector.userId ?? '', category: 'PET', region: 'Ashanti Region' }],
    notifications: [
      { id: 'demo-notification-admin', userId: 'demo-admin', title: 'PT-004 needs collection', message: 'A simulated bin reading is above the collection threshold.', href: '/app/bins', readAt: null, createdAt: dateHoursAgo(1) },
      { id: 'demo-notification-partner', userId: 'demo-partner-user', title: 'Collection task needs attention', message: 'PT-004 is ready for partner review.', href: '/app/collections', readAt: null, createdAt: dateHoursAgo(2) },
      { id: 'demo-notification-collector', userId: 'demo-collector-user', title: 'New collection task assigned', message: 'You have been assigned to PT-001.', href: '/app/collections', readAt: null, createdAt: dateHoursAgo(5) },
      { id: 'demo-notification-recycler', userId: 'demo-recycler-user', title: 'Recovered material available', message: '42 kg of PET plastic is ready to review.', href: '/app/marketplace', readAt: null, createdAt: dateDaysAgo(2) },
      { id: 'demo-notification-manager', userId: 'demo-manager', title: 'Adum site status', message: 'A simulated collection task is active in your region.', href: '/app/bins', readAt: null, createdAt: dateHoursAgo(3) },
      { id: 'demo-notification-officer', userId: 'demo-officer', title: 'Demo data is ready', message: 'Review simulated recovery trends in the analytics workspace.', href: '/app/analytics', readAt: null, createdAt: dateDaysAgo(1) },
    ],
  }
}

function readState(): DemoState {
  const stored = localStorage.getItem(DEMO_STATE_KEY)
  if (!stored) return createInitialState()
  try {
    const parsed: unknown = JSON.parse(stored)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'bins' in parsed && Array.isArray(parsed.bins) &&
      'tasks' in parsed && Array.isArray(parsed.tasks) &&
      'collectors' in parsed && Array.isArray(parsed.collectors) &&
      'inventory' in parsed && Array.isArray(parsed.inventory) &&
      'requests' in parsed && Array.isArray(parsed.requests) &&
      'records' in parsed && Array.isArray(parsed.records) &&
      'notifications' in parsed && Array.isArray(parsed.notifications)
    ) {
      const state = parsed as DemoState
      let migrated = false
      const oldLocations: Record<string, (typeof demoLocations)[number]> = {
        'Central Market Demo Site': demoLocations[0],
        'North District Demo Site': demoLocations[1],
        'Coastal District Demo Site': demoLocations[2],
      }
      const oldBinNames: Record<string, string> = {
        'Central PET Station': 'Adum PET Collection Point',
        'North HDPE Point': 'Bantama HDPE Collection Point',
        'Coastal Mixed Plastics': 'Asokwa Mixed Plastics Point',
        'North PP Collection': 'Bantama PP Collection Point',
        'Central LDPE Station': 'Adum LDPE Collection Point',
        'Coastal PET Station': 'Asokwa PET Collection Point',
      }
      for (const bin of state.bins) {
        const location = oldLocations[bin.location.name]
        if (location) {
          bin.location = {
            name: location.name,
            region: location.region,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
          }
          migrated = true
        }
        const name = oldBinNames[bin.name]
        if (name) {
          bin.name = name
          migrated = true
        }
      }
      for (const record of state.records) {
        if (['Central', 'North', 'Coastal'].includes(record.region)) {
          record.region = 'Ashanti Region'
          migrated = true
        }
      }
      for (const notification of state.notifications) {
        if (notification.title === 'Central site status') {
          notification.title = 'Adum site status'
          migrated = true
        }
      }
      if (migrated) saveState(state)
      return state
    }
  } catch (error) {
    console.warn('Saved PlastiTrack demo data was unreadable; restoring the starter scenario.', error)
  }
  localStorage.removeItem(DEMO_STATE_KEY)
  return createInitialState()
}

function saveState(state: DemoState) {
  localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state))
}

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function storedDemoUser(): User {
  const token = localStorage.getItem('plastitrack-token')
  const rawUser = localStorage.getItem('plastitrack-user')
  if (!token?.startsWith(DEMO_TOKEN_PREFIX) || !rawUser) throw new Error('Your demo session has ended. Sign in again.')
  const user = JSON.parse(rawUser) as User
  const account = demoAccounts.find((item) => item.id === user.id)
  if (!account || token !== `${DEMO_TOKEN_PREFIX}${account.id}`) {
    throw new Error('Your demo session is invalid. Sign in again.')
  }
  return copy(account)
}

export function isLocalDemoToken(token: string | null): boolean {
  return Boolean(token?.startsWith(DEMO_TOKEN_PREFIX))
}

export function loadDemoUser(): User | null {
  const token = localStorage.getItem('plastitrack-token')
  const rawUser = localStorage.getItem('plastitrack-user')
  if (!isLocalDemoToken(token) || !rawUser) {
    if (token || rawUser) {
      localStorage.removeItem('plastitrack-token')
      localStorage.removeItem('plastitrack-user')
    }
    return null
  }
  try {
    const user = JSON.parse(rawUser) as User
    const account = demoAccounts.find((item) => item.id === user.id)
    if (account && token === `${DEMO_TOKEN_PREFIX}${account.id}`) return copy(account)
    localStorage.removeItem('plastitrack-token')
    localStorage.removeItem('plastitrack-user')
    return null
  } catch (error) {
    console.warn('Saved PlastiTrack demo session was unreadable; asking the user to sign in again.', error)
    localStorage.removeItem('plastitrack-token')
    localStorage.removeItem('plastitrack-user')
    return null
  }
}

export function authenticateDemoUser(email: string, password: string): { token: string; user: User } {
  const user = demoAccounts.find((account) => account.email === email.trim().toLowerCase())
  if (!user || password !== DEMO_PASSWORD) {
    throw new Error('Choose one of the listed demo accounts and use the shared demo password.')
  }
  return { token: `${DEMO_TOKEN_PREFIX}${user.id}`, user: copy(user) }
}

function binStatus(fillPercent: number) {
  if (fillPercent >= 100) return 'FULL'
  if (fillPercent >= 80) return 'NEARLY_FULL'
  if (fillPercent >= 60) return 'FILLING_UP'
  if (fillPercent >= 30) return 'PARTIAL'
  return 'LOW'
}

function getBin(state: DemoState, id: string): DemoBin {
  const bin = state.bins.find((item) => item.id === id)
  if (!bin) throw new Error('Smart bin not found.')
  return bin
}

function expandTask(state: DemoState, task: DemoTask): CollectionTask {
  const bin = getBin(state, task.binId)
  const collector = state.collectors.find((item) => item.id === task.collectorId)
  return {
    id: task.id,
    status: task.status,
    createdAt: task.createdAt,
    bin: copy(bin),
    collector: collector ? { id: collector.id, name: collector.name, userId: collector.userId } : null,
    partner: { name: 'Asante Green Route' },
  }
}

function expandInventory(state: DemoState, item: DemoInventory) {
  return { ...item, bin: copy(getBin(state, item.binId)) }
}

function expandRequest(state: DemoState, request: DemoRequest) {
  const inventory = state.inventory.find((item) => item.id === request.inventoryId)
  if (!inventory) throw new Error('Requested inventory is no longer available.')
  return {
    id: request.id,
    quantityKg: request.quantityKg,
    status: request.status,
    createdAt: request.createdAt,
    inventory: expandInventory(state, inventory),
    company: { name: 'Kumasi Circular Materials' },
  }
}

function currentBins(state: DemoState, user: User) {
  const assignedBinIds = state.tasks.filter((task) => task.assignedToId === user.id).map((task) => task.binId)
  return state.bins.filter((bin) => {
    if (user.role === 'WASTE_COLLECTOR') return assignedBinIds.includes(bin.id)
    if (user.role === 'COLLECTION_PARTNER') return bin.location.region === 'Ashanti Region'
    if (user.role === 'LOCATION_MANAGER') return bin.location.region === user.region
    return true
  })
}

function currentTasks(state: DemoState, user: User) {
  return state.tasks.filter((task) => {
    if (user.role === 'COLLECTION_PARTNER') return task.partnerId === user.collectionPartnerId
    if (user.role === 'WASTE_COLLECTOR') return task.assignedToId === user.id
    return true
  })
}

function addNotification(state: DemoState, roles: Role[], title: string, message: string, href: string) {
  const now = new Date().toISOString()
  for (const account of demoAccounts.filter((item) => roles.includes(item.role))) {
    state.notifications.unshift({ id: createId('demo-notification'), userId: account.id, title, message, href, readAt: null, createdAt: now })
  }
}

function recordReading(state: DemoState, bin: DemoBin, fillPercent: number) {
  const previousFill = bin.fillPercent
  const now = new Date().toISOString()
  bin.fillPercent = fillPercent
  bin.status = binStatus(fillPercent)
  bin.updatedAt = now
  bin.device.status = 'ONLINE'
  bin.device.lastCommunication = now
  bin.readings.unshift({ id: createId('demo-reading'), fillPercent, source: 'SIMULATED', recordedAt: now })
  if (previousFill < 80 && fillPercent >= 80) {
    const alreadyActive = state.tasks.some((task) => task.binId === bin.id && !['COMPLETED', 'CANCELLED'].includes(task.status))
    if (!alreadyActive) {
      state.tasks.unshift({ id: createId('demo-task'), binId: bin.id, partnerId: 'demo-partner', collectorId: null, assignedToId: null, status: 'PENDING', createdAt: now, completedAt: null })
    }
    addNotification(state, ['ADMINISTRATOR', 'COLLECTION_PARTNER', 'LOCATION_MANAGER'], `${bin.code} needs collection`, `The simulated reading reached ${fillPercent}%.`, '/app/bins')
  }
}

function getAnalytics(state: DemoState) {
  const totalCollectedKg = state.records.reduce((sum, record) => sum + record.quantityKg, 0)
  const statusCounts = new Map<string, number>()
  const categoryTotals = new Map<string, number>()
  const regionTotals = new Map<string, number>()
  const monthTotals = new Map<string, number>()
  const requestTotals = new Map<string, { count: number; quantityKg: number }>()

  for (const bin of state.bins) statusCounts.set(bin.status, (statusCounts.get(bin.status) ?? 0) + 1)
  for (const record of state.records) {
    categoryTotals.set(record.category, (categoryTotals.get(record.category) ?? 0) + record.quantityKg)
    regionTotals.set(record.region, (regionTotals.get(record.region) ?? 0) + record.quantityKg)
    const month = record.completedAt.slice(0, 7)
    monthTotals.set(month, (monthTotals.get(month) ?? 0) + record.quantityKg)
  }
  for (const request of state.requests) {
    const total = requestTotals.get(request.status) ?? { count: 0, quantityKg: 0 }
    total.count += 1
    total.quantityKg += request.quantityKg
    requestTotals.set(request.status, total)
  }
  return {
    metrics: {
      totalCollectedKg,
      completedCollections: state.records.length,
      totalBins: state.bins.length,
      averageFillPercent: state.bins.length ? Math.round(state.bins.reduce((sum, bin) => sum + bin.fillPercent, 0) / state.bins.length) : 0,
    },
    binsByStatus: [...statusCounts].map(([status, count]) => ({ status, count })),
    categoryDistribution: [...categoryTotals].map(([category, quantityKg]) => ({ category, quantityKg })),
    regionalPerformance: [...regionTotals].map(([region, quantityKg]) => ({ region, quantityKg })),
    monthlyCollections: [...monthTotals].map(([month, quantityKg]) => ({ month, quantityKg })),
    recyclingRequests: [...requestTotals].map(([status, total]) => ({ status, ...total })),
  }
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export function createDemoCollectionsCsv() {
  const state = readState()
  const rows = [
    ['Collection date', 'Bin', 'Region', 'Collector', 'Category', 'Quantity kg'],
    ...state.records.map((record) => {
      const task = state.tasks.find((item) => item.id === record.taskId)
      const collector = task?.collectorId ? state.collectors.find((item) => item.id === task.collectorId) : undefined
      return [record.completedAt, getBin(state, task?.binId ?? '').code, record.region, collector?.name ?? 'Unassigned', record.category, String(record.quantityKg)]
    }),
  ]
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
}

export async function demoApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const user = storedDemoUser()
  const method = (options.method ?? 'GET').toUpperCase()
  const url = new URL(path, 'http://plastitrack.demo')
  const route = decodeURIComponent(url.pathname)
  const body = typeof options.body === 'string' ? JSON.parse(options.body) as Record<string, unknown> : {}
  const state = readState()

  if (method === 'GET' && route === '/auth/me') return copy({ user }) as T
  if (method === 'GET' && route === '/dashboard') {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setDate(1)
      date.setMonth(date.getMonth() - (5 - index))
      const key = date.toISOString().slice(0, 7)
      const kg = state.records.filter((record) => record.completedAt.slice(0, 7) === key).reduce((sum, record) => sum + record.quantityKg, 0)
      return { month: new Intl.DateTimeFormat('en', { month: 'short' }).format(date), kg }
    })
    const completed = state.records.reduce((sum, record) => sum + record.quantityKg, 0)
    const activeTasks = state.tasks.filter((task) => !['COMPLETED', 'CANCELLED'].includes(task.status)).length
    return copy({
      metrics: {
        totalBins: state.bins.length,
        binsRequiringCollection: state.bins.filter((bin) => bin.fillPercent >= 80).length,
        activeTasks,
        completedCollections: state.records.length,
        plasticCollectedKg: completed,
        availablePlasticKg: state.inventory.reduce((sum, item) => sum + item.availableKg, 0),
        averageFillPercent: state.bins.length ? Math.round(state.bins.reduce((sum, bin) => sum + bin.fillPercent, 0) / state.bins.length) : 0,
        unreadNotifications: state.notifications.filter((item) => item.userId === user.id && !item.readAt).length,
      },
      monthlyCollections: months,
    }) as T
  }
  if (method === 'GET' && route === '/bins') {
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const status = url.searchParams.get('status')
    const bins = currentBins(state, user).filter((bin) => {
      const matchesSearch = `${bin.code} ${bin.name} ${bin.location.name}`.toLowerCase().includes(search)
      const matchesStatus = !status || status === 'ALL' || bin.status === status || (status === 'OFFLINE' && bin.device.status === 'OFFLINE')
      return matchesSearch && matchesStatus
    })
    return copy({ bins }) as T
  }
  const binDetails = route.match(/^\/bins\/([^/]+)$/)
  if (method === 'GET' && binDetails) {
    const bin = getBin(state, binDetails[1])
    return copy({ bin: { ...bin, tasks: state.tasks.filter((task) => task.binId === bin.id).map((task) => expandTask(state, task)) } }) as T
  }
  const simulation = route.match(/^\/bins\/([^/]+)\/simulation$/)
  if (method === 'POST' && simulation) {
    if (user.role !== 'ADMINISTRATOR') throw new Error('Only the administrator can change demo sensor readings.')
    const bin = getBin(state, simulation[1])
    const action = body.action
    if (action === 'offline' || action === 'online') {
      bin.device.status = action === 'online' ? 'ONLINE' : 'OFFLINE'
      bin.device.lastCommunication = new Date().toISOString()
      if (action === 'offline') addNotification(state, ['ADMINISTRATOR', 'COLLECTION_PARTNER'], `${bin.code} is offline`, 'The simulated device has stopped communicating.', '/app/bins')
      saveState(state)
      return copy({ binId: bin.id, deviceStatus: bin.device.status }) as T
    }
    const amount = typeof body.amount === 'number' ? body.amount : 10
    const fillPercent = action === 'set' && typeof body.fillPercent === 'number'
      ? body.fillPercent
      : Math.max(0, Math.min(100, bin.fillPercent + (action === 'increase' ? amount : -amount)))
    recordReading(state, bin, fillPercent)
    saveState(state)
    return copy({ binId: bin.id, reading: { fillPercent, status: bin.status, source: 'SIMULATED', recordedAt: bin.updatedAt } }) as T
  }
  if (method === 'POST' && route === '/bins') {
    if (user.role !== 'ADMINISTRATOR') throw new Error('Only the administrator can register a demo bin.')
    const id = createId('demo-bin')
    const now = new Date().toISOString()
    const bin: DemoBin = {
      id,
      code: String(body.code ?? ''),
      name: String(body.name ?? ''),
      category: String(body.category ?? 'PET'),
      fillPercent: 0,
      capacityKg: Number(body.capacityKg ?? 120),
      status: 'LOW',
      updatedAt: now,
      location: {
        name: String(body.locationName ?? ''),
        region: String(body.region ?? ''),
        address: String(body.address ?? ''),
        latitude: Number(body.latitude ?? 0),
        longitude: Number(body.longitude ?? 0),
      },
      device: { id: createId('demo-device'), status: 'ONLINE', lastCommunication: now, isSimulated: true },
      readings: [{ id: createId('demo-reading'), fillPercent: 0, source: 'SIMULATED', recordedAt: now }],
    }
    state.bins.unshift(bin)
    saveState(state)
    return copy({ bin }) as T
  }
  if (method === 'GET' && route === '/collections') {
    return copy({ tasks: currentTasks(state, user).map((task) => expandTask(state, task)) }) as T
  }
  if (method === 'GET' && route === '/collectors') {
    const collectors = user.role === 'ADMINISTRATOR' || user.role === 'COLLECTION_PARTNER'
      ? state.collectors.map(({ id, name, userId }) => ({ id, name, userId }))
      : []
    return copy({ collectors }) as T
  }
  const assignTask = route.match(/^\/collections\/([^/]+)\/assign$/)
  if (method === 'POST' && assignTask) {
    if (!['ADMINISTRATOR', 'COLLECTION_PARTNER'].includes(user.role)) throw new Error('You do not have permission to assign collections.')
    const task = state.tasks.find((item) => item.id === assignTask[1])
    const collector = state.collectors.find((item) => item.id === body.collectorId)
    if (!task || !collector) throw new Error('Choose an available demo collector.')
    task.collectorId = collector.id
    task.assignedToId = collector.userId
    task.status = 'PENDING'
    saveState(state)
    return copy({ task: expandTask(state, task) }) as T
  }
  const updateTask = route.match(/^\/collections\/([^/]+)\/status$/)
  if (method === 'PATCH' && updateTask) {
    if (!['ADMINISTRATOR', 'COLLECTION_PARTNER', 'WASTE_COLLECTOR'].includes(user.role)) throw new Error('You do not have permission to update collections.')
    const task = state.tasks.find((item) => item.id === updateTask[1])
    const status = String(body.status ?? '')
    const sequence: Record<string, string> = { PENDING: 'ACCEPTED', ACCEPTED: 'EN_ROUTE', EN_ROUTE: 'ARRIVED', ARRIVED: 'COLLECTING', COLLECTING: 'COMPLETED' }
    if (!task) throw new Error('Collection task not found.')
    if (sequence[task.status] !== status) throw new Error(`A ${task.status.toLowerCase()} task cannot move directly to ${status.toLowerCase()}.`)
    if (user.role === 'WASTE_COLLECTOR' && task.assignedToId !== user.id) throw new Error('This collection is outside your assignment.')
    if (status === 'COMPLETED') {
      const quantityKg = Number(body.quantityKg)
      if (!Number.isFinite(quantityKg) || quantityKg <= 0) throw new Error('A positive collection quantity is required to complete a task.')
      const bin = getBin(state, task.binId)
      const completedAt = new Date().toISOString()
      task.status = 'COMPLETED'
      task.completedAt = completedAt
      state.records.push({ id: createId('demo-record'), taskId: task.id, quantityKg, completedAt, completedById: user.id, category: bin.category, region: bin.location.region })
      state.inventory.unshift({ id: createId('demo-inventory'), category: bin.category, quantityKg, availableKg: quantityKg, collectedAt: completedAt, binId: bin.id })
      bin.fillPercent = 0
      bin.status = 'LOW'
      bin.updatedAt = completedAt
      bin.device.lastCommunication = completedAt
      bin.readings.unshift({ id: createId('demo-reading'), fillPercent: 0, source: 'COLLECTION_RESET', recordedAt: completedAt })
      addNotification(state, ['ADMINISTRATOR', 'ENVIRONMENTAL_OFFICER', 'RECYCLING_COMPANY'], 'Collection completed', `${quantityKg} kg of ${bin.category} plastic is available for recycling.`, '/app/marketplace')
      saveState(state)
      return copy({ task: expandTask(state, task) }) as T
    }
    task.status = status
    saveState(state)
    return copy({ task: expandTask(state, task) }) as T
  }
  if (method === 'GET' && route === '/marketplace/inventory') {
    return copy({ inventory: state.inventory.filter((item) => item.availableKg > 0).map((item) => expandInventory(state, item)) }) as T
  }
  if (method === 'GET' && route === '/marketplace/requests') {
    const requests = user.role === 'ADMINISTRATOR' || user.role === 'RECYCLING_COMPANY' ? state.requests : []
    return copy({ requests: requests.map((item) => expandRequest(state, item)) }) as T
  }
  if (method === 'POST' && route === '/marketplace/requests') {
    if (user.role !== 'RECYCLING_COMPANY') throw new Error('Only recycling partners can submit material requests.')
    const item = state.inventory.find((entry) => entry.id === body.inventoryId)
    const quantityKg = Number(body.quantityKg)
    if (!item || !Number.isFinite(quantityKg) || quantityKg <= 0 || quantityKg > item.availableKg) {
      throw new Error('Enter a valid quantity within the available inventory.')
    }
    item.availableKg -= quantityKg
    const request: DemoRequest = { id: createId('demo-request'), quantityKg, status: 'PENDING', createdAt: new Date().toISOString(), inventoryId: item.id, companyId: user.recyclingCompanyId ?? 'demo-recycler' }
    state.requests.unshift(request)
    addNotification(state, ['ADMINISTRATOR'], 'New recycling request', `A company requested ${quantityKg} kg of ${item.category}.`, '/app/marketplace')
    saveState(state)
    return copy({ request: expandRequest(state, request) }) as T
  }
  const updateRequest = route.match(/^\/marketplace\/requests\/([^/]+)\/status$/)
  if (method === 'PATCH' && updateRequest) {
    if (user.role !== 'ADMINISTRATOR') throw new Error('Only the administrator can update recycling requests.')
    const request = state.requests.find((item) => item.id === updateRequest[1])
    const status = String(body.status ?? '')
    const allowed: Record<string, string[]> = { PENDING: ['APPROVED', 'REJECTED'], APPROVED: ['PROCESSING'], REJECTED: [], PROCESSING: ['DISPATCHED'], DISPATCHED: ['DELIVERED'], DELIVERED: [] }
    if (!request) throw new Error('Recycling request not found.')
    if (!allowed[request.status]?.includes(status)) throw new Error(`A ${request.status.toLowerCase()} request cannot move to ${status.toLowerCase()}.`)
    request.status = status
    if (status === 'REJECTED') {
      const item = state.inventory.find((entry) => entry.id === request.inventoryId)
      if (item) item.availableKg += request.quantityKg
    }
    saveState(state)
    return copy({ request: expandRequest(state, request) }) as T
  }
  if (method === 'GET' && route === '/notifications') {
    return copy({ notifications: state.notifications.filter((item) => item.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }) as T
  }
  const markRead = route.match(/^\/notifications\/([^/]+)\/read$/)
  if (method === 'PATCH' && markRead) {
    const notification = state.notifications.find((item) => item.id === markRead[1] && item.userId === user.id)
    if (!notification) throw new Error('Notification not found.')
    notification.readAt = new Date().toISOString()
    saveState(state)
    return copy({ success: true }) as T
  }
  if (method === 'GET' && route === '/analytics') return copy(getAnalytics(state)) as T
  if (method === 'POST' && route === '/demo/reset') {
    if (user.role !== 'ADMINISTRATOR') throw new Error('Only the administrator can reset demo data.')
    const initial = createInitialState()
    saveState(initial)
    return copy({ message: 'Demonstration data has been reset.' }) as T
  }
  throw new Error(`The browser demo does not support ${method} ${route}.`)
}
