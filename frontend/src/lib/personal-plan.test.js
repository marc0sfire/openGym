import { describe, it, expect } from 'vitest'
import { dailyPlan, alternatives, DEFAULT_PERSONAL, MOVES } from './personal-plan.js'
import { EXIDX } from './exercises.js'
const monday = '2026-11-02'
const state = personal => ({ personal: {...DEFAULT_PERSONAL,...personal}, workouts:[] })
describe('rotina pessoal', () => {
  it('exige confirmar o inventário e não supõe máquinas', () => {
    expect(dailyPlan(state({mode:'gym'}), monday).ex).toEqual([])
    const p = dailyPlan(state({mode:'gym', inventory:['dumbbell'],inventoryConfirmed:true}), monday)
    for (const e of p.ex) expect(MOVES.find(m=>m[0]===e.id)[2].every(k=>k==='dumbbell')).toBe(true)
    expect(alternatives({...DEFAULT_PERSONAL,mode:'gym',inventory:['dumbbell'],inventoryConfirmed:true},'0293')).not.toContain('0861')
  })
  it('usa somente peso corporal sem acessórios em casa', () => {
    for (const day of ['2026-11-02','2026-11-03','2026-11-04']) for (const e of dailyPlan(state({}),day).ex) expect(EXIDX[e.id].eq).toBe('body weight')
  })
  it('troca força por recuperação após treino, mesmo fora da rotina sugerida', () => {
    const S = state({ days:[0,1,2,3,4,5,6] })
    S.workouts=[{d:'2026-11-01',name:'Treino livre', entries:[{sets:[{done:true}]}]}]
    expect(dailyPlan(S,monday).rest).toBe(true)
    expect(dailyPlan(S,'2026-11-03').rest).toBe(false)
  })
  it('alterna grupos musculares e mantém dias leves', () => {
    expect(dailyPlan(state({}),monday).group).toBe('upper')
    expect(dailyPlan(state({}),'2026-11-04').group).toBe('lower')
    expect(dailyPlan(state({}),'2026-11-03').rest).toBe(true)
  })
  it('alterna pelo treino concluído mesmo com dias de força consecutivos selecionados', () => {
    const S = state({days:[0,1,2,3,4,5,6]})
    S.workouts=[{d:'2026-10-30',name:'Casa · Superiores e abdômen',entries:[{sets:[{done:true}]}]}]
    expect(dailyPlan(S,monday).group).toBe('lower')
    S.workouts[0].name='Prédio · Pernas e abdômen'
    expect(dailyPlan(S,monday).group).toBe('upper')
  })
  it('tem catálogo, instruções e orçamento real de tempo para todas as opções', () => {
    for (const [id] of MOVES) expect(EXIDX[id],id).toBeTruthy()
    for (const minutes of [10,15,20,30,45,60]) for (const level of ['beginner','intermediate','advanced']) {
      const p = dailyPlan(state({minutes,level}),monday)
      expect(p.ex.length).toBeGreaterThan(0)
      expect(3+p.ex.reduce((n,e)=>n+e.sets*(60+e.restSec)/60,0)).toBeLessThanOrEqual(minutes)
    }
  })
})
