// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
const h = vi.hoisted(()=>({update:vi.fn(),user:{id:'m',name:'Marcos'}}))
vi.mock('../store/useStore.js',()=>({useStore:fn=>fn(h)}))
import HealthConsent from './HealthConsent.jsx'
it('exige escolha explícita antes de registrar consentimento vinculado à conta',async()=>{
  const el=document.createElement('div'),root=createRoot(el)
  await act(async()=>root.render(<HealthConsent/>))
  const button=el.querySelector('button')
  expect(button.disabled).toBe(true)
  await act(async()=>el.querySelector('input').click())
  expect(button.disabled).toBe(false)
  await act(async()=>button.click())
  const S={};h.update.mock.calls[0][0](S)
  expect(S.personalConsent.owner).toBe('m')
  expect(S.personalConsent.agreedAt).toBeGreaterThan(0)
  await act(async()=>root.unmount())
})
