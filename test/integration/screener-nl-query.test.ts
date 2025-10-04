import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startTestServer, TestHttpClient, type TestEnvironment } from '../utils/test-environment'
import { defaultTestConfig } from '../config/test-config'

interface ScreenerCompany {
  id?: number
  ticker: string
  name: string
  sector: string
  geo: string
  roic: number
  fcfYield: number
  leverage: number
  growthDurability?: number | null
  insiderOwnership?: number | null
  qualityScore?: number
  moat?: string | null
  accruals?: number | null
  selected: boolean | null
  matchReason: string | null
}

interface NLQueryResponse {
  companies: ScreenerCompany[]
  averageROIC: number
  averageFCFYield: number
  averageLeverage: number
  roicMin?: number
  fcfyMin?: number
  netCash?: boolean
  lowAccruals?: boolean
  neglect?: boolean
}

let env: TestEnvironment
let client: TestHttpClient

describe('Screener NL Query API', () => {
  beforeAll(async () => {
    const config = {
      ...defaultTestConfig,
      server: {
        ...defaultTestConfig.server,
        env: {
          ...defaultTestConfig.server.env,
          // Disable DB to force in-memory path in routes
          DATABASE_URL: '',
          POSTGRES_URL: '',
          // Force demo/smoke behavior
          AI_MODE: 'demo',
          SMOKE_MODE: 'true',
          NODE_ENV: 'test'
        }
      }
    }

    env = await startTestServer(config)
    client = new TestHttpClient(env.baseUrl)
  }, 30_000)

  afterAll(async () => {
    if (env) {
      await env.cleanup()
    }
  })

  it('responds to CORS preflight with required custom headers', async () => {
    const preflight = await fetch(`${env.baseUrl}/api/screener/nl-query`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, X-Session-Key, X-Actor-Id'
      }
    })

    expect(preflight.status).toBe(204)
    const allowHeaders = preflight.headers.get('access-control-allow-headers') || ''
    expect(allowHeaders).toContain('X-Session-Key')
    expect(allowHeaders).toContain('X-Actor-Id')
  })

  it('returns structured NL query results with companies and averages', async () => {
    const body = {
      query: 'ROIC above 15%, FCF yield at least 7%, leverage below 1'
    }

    const result = await client.postJson<NLQueryResponse>(`/api/screener/nl-query`, body, {
      Origin: 'http://localhost:5173',
      'X-Session-Key': 'test-session',
      'X-Actor-Id': 'test-actor'
    })

    expect(result).toBeTruthy()
    expect(Array.isArray(result.companies)).toBe(true)
    expect(result.companies.length).toBeGreaterThan(0)

    // Averages present and numeric
    expect(typeof result.averageROIC).toBe('number')
    expect(typeof result.averageFCFYield).toBe('number')
    expect(typeof result.averageLeverage).toBe('number')

    // Company shape sanity checks
    const c = result.companies[0]
    expect(c).toHaveProperty('ticker')
    expect(c).toHaveProperty('name')
    expect(c).toHaveProperty('sector')
    expect(c).toHaveProperty('geo')
    expect(c).toHaveProperty('roic')
    expect(c).toHaveProperty('fcfYield')
    expect(c).toHaveProperty('leverage')
    expect(typeof c.selected === 'boolean' || c.selected === null).toBe(true)
  })
})
