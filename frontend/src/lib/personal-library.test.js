import { vi, it, expect } from 'vitest'
vi.hoisted(()=>vi.stubEnv('VITE_PERSONAL','1'))
import { allExercises, EXDB, EXIDX } from './exercises.js'
import steps from '../instr/pt-BR.js'
import names from '../exercise-names/pt-BR.js'
import { MOVES } from './personal-plan.js'
import { setPortugueseOnly, _setLangState, instrFor, descFor } from './i18n-core.js'
it('oferece apenas exercícios com nome e instruções em português sem apagar o catálogo original',()=>{
  const offered=allExercises({})
  expect(offered.length).toBeGreaterThan(1300)
  for(const e of offered){expect(steps[e.id]?.length,e.id).toBeGreaterThan(0);expect(names[e.id],e.id).toBeTruthy()}
  for(const [id] of MOVES)expect(steps[id]?.length,id).toBeGreaterThan(0)
  expect(Object.keys(EXIDX).length).toBeGreaterThanOrEqual(EXDB.length)
})
it('não recorre a instruções ou descrições em inglês em um item legado sem tradução',()=>{
  setPortugueseOnly(true);_setLangState('pt-BR',{},steps,names,false)
  const untranslated=EXDB.find(e=>!steps[e.id])
  expect(instrFor(untranslated)[0]).toContain('instruções em português')
  expect(descFor(untranslated)).toBe('')
  setPortugueseOnly(false)
})
