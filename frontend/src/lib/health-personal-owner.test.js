// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// v1.4.3 (#544, #127): reading heart rate and weigh-ins back from Health Connect / Apple Health.
// The native plugin and the app's data directory are played in memory, the store by a plain
// object and an `apply` that runs the change on it (as useStore's update does).
const h = vi.hoisted(() => {
  vi.stubEnv('VITE_MOBILE', '1')
  vi.stubEnv('VITE_PERSONAL', '1')
  return { files: new Map(), calls: [], platform: 'android', granted: { heartRate: true, weight: true }, hr: [], weights: [], fail: null }
})

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    readFile: async ({ path }) => {
      if (!h.files.has(path)) throw new Error('File does not exist')
      return { data: h.files.get(path) }
    },
    writeFile: async ({ path, data }) => { h.files.set(path, data) },
  },
}))
vi.mock('@capacitor/app', () => ({ App: { addListener: () => ({ remove() {} }) } }))
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => h.platform },
  registerPlugin: () => ({
    status: async () => ({ status: 'available', granted: false, read: { ...h.granted } }),
    requestPermissions: async arg => {
      h.calls.push(['request', arg])
      return h.platform === 'ios' ? { granted: false } : { granted: false, read: { ...h.granted } }
    },
    readHeartRate: async arg => {
      h.calls.push(['readHeartRate', arg])
      if (h.fail) throw Object.assign(new Error('no'), { code: h.fail })
      return { samples: h.hr.filter(([t]) => t >= arg.from && t <= arg.to), origins: ['com.garmin.android.apps.connectmobile'] }
    },
    readWeights: async arg => {
      h.calls.push(['readWeights', arg])
      if (h.fail) throw Object.assign(new Error('no'), { code: h.fail })
      return { records: h.weights.filter(r => r.t >= arg.since) }
    },
    write: async () => { h.calls.push(['write']) },
    remove: async () => {},
    openSettings: async () => {},
    setEnabled: async () => {},
  }),
}))

const NOW = Date.UTC(2026, 9, 15, 20, 0, 0)
const s = sec => NOW - 3600e3 + sec * 1000
const dense = (from, to, bpm) => { const out = []; for (let x = from; x <= to; x++) out.push([s(x), bpm]); return out }
const workout = (id, endSec = 600, extra = {}) => ({ id, d: '2026-10-15', name: 'Push', start: s(0), end: s(endSec), entries: [{ id: '0025', target: { mode: 'reps' }, sets: [{ w: 60, r: 8, done: true, at: s(100) }] }], ...extra })
const reads = kind => h.calls.filter(c => c[0] === kind)
const file = () => JSON.parse(h.files.get('opengym-health.json') || 'null')

let hs, S, applied
const getState = () => S
const apply = fn => { applied++; const next = JSON.parse(JSON.stringify(S)); fn(next); S = next }
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  vi.resetModules()
  h.files.clear(); h.calls = []; h.platform = 'android'; h.granted = { heartRate: true, weight: true }; h.hr = []; h.weights = []; h.fail = null
  localStorage.clear(); localStorage.setItem('gym_owner','marcos')
  S = { unit: 'kg', workouts: [workout('w1')], bodyweight: [] }
  applied = 0
  hs = await import('./health-sync.js')
})

afterEach(() => { localStorage.clear(); vi.useRealTimers() })

describe('vínculo pessoal do Saúde',()=>{
  it('não permite que outra conta use o Apple Saúde já vinculado deste aparelho',async()=>{
    await hs.loadHealth()
    expect((await hs.enableRead('weight',getState,{apply})).ok).toBe(true)
    expect(JSON.parse(h.files.get('opengym-health-owner.json')).owner).toBe('marcos')
    localStorage.setItem('gym_owner','marih')
    expect((await hs.loadHealth()).readWeight).toBe(false)
    expect(await hs.enableRead('weight',getState,{apply})).toEqual({ok:false,reason:'owner'})
    expect(h.files.has('opengym-health-marih.json')).toBe(false)
  })
})
