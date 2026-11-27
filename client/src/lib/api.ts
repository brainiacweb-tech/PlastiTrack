import { demoApi, isLocalDemoToken } from './demo'

export type Role =
  | 'ADMINISTRATOR'
  | 'COLLECTION_PARTNER'
  | 'WASTE_COLLECTOR'
  | 'RECYCLING_COMPANY'
  | 'LOCATION_MANAGER'
  | 'ENVIRONMENTAL_OFFICER'

export type User = {
  id: string
  name: string
  email: string
  role: Role
  region?: string | null
  collectionPartnerId?: string | null
  recyclingCompanyId?: string | null
}

export type Bin = {
  id: string
  code: string
  name: string
  category: string
  fillPercent: number
  capacityKg: number
  status: string
  updatedAt: string
  location: { name: string; region: string; address: string; latitude: number; longitude: number }
  device: { status: string; lastCommunication: string; isSimulated: boolean } | null
}

export type CollectionTask = {
  id: string
  status: string
  createdAt: string
  bin: Bin
  collector: { id: string; name: string; userId?: string | null } | null
  partner: { name: string }
}

const API_BASE = '/api/v1'

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('plastitrack-token')
  if (isLocalDemoToken(token)) return demoApi<T>(path, options)
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('PlastiTrack API is unavailable. Start it with `npm run dev:api` and check its console.')
  }
  const body = await response.text()
  let payload: { error?: string } & T
  try {
    payload = JSON.parse(body) as { error?: string } & T
  } catch {
    throw new Error(`PlastiTrack API returned HTTP ${response.status}. Check the server console and database setup.`)
  }
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status}).`)
  return payload
}

export function roleLabel(role: Role) {
  return {
    ADMINISTRATOR: 'Administrator',
    COLLECTION_PARTNER: 'Collection partner',
    WASTE_COLLECTOR: 'Waste collector',
    RECYCLING_COMPANY: 'Recycling company',
    LOCATION_MANAGER: 'Location manager',
    ENVIRONMENTAL_OFFICER: 'Environmental officer',
  }[role]
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
