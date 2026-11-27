import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  Download,
  ExternalLink,
  Filter,
  Leaf,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Radio,
  Recycle,
  RefreshCw,
  Search,
  ShieldAlert,
  Signal,
  Truck,
  WifiOff,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useAuth } from '../app/useAuth'
import { api, formatDate, roleLabel } from '../lib/api'
import type { Bin, CollectionTask, Role } from '../lib/api'
import { createDemoCollectionsCsv, isLocalDemoToken } from '../lib/demo'

type Metrics = {
  totalBins: number
  binsRequiringCollection: number
  activeTasks: number
  completedCollections: number
  plasticCollectedKg: number
  availablePlasticKg: number
  averageFillPercent: number
  unreadNotifications: number
}

type DashboardPayload = {
  metrics: Metrics
  monthlyCollections: { month: string; kg: number }[]
}

function useResource<T>(path: string, refreshKey = 0, enabled = true) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    if (!enabled) return
    setError('')
    try {
      setData(await api<T>(path))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load this information.')
    }
  }, [enabled, path])
  useEffect(() => {
    if (!enabled) return
    let active = true
    void api<T>(path)
      .then((value) => {
        if (active) {
          setData(value)
          setError('')
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load this information.')
      })
    return () => { active = false }
  }, [enabled, path, refreshKey])
  return { data: enabled ? data : null, error: enabled ? error : '', loading: enabled && data === null && error === '', reload }
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="section-kicker">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</div>
}

function ErrorState({ error, retry }: { error: string; retry?: () => void }) {
  return <div className="error-state"><CircleAlert size={18} /><span>{error}</span>{retry && <button className="text-button" onClick={retry}>Try again</button>}</div>
}

function LoadingState() {
  return <div className="loading-state"><span className="loading-spinner" /> Loading platform data…</div>
}

function MetricCard({ label, value, note, icon: Icon, tone = 'green', trend }: { label: string; value: string | number; note: string; icon: typeof Activity; tone?: string; trend?: string }) {
  return <article className="metric-card"><div className="metric-top"><span className={`metric-icon metric-${tone}`}><Icon size={18} /></span>{trend && <span className="metric-trend">{trend}</span>}</div><p>{label}</p><strong>{value}</strong><span className="metric-note">{note}</span></article>
}

function statusClass(status: string) {
  return `status-pill status-${status.toLowerCase().replaceAll('_', '-')}`
}

function prettify(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function DashboardPage() {
  const { user } = useAuth()
  const role = user?.role
  const dashboardQuery = useResource<DashboardPayload>('/dashboard')
  const canViewBins = role !== 'RECYCLING_COMPANY'
  const canViewCollections = role === 'ADMINISTRATOR' || role === 'COLLECTION_PARTNER' || role === 'WASTE_COLLECTOR'
  const canViewMarketplace = role === 'ADMINISTRATOR' || role === 'COLLECTION_PARTNER' || role === 'RECYCLING_COMPANY' || role === 'ENVIRONMENTAL_OFFICER'
  const canViewRequests = role === 'ADMINISTRATOR' || role === 'RECYCLING_COMPANY'
  const canViewAnalytics = role === 'ADMINISTRATOR' || role === 'ENVIRONMENTAL_OFFICER'
  const binQuery = useResource<{ bins: Bin[] }>('/bins', 0, canViewBins)
  const taskQuery = useResource<{ tasks: CollectionTask[] }>('/collections', 0, canViewCollections)
  const inventoryQuery = useResource<{ inventory: DashboardInventory[] }>('/marketplace/inventory', 0, canViewMarketplace)
  const requestQuery = useResource<{ requests: DashboardRequest[] }>('/marketplace/requests', 0, canViewRequests)
  const analyticsQuery = useResource<DashboardAnalytics>('/analytics', 0, canViewAnalytics)
  const bins = binQuery.data?.bins ?? []
  const tasks = taskQuery.data?.tasks ?? []
  const inventory = inventoryQuery.data?.inventory ?? []
  const requests = requestQuery.data?.requests ?? []
  const dashboard = dashboardQuery.data
  const analytics = analyticsQuery.data
  const errors = [dashboardQuery.error, binQuery.error, taskQuery.error, inventoryQuery.error, requestQuery.error, analyticsQuery.error].filter(Boolean)
  const loading = dashboardQuery.loading || binQuery.loading || taskQuery.loading || inventoryQuery.loading || requestQuery.loading || analyticsQuery.loading

  async function reload() {
    await Promise.all([
      dashboardQuery.reload(),
      binQuery.reload(),
      taskQuery.reload(),
      inventoryQuery.reload(),
      requestQuery.reload(),
      analyticsQuery.reload(),
    ])
  }

  if (!user) return <LoadingState />
  if (loading) return <div className="page-stack"><LoadingState /></div>

  return (
    <div className="page-stack role-dashboard">
      {errors[0] && <ErrorState error={errors[0]} retry={() => void reload()} />}
      {user.role === 'ADMINISTRATOR' && <AdministratorDashboard dashboard={dashboard} bins={bins} tasks={tasks} />}
      {user.role === 'COLLECTION_PARTNER' && <PartnerDashboard bins={bins} tasks={tasks} />}
      {user.role === 'WASTE_COLLECTOR' && <CollectorDashboard tasks={tasks} />}
      {user.role === 'RECYCLING_COMPANY' && <RecyclerDashboard inventory={inventory} requests={requests} />}
      {user.role === 'LOCATION_MANAGER' && <LocationDashboard bins={bins} />}
      {user.role === 'ENVIRONMENTAL_OFFICER' && <OfficerDashboard analytics={analytics} />}
    </div>
  )
}

type DashboardInventory = {
  id: string
  category: string
  quantityKg: number
  availableKg: number
  collectedAt: string
  bin: { code: string; name: string; location: { name: string; region: string } }
}
type DashboardRequest = {
  id: string
  quantityKg: number
  status: string
  createdAt: string
  inventory: { category: string; bin: { name: string } }
}
type DashboardAnalytics = {
  metrics: { totalCollectedKg: number; completedCollections: number; totalBins: number; averageFillPercent: number }
  categoryDistribution: { category: string; quantityKg: number }[]
  regionalPerformance: { region: string; quantityKg: number }[]
  monthlyCollections: { month: string; quantityKg: number }[]
}

function AdministratorDashboard({ dashboard, bins, tasks }: { dashboard: DashboardPayload | null; bins: Bin[]; tasks: CollectionTask[] }) {
  const metrics = dashboard?.metrics
  const attentionBins = bins.filter((bin) => bin.fillPercent >= 80 || bin.device?.status === 'OFFLINE').slice(0, 4)
  const onlineBins = bins.filter((bin) => bin.device?.status === 'ONLINE').length

  return <>
    <PageTitle eyebrow="ADMINISTRATOR WORKSPACE" title="Network overview" description="Monitor network health, resolve collection alerts, and follow activity across every demo site." action={<Link to="/app/bins" className="button button-outline button-compact"><MapPin size={16} /> Manage network</Link>} />
    <div className="metrics-grid">
      <MetricCard label="Registered smart bins" value={metrics?.totalBins ?? 0} note="Across demonstration sites" icon={Signal} />
      <MetricCard label="Need attention" value={metrics?.binsRequiringCollection ?? 0} note="At or above 80% capacity" icon={CircleAlert} tone="amber" />
      <MetricCard label="Active collections" value={metrics?.activeTasks ?? 0} note="In the collection workflow" icon={Truck} tone="blue" />
      <MetricCard label="Plastic recovered" value={`${Math.round(metrics?.plasticCollectedKg ?? 0)} kg`} note="From completed demo tasks" icon={PackageCheck} tone="lime" />
    </div>
    <div className="dashboard-grid">
      <section className="panel trend-panel">
        <div className="panel-header"><div><h2>Collection activity</h2><p>Recovered plastic by month</p></div><span className="panel-period">Last 6 months <ChevronDown size={14} /></span></div>
        <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dashboard?.monthlyCollections ?? []}><defs><linearGradient id="collectionFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5a9c70" stopOpacity={0.19} /><stop offset="95%" stopColor="#5a9c70" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="#edf0ed" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8a938e', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8a938e', fontSize: 11 }} tickFormatter={(value: number) => `${value}kg`} /><Tooltip formatter={(value) => [`${value} kg`, 'Collected']} /><Area type="monotone" dataKey="kg" stroke="#347951" strokeWidth={2.5} fill="url(#collectionFill)" /></AreaChart></ResponsiveContainer></div>
        <div className="chart-footer"><span><i className="legend-dot" /> Plastic collected</span><strong>{Math.round(metrics?.plasticCollectedKg ?? 0)} kg <small>total recovered</small></strong></div>
      </section>
      <section className="panel attention-panel">
        <div className="panel-header"><div><h2>Priority alerts</h2><p>Bins requiring a follow-up</p></div><Link to="/app/bins" className="icon-link" aria-label="View all bins"><ArrowUpRight size={17} /></Link></div>
        <div className="attention-list">{attentionBins.map((bin) => <div className="attention-row" key={bin.id}><div className={`attention-status ${bin.device?.status === 'OFFLINE' ? 'attention-offline' : ''}`}>{bin.device?.status === 'OFFLINE' ? <WifiOff size={16} /> : <CircleAlert size={16} />}</div><div className="attention-copy"><strong>{bin.code} <span>{bin.device?.status === 'OFFLINE' ? 'Device offline' : 'Nearly full'}</span></strong><small>{bin.location.name} · {bin.device?.status === 'OFFLINE' ? 'Last contact' : `${bin.fillPercent}% capacity`}</small></div></div>)}{!attentionBins.length && <div className="empty-state"><Check size={18} /><strong>All clear</strong><span>No bins currently need attention.</span></div>}</div>
        <Link to="/app/bins?status=NEARLY_FULL" className="panel-footer-link">Open attention queue <ArrowRight size={15} /></Link>
      </section>
    </div>
    <div className="dashboard-grid dashboard-grid-lower">
      <section className="panel task-panel"><div className="panel-header"><div><h2>Latest collection activity</h2><p>Recent tasks across the network</p></div><Link to="/app/collections" className="text-link">View tasks <ArrowRight size={15} /></Link></div>
        <div className="table-scroll task-desktop-list"><table><thead><tr><th>BIN</th><th>LOCATION</th><th>COLLECTOR</th><th>STATUS</th></tr></thead><tbody>{tasks.slice(0, 4).map((task) => <tr key={task.id}><td><strong>{task.bin.code}</strong></td><td>{task.bin.location.name}</td><td>{task.collector?.name ?? 'Awaiting assignment'}</td><td><span className={statusClass(task.status)}>{prettify(task.status)}</span></td></tr>)}{!tasks.length && <tr><td colSpan={4} className="table-empty">New tasks will appear when bins reach 80%.</td></tr>}</tbody></table></div>
        <div className="task-mobile-list">{tasks.slice(0, 4).map((task) => <article className="task-mobile-card" key={task.id}>
          <div className="task-mobile-heading"><strong>{task.bin.code}</strong><span className={statusClass(task.status)}>{prettify(task.status)}</span></div>
          <dl><div><dt>Location</dt><dd>{task.bin.location.name}</dd></div><div><dt>Collector</dt><dd>{task.collector?.name ?? 'Awaiting assignment'}</dd></div></dl>
        </article>)}{!tasks.length && <p className="task-mobile-empty">New tasks will appear when bins reach 80%.</p>}</div>
      </section>
      <section className="panel network-panel"><div className="panel-header"><div><h2>Device connectivity</h2><p>Current simulated network health</p></div><Signal size={17} className="subtle-icon" /></div>
        <div className="network-summary"><strong>{onlineBins}<span> / {bins.length}</span></strong><small>devices online</small></div><div className="network-meter"><span style={{ width: `${bins.length ? (onlineBins / bins.length) * 100 : 0}%` }} /></div>
        <div className="network-legend"><span><i className="legend-dot legend-online" /> Online <b>{onlineBins}</b></span><span><i className="legend-dot legend-offline" /> Offline <b>{bins.length - onlineBins}</b></span></div><div className="demo-caption"><Radio size={14} /> Telemetry is simulated.</div>
      </section>
    </div>
  </>
}

function PartnerDashboard({ bins, tasks }: { bins: Bin[]; tasks: CollectionTask[] }) {
  const openTasks = tasks.filter((task) => !['COMPLETED', 'CANCELLED'].includes(task.status))
  const waitingTasks = openTasks.filter((task) => !task.collector)
  const activeTasks = openTasks.filter((task) => task.collector)
  const priorityBins = bins.filter((bin) => bin.fillPercent >= 80).sort((a, b) => b.fillPercent - a.fillPercent)
  const collectorLoads = new Map<string, number>()
  for (const task of activeTasks) {
    const name = task.collector?.name ?? 'Unassigned'
    collectorLoads.set(name, (collectorLoads.get(name) ?? 0) + 1)
  }

  return <>
    <PageTitle eyebrow="COLLECTION PARTNER" title="Dispatch & team workload" description="Assign the next pickups, balance work across your team, and keep high-fill sites moving." action={<Link to="/app/collections" className="button button-primary button-compact"><Truck size={15} /> Manage assignments</Link>} />
    <div className="metrics-grid">
      <MetricCard label="Waiting for assignment" value={waitingTasks.length} note="Tasks needing a collector" icon={CircleAlert} tone="amber" />
      <MetricCard label="Assigned and active" value={activeTasks.length} note="Work currently in progress" icon={Truck} tone="blue" />
      <MetricCard label="Priority locations" value={priorityBins.length} note="Bins at or above 80%" icon={MapPin} />
      <MetricCard label="Completed pickups" value={tasks.filter((task) => task.status === 'COMPLETED').length} note="In this demo scenario" icon={CircleCheck} tone="lime" />
    </div>
    <div className="overview-grid">
      <section className="panel"><div className="panel-header"><div><h2>Dispatch queue</h2><p>Unassigned pickups to review first</p></div><Link to="/app/collections" className="text-link">Open queue <ArrowRight size={14} /></Link></div>
        <div className="overview-list">{waitingTasks.slice(0, 5).map((task) => <div className="overview-list-row" key={task.id}><span className="overview-row-icon overview-icon-amber"><Truck size={16} /></span><div className="overview-row-copy"><strong>{task.bin.code} · {task.bin.name}</strong><small>{task.bin.location.name} · {task.bin.location.region}</small></div><span className="status-pill status-pending">{prettify(task.status)}</span></div>)}{!waitingTasks.length && <div className="empty-state"><CircleCheck size={18} /><strong>Queue is clear</strong><span>New recommendations will appear when bins reach threshold.</span></div>}</div>
      </section>
      <section className="panel"><div className="panel-header"><div><h2>Team workload</h2><p>Active tasks by assigned collector</p></div><Building2 size={17} className="subtle-icon" /></div>
        <div className="overview-list">{[...collectorLoads].map(([name, count]) => <div className="overview-list-row" key={name}><span className="overview-avatar">{name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div className="overview-row-copy"><strong>{name}</strong><small>Assigned collection work</small></div><span className="overview-count">{count}</span></div>)}{!collectorLoads.size && <div className="empty-state"><Truck size={18} /><strong>No active assignments</strong><span>Assign a collector to start a pickup.</span></div>}</div>
      </section>
    </div>
    <section className="panel"><div className="panel-header"><div><h2>Sites to prioritize</h2><p>Highest fill levels in your service area</p></div><Link to="/app/bins" className="text-link">View service area <ArrowRight size={14} /></Link></div>
      <div className="overview-list overview-site-list">{priorityBins.slice(0, 4).map((bin) => <div className="overview-list-row" key={bin.id}><span className="overview-row-icon overview-icon-amber"><MapPin size={16} /></span><div className="overview-row-copy"><strong>{bin.code} · {bin.location.name}</strong><small>{bin.category} · {bin.device?.status === 'OFFLINE' ? 'Device offline' : 'Ready for collection'}</small></div><strong className="overview-fill">{bin.fillPercent}%</strong></div>)}</div>
    </section>
  </>
}

function CollectorDashboard({ tasks }: { tasks: CollectionTask[] }) {
  const activeTasks = tasks.filter((task) => !['COMPLETED', 'CANCELLED'].includes(task.status))
  const nextTask = activeTasks[0]
  const completedTasks = tasks.filter((task) => task.status === 'COMPLETED')
  const nextStep: Record<string, string> = { PENDING: 'Accept pickup', ACCEPTED: 'Start route', EN_ROUTE: 'Mark arrived', ARRIVED: 'Begin collection', COLLECTING: 'Record weight' }

  return <>
    <PageTitle eyebrow="WASTE COLLECTOR" title="My collection route" description="See your assigned stops, the next action for each task, and your completed pickups." action={<Link to="/app/collections" className="button button-primary button-compact"><MapPin size={15} /> Open my route</Link>} />
    <div className="metrics-grid">
      <MetricCard label="Open pickups" value={activeTasks.length} note="Assigned to your account" icon={Truck} tone="blue" />
      <MetricCard label="Ready to start" value={activeTasks.filter((task) => task.status === 'PENDING' || task.status === 'ACCEPTED').length} note="Waiting for your next action" icon={Clock3} tone="amber" />
      <MetricCard label="Completed pickups" value={completedTasks.length} note="Recorded in this demo" icon={CheckCheck} tone="lime" />
      <MetricCard label="Assigned sites" value={new Set(activeTasks.map((task) => task.bin.id)).size} note="Stops on your route" icon={MapPin} />
    </div>
    <div className="collector-focus-grid">
      <section className="panel next-stop-panel"><div className="panel-header"><div><h2>Next stop</h2><p>Your first active assignment</p></div><span className="simulation-badge"><Truck size={13} /> MY ROUTE</span></div>
        {nextTask ? <div className="next-stop-content"><span className="next-stop-code">{nextTask.bin.code}</span><h3>{nextTask.bin.name}</h3><p>{nextTask.bin.location.name} · {nextTask.bin.location.region}</p><div className="next-stop-meta"><span><Radio size={14} /> {nextTask.bin.fillPercent}% full</span><span className={statusClass(nextTask.status)}>{prettify(nextTask.status)}</span></div><Link to="/app/collections" className="button button-dark button-compact">{nextStep[nextTask.status] ?? 'View assignment'} <ArrowRight size={14} /></Link></div> : <div className="empty-state"><CircleCheck size={19} /><strong>Route complete</strong><span>No active collection stops are assigned to you.</span></div>}
      </section>
      <section className="panel"><div className="panel-header"><div><h2>Pickup progress</h2><p>Tasks assigned to your account</p></div><Link to="/app/collections" className="icon-link" aria-label="View all pickups"><ArrowUpRight size={16} /></Link></div>
        <div className="overview-list">{tasks.slice(0, 5).map((task) => <div className="overview-list-row" key={task.id}><span className={`overview-row-icon ${task.status === 'COMPLETED' ? 'overview-icon-green' : 'overview-icon-blue'}`}>{task.status === 'COMPLETED' ? <CheckCheck size={16} /> : <Truck size={16} />}</span><div className="overview-row-copy"><strong>{task.bin.code} · {task.bin.location.region}</strong><small>{task.bin.name}</small></div><span className={statusClass(task.status)}>{prettify(task.status)}</span></div>)}{!tasks.length && <div className="empty-state"><Truck size={18} /><strong>No assigned pickups</strong><span>Your partner will assign collection work here.</span></div>}</div>
      </section>
    </div>
    <div className="collector-tip"><CircleAlert size={16} /><span>Complete each status step in order. A collected weight is required before a pickup can be completed.</span></div>
  </>
}

function RecyclerDashboard({ inventory, requests }: { inventory: DashboardInventory[]; requests: DashboardRequest[] }) {
  const availableKg = inventory.reduce((sum, item) => sum + item.availableKg, 0)
  const categoryCount = new Set(inventory.map((item) => item.category)).size
  const openRequests = requests.filter((request) => !['DELIVERED', 'REJECTED'].includes(request.status))

  return <>
    <PageTitle eyebrow="RECYCLING COMPANY" title="Recovered materials" description="Review available plastics, track your requests, and find the next material ready for recovery." action={<Link to="/app/marketplace" className="button button-primary button-compact"><Recycle size={15} /> Browse marketplace</Link>} />
    <div className="metrics-grid">
      <MetricCard label="Available material" value={`${availableKg.toFixed(1)} kg`} note="Ready to request" icon={PackageCheck} tone="lime" />
      <MetricCard label="Material categories" value={categoryCount} note="Types currently available" icon={Recycle} />
      <MetricCard label="Open requests" value={openRequests.length} note="Awaiting completion" icon={Clock3} tone="amber" />
      <MetricCard label="Total requests" value={requests.length} note="Submitted by your company" icon={CheckCheck} tone="blue" />
    </div>
    <div className="overview-grid">
      <section className="panel"><div className="panel-header"><div><h2>Available for recovery</h2><p>Current stock by source bin</p></div><Link to="/app/marketplace" className="text-link">View stock <ArrowRight size={14} /></Link></div>
        <div className="overview-list">{inventory.slice(0, 5).map((item) => <div className="overview-list-row" key={item.id}><span className="material-mark material-pet">{item.category.slice(0, 2)}</span><div className="overview-row-copy"><strong>{item.category} · {item.bin.name}</strong><small>{item.bin.location.name}</small></div><strong className="overview-fill">{item.availableKg.toFixed(1)} kg</strong></div>)}{!inventory.length && <div className="empty-state"><PackageCheck size={18} /><strong>No available material</strong><span>New stock appears after a completed collection.</span></div>}</div>
      </section>
      <section className="panel"><div className="panel-header"><div><h2>Your request activity</h2><p>Recent material requests</p></div><PackageCheck size={17} className="subtle-icon" /></div>
        <div className="overview-list">{requests.slice(0, 5).map((request) => <div className="overview-list-row" key={request.id}><span className="overview-row-icon overview-icon-blue"><Recycle size={16} /></span><div className="overview-row-copy"><strong>{request.inventory.category} · {request.quantityKg} kg</strong><small>{request.inventory.bin.name} · {formatDate(request.createdAt)}</small></div><span className={statusClass(request.status)}>{prettify(request.status)}</span></div>)}{!requests.length && <div className="empty-state"><Recycle size={18} /><strong>No requests yet</strong><span>Choose an available material to start a request.</span></div>}</div>
      </section>
    </div>
  </>
}

function LocationDashboard({ bins }: { bins: Bin[] }) {
  const attentionBins = bins.filter((bin) => bin.fillPercent >= 80).sort((a, b) => b.fillPercent - a.fillPercent)
  const offlineBins = bins.filter((bin) => bin.device?.status === 'OFFLINE')
  const averageFill = bins.length ? Math.round(bins.reduce((sum, bin) => sum + bin.fillPercent, 0) / bins.length) : 0

  return <>
    <PageTitle eyebrow="LOCATION MANAGER" title="My site status" description="Monitor the bins at your location and see which ones may need collection or a connectivity check." action={<Link to="/app/bins" className="button button-outline button-compact"><Building2 size={15} /> View my bins</Link>} />
    <div className="metrics-grid">
      <MetricCard label="Bins at my site" value={bins.length} note="Visible to your account" icon={Building2} />
      <MetricCard label="Needs collection" value={attentionBins.length} note="At or above 80% full" icon={CircleAlert} tone="amber" />
      <MetricCard label="Offline devices" value={offlineBins.length} note="Connectivity needs review" icon={WifiOff} tone="blue" />
      <MetricCard label="Average fill" value={`${averageFill}%`} note="Across your visible bins" icon={Activity} tone="lime" />
    </div>
    <section className="panel"><div className="panel-header"><div><h2>Premises watchlist</h2><p>Fill level and device connection for each visible bin</p></div><span className="simulation-badge"><MapPin size={13} /> YOUR LOCATION</span></div>
      <div className="location-bin-grid">{bins.map((bin) => <article className="location-bin-card" key={bin.id}><div className="location-bin-top"><span className="category-chip">{bin.category}</span><span className={statusClass(bin.device?.status === 'OFFLINE' ? 'OFFLINE' : bin.status)}>{bin.device?.status === 'OFFLINE' ? 'Offline' : prettify(bin.status)}</span></div><strong>{bin.code} · {bin.name}</strong><small>{bin.location.name}</small><div className="location-fill-track"><span className={bin.fillPercent >= 80 ? 'location-fill-high' : ''} style={{ width: `${bin.fillPercent}%` }} /></div><div className="location-bin-bottom"><span>Capacity</span><b>{bin.fillPercent}%</b></div></article>)}{!bins.length && <div className="empty-state"><Building2 size={18} /><strong>No bins assigned</strong><span>There are no demo bins configured for your location.</span></div>}</div>
    </section>
    <div className="location-note"><CircleAlert size={16} /><span>For collection or device assistance, share the bin code with your collection partner. Readings are simulated in this demo.</span></div>
  </>
}

function OfficerDashboard({ analytics }: { analytics: DashboardAnalytics | null }) {
  const metrics = analytics?.metrics
  const highestRegion = [...(analytics?.regionalPerformance ?? [])].sort((a, b) => b.quantityKg - a.quantityKg)[0]
  const categoryRows = analytics?.categoryDistribution ?? []

  return <>
    <PageTitle eyebrow="ENVIRONMENTAL OFFICER" title="Recovery & impact snapshot" description="Review recovered material, geographic distribution, and collection trends across the demonstration network." action={<Link to="/app/analytics" className="button button-primary button-compact"><Leaf size={15} /> Full impact report</Link>} />
    <div className="metrics-grid">
      <MetricCard label="Plastic recovered" value={`${(metrics?.totalCollectedKg ?? 0).toLocaleString()} kg`} note="Recorded completed collections" icon={PackageCheck} tone="lime" />
      <MetricCard label="Completed collections" value={metrics?.completedCollections ?? 0} note="Verified demo records" icon={CheckCheck} tone="blue" />
      <MetricCard label="Network bins" value={metrics?.totalBins ?? 0} note="Across demonstration regions" icon={Signal} />
      <MetricCard label="Average bin fill" value={`${metrics?.averageFillPercent ?? 0}%`} note="Current network snapshot" icon={Activity} tone="amber" />
    </div>
    <div className="overview-grid overview-grid-even">
      <section className="panel"><div className="panel-header"><div><h2>Monthly recovery trend</h2><p>Kilograms recorded by collection month</p></div><Leaf size={17} className="subtle-icon" /></div>
        <div className="chart-area chart-area-tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={(analytics?.monthlyCollections ?? []).map((item) => ({ ...item, month: new Date(`${item.month}-01T00:00:00`).toLocaleDateString('en', { month: 'short' }) }))}><CartesianGrid stroke="#edf0ed" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8a938e', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8a938e', fontSize: 11 }} /><Tooltip formatter={(value) => [`${value} kg`, 'Recovered']} /><Bar dataKey="quantityKg" fill="#6c9e69" radius={[5, 5, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer></div>
      </section>
      <section className="panel"><div className="panel-header"><div><h2>Material recovered</h2><p>Breakdown by plastic category</p></div><Recycle size={17} className="subtle-icon" /></div>
        <div className="overview-list">{categoryRows.map((item) => <div className="overview-list-row" key={item.category}><span className="material-mark material-pet">{item.category.slice(0, 2)}</span><div className="overview-row-copy"><strong>{item.category}</strong><small>Recovered plastic</small></div><strong className="overview-fill">{item.quantityKg.toFixed(1)} kg</strong></div>)}{!categoryRows.length && <div className="empty-state"><Recycle size={18} /><strong>No recovery records</strong><span>Category totals appear after collection activity.</span></div>}</div>
      </section>
    </div>
    <section className="panel regional-summary"><div className="panel-header"><div><h2>Regional snapshot</h2><p>Recovery recorded by demonstration region</p></div><span className="simulation-badge"><MapPin size={13} /> ILLUSTRATIVE DATA</span></div>
      {highestRegion && <div className="regional-highlight"><span className="overview-row-icon overview-icon-green"><Leaf size={16} /></span><div><small>LEADING REGION</small><strong>{highestRegion.region}</strong></div><b>{highestRegion.quantityKg.toFixed(1)} kg</b></div>}
      <div className="regional-data-list">{(analytics?.regionalPerformance ?? []).map((item) => <div className="regional-data-row" key={item.region}><span>{item.region}</span><div className="regional-meter"><i style={{ width: `${highestRegion ? Math.max(4, item.quantityKg / highestRegion.quantityKg * 100) : 0}%` }} /></div><strong>{item.quantityKg.toFixed(1)} kg</strong></div>)}{!analytics?.regionalPerformance.length && <p className="muted-copy">Regional totals will appear after a collection is recorded.</p>}</div>
    </section>
  </>
}

export function BinsPage() {
  const { user } = useAuth()
  const [refresh, setRefresh] = useState(0)
  const { data, error, loading, reload } = useResource<{ bins: Bin[] }>('/bins', refresh)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Bin | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [registerValues, setRegisterValues] = useState({
    code: '', name: '', locationName: '', region: '', address: '',
    latitude: '5.5601', longitude: '-0.2057', category: 'PET',
    capacityKg: '120', deviceIdentifier: '',
  })
  const isAdmin = user?.role === 'ADMINISTRATOR'
  const bins = (data?.bins ?? []).filter((bin) => {
    const matchesSearch = `${bin.code} ${bin.name} ${bin.location.name}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (statusFilter === 'ALL' || bin.status === statusFilter || (statusFilter === 'OFFLINE' && bin.device?.status === 'OFFLINE'))
  })

  async function simulate(bin: Bin, action: string, value?: number) {
    setBusy(bin.id)
    setMessage('')
    try {
      await api(`/bins/${bin.id}/simulation`, { method: 'POST', body: JSON.stringify(action === 'set' ? { action, fillPercent: value } : action === 'increase' || action === 'decrease' ? { action, amount: 10 } : { action }) })
      setMessage(`${bin.code} updated. The simulated sensor event is recorded.`)
      setRefresh((current) => current + 1)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Simulation could not be updated.')
    } finally {
      setBusy('')
    }
  }

  async function registerBin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRegistering(true)
    setMessage('')
    try {
      await api('/bins', {
        method: 'POST',
        body: JSON.stringify({
          ...registerValues,
          latitude: Number(registerValues.latitude),
          longitude: Number(registerValues.longitude),
          capacityKg: Number(registerValues.capacityKg),
        }),
      })
      setRegisterOpen(false)
      setRegisterValues({
        code: '', name: '', locationName: '', region: '', address: '',
        latitude: '5.5601', longitude: '-0.2057', category: 'PET',
        capacityKg: '120', deviceIdentifier: '',
      })
      setMessage('Smart bin registered in the demonstration network.')
      setRefresh((current) => current + 1)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Smart bin could not be registered.')
    } finally {
      setRegistering(false)
    }
  }

  const counts = useMemo(() => ({
    all: data?.bins.length ?? 0,
    attention: data?.bins.filter((bin) => bin.fillPercent >= 80).length ?? 0,
    offline: data?.bins.filter((bin) => bin.device?.status === 'OFFLINE').length ?? 0,
  }), [data])

  return <div className="page-stack">
    <PageTitle eyebrow="ASSET MANAGEMENT" title="Smart bins" description="Monitor fill levels, connectivity, and collection readiness across the demo network." action={isAdmin ? <button className="button button-primary button-compact" onClick={() => setRegisterOpen(true)}><Plus size={16} /> Register a bin</button> : undefined} />
    <div className="bin-summary-row"><span><b>{counts.all}</b> registered bins</span><span><i className="summary-dot summary-alert" /> <b>{counts.attention}</b> need collection</span><span><i className="summary-dot summary-offline" /> <b>{counts.offline}</b> offline</span><span className="demo-caption"><Radio size={14} /> Simulated network</span></div>
    <section className="panel">
      <div className="table-toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by bin, site or code…" /></div><div className="toolbar-right"><Filter size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter bins by status"><option value="ALL">All statuses</option><option value="NEARLY_FULL">Needs collection</option><option value="FILLING_UP">Filling up</option><option value="PARTIAL">Partially filled</option><option value="LOW">Low</option><option value="OFFLINE">Offline devices</option></select><button className="icon-button" onClick={() => void reload()} title="Refresh bins"><RefreshCw size={16} /></button></div></div>
      {message && <div className="inline-message" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss">×</button></div>}
      {error && <ErrorState error={error} retry={() => void reload()} />}
      {loading && !data ? <LoadingState /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>BIN / DEVICE</th><th>LOCATION</th><th>CATEGORY</th><th>FILL LEVEL</th><th>STATUS</th><th>LAST UPDATE</th><th /></tr></thead><tbody>
        {bins.map((bin) => <tr key={bin.id}>
          <td><button className="table-primary-link" onClick={() => setSelected(bin)}>{bin.code}</button><small className="table-subtext">{bin.name}</small></td>
          <td>{bin.location.name}<small className="table-subtext">{bin.location.region} region</small></td>
          <td><span className="category-chip">{bin.category}</span></td>
          <td><div className="fill-cell"><div className="fill-track"><span className={bin.fillPercent >= 80 ? 'fill-high' : bin.fillPercent >= 60 ? 'fill-mid' : ''} style={{ width: `${bin.fillPercent}%` }} /></div><strong>{bin.fillPercent}%</strong></div></td>
          <td><span className={statusClass(bin.device?.status === 'OFFLINE' ? 'OFFLINE' : bin.status)}>{prettify(bin.device?.status === 'OFFLINE' ? 'OFFLINE' : bin.status)}</span></td>
          <td>{bin.device ? formatDate(bin.device.lastCommunication) : 'No device'}</td>
          <td><button className="icon-button row-more" onClick={() => setSelected(bin)} aria-label={`View ${bin.code}`}><MoreHorizontal size={17} /></button></td>
        </tr>)}
        {!bins.length && <tr><td className="table-empty" colSpan={7}>No bins match this search and filter.</td></tr>}
      </tbody></table></div>}
    </section>
    <section className="panel map-panel"><div className="panel-header"><div><h2>Demonstration locations</h2><p>Illustrative sites only — not live operational locations</p></div><span className="map-legend"><i className="summary-dot summary-alert" /> Needs collection <i className="summary-dot summary-online" /> Online</span></div><div className="demo-map">
      {bins.slice(0, 6).map((bin, index) => <button key={bin.id} className={`demo-map-marker map-marker-${index + 1} ${bin.fillPercent >= 80 ? 'map-marker-alert' : ''}`} onClick={() => setSelected(bin)} title={`${bin.code}: ${bin.fillPercent}%`}>
        <MapPin size={19} fill="currentColor" /><span>{bin.code}</span>
      </button>)}
      <div className="map-location-label label-central">Central demo area</div><div className="map-location-label label-north">North demo area</div><div className="map-location-label label-coastal">Coastal demo area</div><div className="map-disclaimer">Illustrative map · Demonstration coordinates</div>
    </div></section>
    {isAdmin && <section className="panel simulator-panel"><div className="panel-header"><div><h2>IoT simulation controls</h2><p>Adjust a selected demo sensor. Readings are labelled simulated and stored in telemetry history.</p></div><span className="simulation-badge"><Radio size={14} /> SIMULATION MODE</span></div>
      <div className="simulator-bin-grid">{(data?.bins ?? []).map((bin) => <div className="simulator-bin" key={bin.id}><div><strong>{bin.code}</strong><small>{bin.fillPercent}% · {bin.device?.status ?? 'No device'}</small></div><div className="simulator-actions"><button title="Decrease by 10%" disabled={busy === bin.id} onClick={() => void simulate(bin, 'decrease')}><ArrowDownRight size={15} /></button><button title="Increase by 10%" disabled={busy === bin.id} onClick={() => void simulate(bin, 'increase')}><ArrowUpRight size={15} /></button><button title="Set to 100%" disabled={busy === bin.id} onClick={() => void simulate(bin, 'set', 100)}>100%</button><button title={bin.device?.status === 'OFFLINE' ? 'Restore connectivity' : 'Simulate offline'} disabled={busy === bin.id} onClick={() => void simulate(bin, bin.device?.status === 'OFFLINE' ? 'online' : 'offline')}>{bin.device?.status === 'OFFLINE' ? <Signal size={15} /> : <WifiOff size={15} />}</button></div></div>)}</div>
    </section>}
    {selected && <BinDetails bin={selected} close={() => setSelected(null)} />}
    {registerOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRegisterOpen(false) }}><section className="detail-modal register-modal" role="dialog" aria-modal="true" aria-label="Register a smart bin">
      <div className="modal-heading"><div><span className="section-kicker">ASSET MANAGEMENT</span><h2>Register a smart bin</h2></div><button className="icon-button" onClick={() => setRegisterOpen(false)} aria-label="Close form">×</button></div>
      <p className="muted-copy">New records are labelled as demonstration locations with simulated telemetry.</p>
      <form className="register-form" onSubmit={(event) => void registerBin(event)}>
        <label>Bin code<input required minLength={2} maxLength={32} value={registerValues.code} onChange={(event) => setRegisterValues({ ...registerValues, code: event.target.value })} placeholder="PT-007" /></label>
        <label>Bin name<input required value={registerValues.name} onChange={(event) => setRegisterValues({ ...registerValues, name: event.target.value })} placeholder="Central PET Station" /></label>
        <label>Plastic category<select value={registerValues.category} onChange={(event) => setRegisterValues({ ...registerValues, category: event.target.value })}><option value="PET">PET bottles</option><option value="HDPE">HDPE plastics</option><option value="LDPE">LDPE plastics</option><option value="PP">PP plastics</option><option value="MIXED">Mixed plastics</option></select></label>
        <label>Maximum capacity (kg)<input required type="number" min="1" step="1" value={registerValues.capacityKg} onChange={(event) => setRegisterValues({ ...registerValues, capacityKg: event.target.value })} /></label>
        <label>Demonstration site<input required value={registerValues.locationName} onChange={(event) => setRegisterValues({ ...registerValues, locationName: event.target.value })} placeholder="Central District Demo Site" /></label>
        <label>Region<input required value={registerValues.region} onChange={(event) => setRegisterValues({ ...registerValues, region: event.target.value })} placeholder="Central" /></label>
        <label>Site description<input required value={registerValues.address} onChange={(event) => setRegisterValues({ ...registerValues, address: event.target.value })} placeholder="Demonstration location — Central" /></label>
        <label>Device identifier<input required minLength={3} value={registerValues.deviceIdentifier} onChange={(event) => setRegisterValues({ ...registerValues, deviceIdentifier: event.target.value })} placeholder="PT-DEMO-007" /></label>
        <div className="register-form-actions"><button type="button" className="button button-outline" onClick={() => setRegisterOpen(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={registering}>{registering ? 'Registering…' : 'Register bin'}</button></div>
      </form>
    </section></div>}
  </div>
}

function BinDetails({ bin, close }: { bin: Bin; close: () => void }) {
  const { data, loading } = useResource<{ bin: Bin & { readings?: { id: string; fillPercent: number; source: string; recordedAt: string }[]; tasks?: CollectionTask[] } }>(`/bins/${bin.id}`)
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="detail-modal" role="dialog" aria-modal="true" aria-label={`${bin.code} details`}>
    <div className="modal-heading"><div><span className="section-kicker">SMART BIN DETAIL</span><h2>{bin.code} <span className={statusClass(bin.status)}>{prettify(bin.status)}</span></h2></div><button className="icon-button" onClick={close} aria-label="Close details">×</button></div>
    <p className="muted-copy">{bin.name} · {bin.location.address}</p><div className="detail-metrics"><div><span>Fill level</span><strong>{bin.fillPercent}%</strong></div><div><span>Material</span><strong>{bin.category}</strong></div><div><span>Connectivity</span><strong>{prettify(bin.device?.status ?? 'Unknown')}</strong></div></div>
    <div className="detail-section"><h3>Recent sensor readings</h3>{loading ? <LoadingState /> : <div className="reading-list">{(data?.bin.readings ?? []).slice(0, 6).map((reading) => <div key={reading.id}><span>{formatDate(reading.recordedAt)}</span><strong>{reading.fillPercent}%</strong><em>{reading.source === 'SIMULATED' ? 'Simulated' : reading.source === 'DEVICE' ? 'Device' : 'Collection reset'}</em></div>)}</div>}</div>
    <div className="detail-section"><h3>Recent collection activity</h3>{(data?.bin.tasks ?? []).slice(0, 3).map((task) => <div className="reading-list" key={task.id}><span>{formatDate(task.createdAt)}</span><strong>{prettify(task.status)}</strong></div>)}</div>
  </section></div>
}

export function CollectionsPage() {
  const { user } = useAuth()
  const { data, error, loading, reload } = useResource<{ tasks: CollectionTask[] }>('/collections')
  const { data: collectorData } = useResource<{ collectors: { id: string; name: string }[] }>('/collectors', 0, user?.role === 'ADMINISTRATOR' || user?.role === 'COLLECTION_PARTNER')
  const [assignment, setAssignment] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const role = user?.role
  const canAssign = role === 'ADMINISTRATOR' || role === 'COLLECTION_PARTNER'
  const tasks = data?.tasks ?? []

  async function assign(task: CollectionTask) {
    const collectorId = assignment[task.id]
    if (!collectorId) { setMessage('Select a collector before assigning this task.'); return }
    setBusyId(task.id)
    try {
      await api(`/collections/${task.id}/assign`, { method: 'POST', body: JSON.stringify({ collectorId }) })
      setMessage(`${task.bin.code} assigned to the selected collector.`)
      await reload()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Assignment failed.')
    } finally { setBusyId('') }
  }

  async function advance(task: CollectionTask, nextStatus: string) {
    setBusyId(task.id)
    setMessage('')
    try {
      const body = nextStatus === 'COMPLETED'
        ? { status: nextStatus, quantityKg: Number(quantity[task.id]) }
        : { status: nextStatus }
      await api(`/collections/${task.id}/status`, { method: 'PATCH', body: JSON.stringify(body) })
      setMessage(nextStatus === 'COMPLETED' ? `${task.bin.code} completed. The bin was reset and inventory created.` : `Collection status updated to ${prettify(nextStatus)}.`)
      await reload()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Status could not be updated.')
    } finally { setBusyId('') }
  }

  return <div className="page-stack">
    <PageTitle eyebrow="FIELD OPERATIONS" title="Collection operations" description="Assign collection work and follow tasks from recommendation through verified completion." action={<span className="simulation-badge"><Truck size={14} /> COLLECTION LIFECYCLE</span>} />
    <div className="collection-callout"><span className="callout-icon"><CircleAlert size={18} /></span><div><strong>Collection recommendations are created at 80% fill.</strong><p>A bin’s fill level resets only after an authorized task is completed with a collected quantity.</p></div></div>
    {message && <div className="inline-message" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss">×</button></div>}
    {error && <ErrorState error={error} retry={() => void reload()} />}
    {loading && !data ? <LoadingState /> : <section className="collection-list">
      {tasks.map((task) => {
        const isClosed = task.status === 'COMPLETED' || task.status === 'CANCELLED'
        const nextStep: Record<string, string> = { PENDING: 'ACCEPTED', ACCEPTED: 'EN_ROUTE', EN_ROUTE: 'ARRIVED', ARRIVED: 'COLLECTING', COLLECTING: 'COMPLETED' }
        const next = nextStep[task.status]
        const assignedToCurrentUser = role !== 'WASTE_COLLECTOR' || (user?.id && task.collector?.userId === user.id)
        return <article className="collection-card" key={task.id}>
          <div className={`collection-card-icon ${task.bin.fillPercent >= 80 ? 'collection-alert' : ''}`}><Truck size={20} /></div>
          <div className="collection-main"><div className="collection-title-line"><h2>{task.bin.code}</h2><span className={statusClass(task.status)}>{prettify(task.status)}</span></div><p>{task.bin.name} · {task.bin.location.name}</p><div className="collection-meta"><span><MapPin size={14} /> {task.bin.location.region}</span><span><Radio size={14} /> {task.bin.fillPercent}% fill</span><span><Clock3 size={14} /> Created {formatDate(task.createdAt)}</span></div></div>
          <div className="collection-assignment">{task.collector ? <><small>ASSIGNED COLLECTOR</small><strong>{task.collector.name}</strong></> : canAssign && !isClosed ? <><small>ASSIGN A COLLECTOR</small><div className="assign-controls"><select aria-label={`Select collector for ${task.bin.code}`} value={assignment[task.id] ?? ''} onChange={(event) => setAssignment({ ...assignment, [task.id]: event.target.value })}><option value="">Select team member</option>{(collectorData?.collectors ?? []).map((collector) => <option key={collector.id} value={collector.id}>{collector.name}</option>)}</select><button className="button button-outline button-tiny" disabled={busyId === task.id} onClick={() => void assign(task)}>Assign</button></div></> : <><small>COLLECTION PARTNER</small><strong>{task.partner.name}</strong></>}</div>
          <div className="collection-actions">{task.status === 'COLLECTING' && role === 'WASTE_COLLECTOR' && <input aria-label={`Collected quantity for ${task.bin.code}`} className="quantity-input" type="number" min="0.1" step="0.1" placeholder="kg" value={quantity[task.id] ?? ''} onChange={(event) => setQuantity({ ...quantity, [task.id]: event.target.value })} />}{next && !isClosed && assignedToCurrentUser && <button className={`button ${next === 'COMPLETED' ? 'button-primary' : 'button-dark'} button-tiny`} disabled={busyId === task.id || (next === 'COMPLETED' && (!quantity[task.id] || Number(quantity[task.id]) <= 0))} onClick={() => void advance(task, next)}>{next === 'COMPLETED' ? 'Complete task' : prettify(next)} <ArrowRight size={14} /></button>}{isClosed && <span className="completed-mark"><CheckCheck size={16} /> Complete</span>}</div>
        </article>
      })}
      {!tasks.length && <div className="panel empty-state"><ClipboardIconLarge /><strong>No collection tasks yet</strong><span>A bin reaching 80% fill will create a recommendation automatically.</span><Link to="/app/bins" className="text-link">View smart bins <ArrowRight size={15} /></Link></div>}
    </section>}
  </div>
}

function ClipboardIconLarge() { return <PackageCheck size={24} /> }

type Inventory = { id: string; category: string; quantityKg: number; availableKg: number; collectedAt: string; bin: Bin }
type RecyclingRequest = { id: string; quantityKg: number; status: string; createdAt: string; inventory: Inventory; company: { name: string } }

export function MarketplacePage() {
  const { user } = useAuth()
  const [refresh, setRefresh] = useState(0)
  const { data, error, loading, reload } = useResource<{ inventory: Inventory[] }>('/marketplace/inventory', refresh)
  const { data: requestsData, reload: reloadRequests } = useResource<{ requests: RecyclingRequest[] }>('/marketplace/requests', refresh)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const isCompany = user?.role === 'RECYCLING_COMPANY'
  const isAdmin = user?.role === 'ADMINISTRATOR'
  const inventory = data?.inventory ?? []

  async function requestInventory(item: Inventory) {
    const amount = Number(quantities[item.id])
    if (!amount || amount <= 0) { setMessage('Enter a quantity greater than zero.'); return }
    setBusy(item.id)
    try {
      await api('/marketplace/requests', { method: 'POST', body: JSON.stringify({ inventoryId: item.id, quantityKg: amount }) })
      setMessage(`Request for ${amount} kg submitted. Available inventory has been reserved.`)
      setRefresh((value) => value + 1)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Request could not be submitted.')
    } finally { setBusy('') }
  }

  async function updateRequest(request: RecyclingRequest, status: string) {
    setBusy(request.id)
    try {
      await api(`/marketplace/requests/${request.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setMessage(`Request status updated to ${prettify(status)}.`)
      await reloadRequests()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Request status could not be updated.')
    } finally { setBusy('') }
  }

  return <div className="page-stack">
    <PageTitle eyebrow="MATERIAL RECOVERY" title="Recycling marketplace" description="Connect available recovered plastic with recycling demand and keep each request traceable." action={<span className="inventory-total"><PackageCheck size={17} /> {inventory.reduce((total, item) => total + item.availableKg, 0).toFixed(1)} kg available</span>} />
    {message && <div className="inline-message" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss">×</button></div>}
    {error && <ErrorState error={error} retry={() => void reload()} />}
    <section><div className="section-row-title"><div><h2>Available recovered plastic</h2><p>Collected material that can be requested for recycling</p></div><button className="icon-button" onClick={() => setRefresh((value) => value + 1)} title="Refresh inventory"><RefreshCw size={16} /></button></div>
      {loading && !data ? <LoadingState /> : <div className="inventory-grid">{inventory.map((item) => <article className="inventory-card" key={item.id}><div className="inventory-card-top"><span className={`material-mark material-${item.category.toLowerCase()}`}>{item.category.slice(0, 2)}</span><span className="available-tag">Available</span></div><span className="section-kicker">{item.category} PLASTIC</span><h3>{item.bin.name}</h3><div className="inventory-quantity">{item.availableKg.toFixed(1)} <small>kg</small></div><div className="inventory-location"><MapPin size={14} /> {item.bin.location.name}, {item.bin.location.region}</div><div className="inventory-card-footer"><span>Collected {new Date(item.collectedAt).toLocaleDateString()}</span>{isCompany && <div className="request-control"><input aria-label={`Request quantity for ${item.bin.code}`} type="number" min="0.1" max={item.availableKg} step="0.1" value={quantities[item.id] ?? ''} placeholder="kg" onChange={(event) => setQuantities({ ...quantities, [item.id]: event.target.value })} /><button className="button button-primary button-tiny" disabled={busy === item.id} onClick={() => void requestInventory(item)}>Request</button></div>}</div></article>)}{!inventory.length && <div className="panel empty-state"><PackageCheck size={24} /><strong>No available inventory yet</strong><span>Completed collection quantities are added automatically to this marketplace.</span></div>}</div>}
    </section>
    <section className="panel">
      <div className="panel-header"><div><h2>Recycling requests</h2><p>{isCompany ? 'Track your purchase and delivery requests.' : 'Review and progress requests from recycling partners.'}</p></div><span className="request-count">{requestsData?.requests.length ?? 0} requests</span></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>REQUEST</th><th>COMPANY</th><th>MATERIAL</th><th>QUANTITY</th><th>STATUS</th><th>SUBMITTED</th>{isAdmin && <th>ACTION</th>}</tr></thead><tbody>
        {(requestsData?.requests ?? []).map((request) => <tr key={request.id}><td><strong>#{request.id.slice(-6).toUpperCase()}</strong></td><td>{request.company.name}</td><td><span className="category-chip">{request.inventory.category}</span></td><td>{request.quantityKg} kg</td><td><span className={statusClass(request.status)}>{prettify(request.status)}</span></td><td>{formatDate(request.createdAt)}</td>{isAdmin && <td><select className="status-select" value={request.status} disabled={busy === request.id} onChange={(event) => void updateRequest(request, event.target.value)} aria-label={`Update status for request ${request.id}`}><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="PROCESSING">Processing</option><option value="DISPATCHED">Dispatched</option><option value="DELIVERED">Delivered</option></select></td>}</tr>)}
        {!requestsData?.requests.length && <tr><td colSpan={isAdmin ? 7 : 6} className="table-empty">Submitted recycling requests will be listed here.</td></tr>}
      </tbody></table></div>
    </section>
  </div>
}

type Analytics = {
  metrics: { totalCollectedKg: number; completedCollections: number; totalBins: number; averageFillPercent: number }
  binsByStatus: { status: string; count: number }[]
  categoryDistribution: { category: string; quantityKg: number }[]
  regionalPerformance: { region: string; quantityKg: number }[]
  monthlyCollections: { month: string; quantityKg: number }[]
  recyclingRequests: { status: string; count: number; quantityKg: number }[]
}

export function AnalyticsPage() {
  const { data, error, loading, reload } = useResource<Analytics>('/analytics')
  const [exporting, setExporting] = useState(false)
  async function exportCsv() {
    setExporting(true)
    try {
      const token = localStorage.getItem('plastitrack-token')
      let blob: Blob
      if (isLocalDemoToken(token)) {
        blob = new Blob([createDemoCollectionsCsv()], { type: 'text/csv' })
      } else {
        const response = await fetch('/api/v1/reports/collections.csv', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (!response.ok) throw new Error('Report export failed. Check your permissions and try again.')
        blob = await response.blob()
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'plastitrack-collections.csv'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : 'Report export failed.')
    } finally { setExporting(false) }
  }
  const monthData = data?.monthlyCollections.map((item) => ({ ...item, month: new Date(`${item.month}-01T00:00:00`).toLocaleDateString('en', { month: 'short' }) })) ?? []
  return <div className="page-stack">
    <PageTitle eyebrow="ENVIRONMENTAL INTELLIGENCE" title="Impact & analytics" description="Understand recovered materials, site performance, and collection progress across the demo network." action={<div className="export-actions"><button className="button button-outline button-compact" onClick={() => window.print()}><Download size={15} /> Print / save PDF</button><button className="button button-dark button-compact" onClick={() => void exportCsv()} disabled={exporting}><Download size={15} /> {exporting ? 'Preparing…' : 'Export CSV'}</button></div>} />
    {error && <ErrorState error={error} retry={() => void reload()} />}
    {loading && !data ? <LoadingState /> : <>
      <div className="metrics-grid analytics-metrics"><MetricCard label="Plastic collected" value={`${(data?.metrics.totalCollectedKg ?? 0).toLocaleString()} kg`} note="Verified completed collections" icon={PackageCheck} /><MetricCard label="Completed collections" value={data?.metrics.completedCollections ?? 0} note="Recorded collection tasks" icon={CheckCheck} tone="blue" /><MetricCard label="Active bin network" value={data?.metrics.totalBins ?? 0} note="Registered demo devices" icon={Signal} tone="lime" /><MetricCard label="Average fill level" value={`${data?.metrics.averageFillPercent ?? 0}%`} note="Current network average" icon={Activity} tone="amber" /></div>
      <div className="dashboard-grid">
        <section className="panel analytics-chart-panel"><div className="panel-header"><div><h2>Monthly recovery trend</h2><p>Verified kilograms by collection month</p></div><span className="chart-label"><i className="legend-dot" /> Kilograms recovered</span></div><div className="chart-area chart-area-tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthData}><CartesianGrid stroke="#edf0ed" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8a938e', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8a938e', fontSize: 11 }} /><Tooltip formatter={(value) => [`${value} kg`, 'Recovered']} /><Bar dataKey="quantityKg" fill="#347951" radius={[5, 5, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer></div></section>
        <section className="panel analytics-chart-panel"><div className="panel-header"><div><h2>Material mix</h2><p>Recovered by plastic category</p></div><Filter size={16} className="subtle-icon" /></div><div className="category-chart"><ResponsiveContainer width="54%" height={190}><PieChart><Pie data={data?.categoryDistribution ?? []} dataKey="quantityKg" nameKey="category" innerRadius={56} outerRadius={78} paddingAngle={4}><Cell fill="#2f7450" /><Cell fill="#8bbf4c" /><Cell fill="#dfb75a" /><Cell fill="#547d9e" /><Cell fill="#b5c5b7" /></Pie><Tooltip formatter={(value) => [`${value} kg`, 'Recovered']} /></PieChart></ResponsiveContainer><div className="category-legend">{(data?.categoryDistribution ?? []).map((item, index) => <div key={item.category}><i style={{ backgroundColor: ['#2f7450', '#8bbf4c', '#dfb75a', '#547d9e', '#b5c5b7'][index % 5] }} /><span>{item.category}</span><strong>{Math.round(item.quantityKg)} kg</strong></div>)}{!data?.categoryDistribution.length && <small>No recovered material recorded yet.</small>}</div></div></section>
      </div>
      <div className="dashboard-grid">
        <section className="panel analytics-chart-panel"><div className="panel-header"><div><h2>Regional collection performance</h2><p>Recovered kilograms grouped by demonstration region</p></div></div><div className="region-chart"><ResponsiveContainer width="100%" height={230}><BarChart data={data?.regionalPerformance ?? []} layout="vertical" margin={{ left: 15, right: 25 }}><CartesianGrid stroke="#edf0ed" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8a938e', fontSize: 11 }} /><YAxis type="category" dataKey="region" axisLine={false} tickLine={false} tick={{ fill: '#68736c', fontSize: 12 }} width={80} /><Tooltip formatter={(value) => [`${value} kg`, 'Recovered']} /><Bar dataKey="quantityKg" fill="#77a953" radius={[0, 5, 5, 0]} maxBarSize={26} /></BarChart></ResponsiveContainer></div></section>
        <section className="panel status-breakdown"><div className="panel-header"><div><h2>Bin status mix</h2><p>Current capacity states</p></div></div>{(data?.binsByStatus ?? []).map((item) => <div className="status-breakdown-row" key={item.status}><span className={`status-color status-color-${item.status.toLowerCase().replaceAll('_', '-')}`} /><span>{prettify(item.status)}</span><strong>{item.count}</strong></div>)}{!data?.binsByStatus.length && <div className="empty-state">No bins available.</div>}</section>
      </div>
      <p className="analytics-disclaimer"><ShieldAlert size={15} /> Demonstration data only. Regional names and coordinates are illustrative and do not represent verified operational impact.</p>
    </>}
  </div>
}

type NotificationItem = { id: string; title: string; message: string; href: string | null; readAt: string | null; createdAt: string }

export function NotificationsPage() {
  const { data, error, loading, reload } = useResource<{ notifications: NotificationItem[] }>('/notifications')
  const [busy, setBusy] = useState('')
  async function markRead(item: NotificationItem) {
    if (item.readAt) return
    setBusy(item.id)
    try {
      await api(`/notifications/${item.id}/read`, { method: 'PATCH' })
      await reload()
    } finally { setBusy('') }
  }
  const items = data?.notifications ?? []
  return <div className="page-stack">
    <PageTitle eyebrow="ACTIVITY CENTRE" title="Notifications" description="Follow alerts and operational events connected to your role." action={<span className="request-count">{items.filter((item) => !item.readAt).length} unread</span>} />
    {error && <ErrorState error={error} retry={() => void reload()} />}
    {loading && !data ? <LoadingState /> : <section className="panel notification-list">{items.map((item) => <article className={`notification-item ${!item.readAt ? 'notification-unread' : ''}`} key={item.id}><span className="notification-icon"><Bell size={17} /></span><div className="notification-copy"><strong>{item.title}</strong><p>{item.message}</p><time>{formatDate(item.createdAt)}</time></div><div className="notification-actions">{!item.readAt && <button className="text-button" disabled={busy === item.id} onClick={() => void markRead(item)}><Check size={15} /> Mark read</button>}{item.href && <Link to={item.href} className="icon-button" aria-label="Open related page"><ArrowRight size={16} /></Link>}</div></article>)}{!items.length && <div className="empty-state"><Bell size={24} /><strong>You’re all caught up</strong><span>New alerts will appear here when bin or collection activity needs attention.</span></div>}</section>}
  </div>
}

export function DemoGuidePage() {
  const { user } = useAuth()
  const [status, setStatus] = useState('')
  const roles: { role: Role; email: string; path: string; description: string }[] = [
    { role: 'ADMINISTRATOR', email: 'admin@plastitrack.demo', path: '/app/bins', description: 'Simulate a fill-level change and watch a collection recommendation appear.' },
    { role: 'COLLECTION_PARTNER', email: 'partner@plastitrack.demo', path: '/app/collections', description: 'Review bins requiring collection and assign a collector to a task.' },
    { role: 'WASTE_COLLECTOR', email: 'collector@plastitrack.demo', path: '/app/collections', description: 'Advance an assigned task and record the collected quantity.' },
    { role: 'RECYCLING_COMPANY', email: 'recycler@plastitrack.demo', path: '/app/marketplace', description: 'Browse recovered material and submit a recycling request.' },
    { role: 'LOCATION_MANAGER', email: 'manager@plastitrack.demo', path: '/app/bins', description: 'Monitor premises bins and current device status.' },
    { role: 'ENVIRONMENTAL_OFFICER', email: 'officer@plastitrack.demo', path: '/app/analytics', description: 'Review recovery trends, material distribution, and regional performance.' },
  ]
  async function resetDemo() {
    const confirmed = window.confirm('Reset all PlastiTrack demonstration data to its original state? This clears demo workflow changes.')
    if (!confirmed) return
    setStatus('')
    try {
      await api('/demo/reset', { method: 'POST' })
      setStatus('Demonstration data has been reset. Reload the page to see the original scenario.')
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : 'Demo data could not be reset.')
    }
  }
  return <div className="page-stack">
    <PageTitle eyebrow="COMPETITION MODE" title="Guided demonstration" description="A complete walkthrough from a sensor threshold to collection, recycling, and impact reporting." action={user?.role === 'ADMINISTRATOR' ? <button className="button button-outline button-compact" onClick={() => void resetDemo()}><RefreshCw size={15} /> Reset demo data</button> : undefined} />
    <div className="demo-banner"><span className="simulation-badge"><Radio size={14} /> SIMULATION MODE</span><p>Every bin reading and location in this environment is demonstration data. No physical hardware is connected.</p></div>
    {status && <div className="inline-message" role="status">{status}</div>}
    <div className="scenario-grid">
      <article className="scenario-card"><span className="scenario-number">01</span><div className="scenario-icon"><Radio size={19} /></div><h2>Smart bin monitoring</h2><p>Raise a simulated device reading and watch the platform create an alert when a bin reaches collection threshold.</p><ol><li>Sign in as administrator</li><li>Open Smart bins and choose a sensor control</li><li>Set a bin to 100% and check notifications</li></ol><Link to="/app/bins" className="text-link">Open bin management <ArrowRight size={15} /></Link></article>
      <article className="scenario-card"><span className="scenario-number">02</span><div className="scenario-icon"><Truck size={19} /></div><h2>Waste collection</h2><p>Move an assigned task through the collection lifecycle. Completion records material and resets the bin.</p><ol><li>Sign in as collection partner and assign a collector</li><li>Sign in as that collector and advance each status</li><li>Enter the collected quantity to complete</li></ol><Link to="/app/collections" className="text-link">Open collection operations <ArrowRight size={15} /></Link></article>
      <article className="scenario-card"><span className="scenario-number">03</span><div className="scenario-icon"><PackageCheck size={19} /></div><h2>Recycling request</h2><p>Make recovered material visible to recycling companies and track requests as delivery progresses.</p><ol><li>Sign in as recycling company</li><li>Choose available inventory and request a quantity</li><li>Sign in as administrator to update its status</li></ol><Link to="/app/marketplace" className="text-link">Open marketplace <ArrowRight size={15} /></Link></article>
      <article className="scenario-card"><span className="scenario-number">04</span><div className="scenario-icon"><Activity size={19} /></div><h2>Environmental monitoring</h2><p>Review recovered material by month, category, and demonstration region; export a report.</p><ol><li>Sign in as environmental officer</li><li>Review the analytical dashboard</li><li>Export a CSV or print a PDF report</li></ol><Link to="/app/analytics" className="text-link">Open impact analytics <ArrowRight size={15} /></Link></article>
    </div>
    <section className="panel demo-accounts-panel"><div className="panel-header"><div><h2>Demo accounts</h2><p>Each account has access limited by its role.</p></div><span className="account-password">Password <code>PlastiTrack!2026</code></span></div><div className="demo-role-table">{roles.map((item) => <div className="demo-role-row" key={item.role}><span className="role-avatar">{roleLabel(item.role).slice(0, 1)}</span><div><strong>{roleLabel(item.role)}</strong><small>{item.description}</small></div><code>{item.email}</code><Link to="/login" className="icon-button" aria-label={`Sign in as ${roleLabel(item.role)}`}><ExternalLink size={16} /></Link></div>)}</div></section>
  </div>
}
