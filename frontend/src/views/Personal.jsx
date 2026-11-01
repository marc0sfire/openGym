import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { Button } from '../components/ui.jsx'
import { EXIDX } from '../lib/exercises.js'
import { t, exerciseNameFor, instrFor } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { startFlow } from '../sheets.jsx'
import { useNavigate } from 'react-router-dom'
import { personalOf, dailyPlan, alternatives, KIT, progressionAdvice } from '../lib/personal-plan.js'

export default function Personal() {
  const S = useStore(s => s.S), user = useStore(s => s.user), update = useStore(s => s.update)
  const p = personalOf(S), nav = useNavigate()
  const [swaps, setSwaps] = useState({})
  const date = todayISO()
  const plan = useMemo(() => dailyPlan(S, date), [S, date])
  const set = patch => { setSwaps({}); update(s => { s.personal = { ...personalOf(s), ...patch } }) }
  const usable = new Set(plan.ex.flatMap(e => [e.id, ...alternatives(p,e.id)]))
  const exercises = plan.ex.map(e => ({ ...e, id: usable.has(swaps[e.id]) ? swaps[e.id] : e.id }))
  const start = () => {
    if (S.active) { nav('/workout'); return }
    const id = `personal-${p.mode}-${plan.group}`
    update(s => { const r = { id, name: (p.mode === 'home' ? 'Casa · ' : 'Prédio · ') + plan.name, emoji: 'figureStrength', ex: exercises }; const i = s.routines.findIndex(x => x.id === id); if (i < 0) s.routines.push(r); else s.routines[i] = { ...s.routines[i], ...r } })
    startFlow([id])
  }
  return <main className="narrow personal">
    <div className="hdr"><div><h1>Seu treino, {user?.name}</h1><p className="sub">{new Date().toLocaleDateString('pt-BR')}</p></div><Button onClick={()=>nav('/home')}>Voltar</Button></div>
    <div className="card">
      <h2>Onde vai treinar?</h2>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <Button variant={p.mode === 'gym' ? 'primary' : 'plain'} onClick={()=>set({mode:'gym'})}>Academia do prédio</Button>
        <Button variant={p.mode === 'home' ? 'primary' : 'plain'} onClick={()=>set({mode:'home'})}>Calistenia em casa</Button>
      </div>
      <p className="muted">Preferências e evolução pertencem à sua conta.</p>
      <label>Nível<select className="input" value={p.level} onChange={e=>set({level:e.target.value})}><option value="beginner">Iniciante</option><option value="intermediate">Intermediário</option><option value="advanced">Avançado</option></select></label>
      <label>Objetivo<select className="input" value={p.goal} onChange={e=>set({goal:e.target.value})}><option value="health">Condicionamento e saúde</option><option value="hypertrophy">Ganhar massa muscular</option><option value="strength">Ganhar força</option></select></label>
      <label>Tempo disponível<select className="input" value={p.minutes} onChange={e=>set({minutes:Number(e.target.value)})}>{[10,15,20,30,45,60].map(n=><option key={n} value={n}>{n} minutos</option>)}</select></label>
      <fieldset><legend>Dias de força (os demais ficam leves)</legend><div className="row" style={{gap:10,flexWrap:'wrap'}}>{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((day,i)=><label key={day}><input type="checkbox" checked={p.days.includes(i)} onChange={e=>set({days:e.target.checked ? [...p.days,i] : p.days.filter(d=>d!==i)})} /> {day}</label>)}</div></fieldset>
    </div>
    {p.mode === 'gym' && <div className="card"><h2>Equipamentos disponíveis</h2><p>Marque apenas o que você confirmou no prédio. Máquinas diferentes precisam de cadastros distintos. Nenhum equipamento vem marcado.</p>
      {KIT.map(([id,label])=><label key={id} style={{display:'block',padding:'8px 0'}}><input type="checkbox" checked={p.inventory.includes(id)} onChange={e=>set({inventory:e.target.checked ? [...p.inventory,id] : p.inventory.filter(x=>x!==id),inventoryConfirmed:false})} /> {label}</label>)}
      <label>Outros equipamentos / observações<textarea className="input" maxLength={1000} value={p.inventoryNotes || ''} onChange={e=>set({inventoryNotes:e.target.value})} /></label>
      <p className="small muted">Equipamentos anotados aqui precisam ter seus exercícios e requisitos cadastrados antes de entrar nas sugestões.</p>
      <Button onClick={()=>set({inventoryConfirmed:true})}>{p.inventoryConfirmed ? 'Inventário confirmado' : 'Confirmar inventário'}</Button>
    </div>}
    <div className="card"><h2>{plan.name}</h2><p>{plan.reason}</p><p className="muted">{plan.rest ? 'Intensidade leve' : 'Intensidade moderada'} · cerca de {plan.minutes} min, incluindo aquecimento e pausas.</p>
      <p>Comece com movimentos leves. Interrompa se houver dor e reduza a intensidade se ainda estiver cansado.</p>
      {!exercises.length && <p role="status">Confirme primeiro o inventário da academia para receber sugestões.</p>}
      {exercises.map((e,i)=>{ const ex = EXIDX[e.id]; return ex && <article key={i} style={{margin:'22px 0'}}>
        <h3>{exerciseNameFor(ex)}</h3><p>{e.sets} séries de {e.mode === 'time' ? `${e.sec} segundos` : `${e.reps} repetições`} · pausa de {e.restSec} s</p>
        <video controls playsInline muted loop preload="none" width="180" height="180" poster={'/exercise-media/still/' + ex.img} src={'/exercise-media/clip/' + ex.gif} aria-label={'Demonstração de ' + exerciseNameFor(ex)} />
        <ol>{instrFor(ex).map((line,j)=><li key={j}>{line}</li>)}</ol>
        <label>Substituição disponível<select className="input" value={e.id} onChange={ev=>setSwaps({...swaps,[plan.ex[i].id]:ev.target.value})}>{[plan.ex[i].id,...alternatives(p,plan.ex[i].id)].map(id=><option key={id} value={id}>{EXIDX[id] ? exerciseNameFor(EXIDX[id]) : id}</option>)}</select></label>
      </article>})}
      {!!exercises.length && <Button variant="primary" onClick={start}>{S.active ? 'Continuar treino em andamento' : 'Iniciar este treino'}</Button>}
    </div>
    <div className="card"><h2>Progressão e evolução</h2><p>{progressionAdvice(p.level)}</p><p>Registre as repetições e cargas de cada série na tela de treino. Veja os resultados em Histórico e Estatísticas.</p><Button onClick={()=>nav('/history')}>{t('History')}</Button></div>
    <div className="card"><h2>Saúde e dispositivos</h2><p>O navegador não acessa o Apple Saúde. As integrações exigem o app nativo no iPhone do proprietário e consentimento individual.</p><p>{user?.name === 'Marih' ? 'Garmin Venu 3S → Garmin Connect → Apple Saúde no iPhone 14 Plus → app nativo. A ponte existente pode importar frequência cardíaca de sessões registradas aqui; a importação de treinos completos do Garmin permanece pendente.' : 'Apple Watch Series 9: o app watchOS existente registra séries e frequência cardíaca, conectado ao app do iPhone.'}</p><p>Xiaomi: a rota Zepp Life → Apple Saúde → app nativo pode trazer peso. A validação na sua balança ainda está pendente. Confirme o dono da medição no Zepp Life antes de compartilhá-la.</p><p>Sincronização ocorre ao abrir os apps. Não há garantia de tempo real. O lançamento manual de peso continua disponível.</p><Button onClick={()=>nav('/settings')}>Configurar conta e integrações</Button></div>
    <p className="small muted">Baseado no <a href="https://github.com/marc0sfire/openGym">openGym · código-fonte AGPL</a>. Demonstrações © Gym visual, preservadas sem alteração. <a href="https://github.com/marc0sfire/openGym/blob/main/NOTICE.md">Licenças e créditos</a>.</p>
  </main>
}
