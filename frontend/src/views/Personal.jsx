import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import Icon from '../components/Icon.jsx'
import './Personal.css'
import { Button } from '../components/ui.jsx'
import { EXIDX } from '../lib/exercises.js'
import { exerciseNameFor, instrFor } from '../lib/i18n.js'
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
  const inventoryReady = p.mode !== 'gym' || p.inventoryConfirmed
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0)
  return <main className="personal" aria-labelledby="personal-title">
    <header className="personal-header">
      <div className="personal-heading">
        <span className="personal-eyebrow">SEU ESPAÇO DE TREINO</span>
        <h1 id="personal-title">Vamos treinar, {user?.name}?</h1>
        <p>Um treino que cabe no seu dia.</p>
      </div>
      <Button size="sm" icon="chevronLeft" className="personal-back" onClick={() => nav('/home')}>Início</Button>
    </header>

    <section className="personal-panel personal-location" aria-labelledby="location-title">
      <div className="personal-section-heading"><div><h2 id="location-title">Onde você vai treinar?</h2><p>Escolha o ambiente. A sugestão se adapta ao que você tem.</p></div></div>
      <div className="personal-modes" role="group" aria-label="Local do treino">
        {[['gym', 'dumbbell', 'Academia do prédio', 'Só os equipamentos que você cadastrar.'], ['home', 'house', 'Calistenia em casa', 'Peso corporal, sem precisar de aparelhos.']].map(([mode, icon, title, description]) =>
          <button key={mode} type="button" className={'personal-mode' + (p.mode === mode ? ' is-selected' : '')} aria-pressed={p.mode === mode} onClick={() => set({ mode })}>
            <span className="personal-mode-icon"><Icon name={icon} /></span>
            <span className="personal-mode-copy"><strong>{title}</strong><span>{description}</span></span>
            <span className="personal-mode-check" aria-hidden="true">{p.mode === mode && <Icon name="check" />}</span>
          </button>)}
      </div>
    </section>

    <div className="personal-layout">
      <div className="personal-setup">
        <section className="personal-panel" aria-labelledby="preferences-title">
          <div className="personal-section-heading"><div><span className="personal-eyebrow">DO SEU JEITO</span><h2 id="preferences-title">Ajuste sua rotina</h2></div><Icon name="gear" /></div>
          <div className="personal-fields">
            <label>Nível<select value={p.level} onChange={e => set({ level: e.target.value })}><option value="beginner">Iniciante</option><option value="intermediate">Intermediário</option><option value="advanced">Avançado</option></select></label>
            <label>Objetivo<select value={p.goal} onChange={e => set({ goal: e.target.value })}><option value="health">Condicionamento e saúde</option><option value="hypertrophy">Ganhar massa muscular</option><option value="strength">Ganhar força</option></select></label>
            <label>Tempo disponível<select value={p.minutes} onChange={e => set({ minutes: Number(e.target.value) })}>{[10,15,20,30,45,60].map(n => <option key={n} value={n}>{n} minutos</option>)}</select></label>
          </div>
          <fieldset className="personal-week"><legend>Dias de força</legend><p>Nos outros dias, mobilidade ou descanso.</p><div className="personal-days">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((day,i) => <label key={day} className={p.days.includes(i) ? 'is-selected' : ''}><input type="checkbox" checked={p.days.includes(i)} onChange={e => set({ days: e.target.checked ? [...p.days,i] : p.days.filter(d => d !== i) })} /><span>{day}</span></label>)}
          </div></fieldset>
          <p className="personal-save-note"><Icon name="shield" />As alterações são salvas automaticamente na sua conta.</p>
        </section>

        {p.mode === 'gym' && <section className="personal-panel" aria-labelledby="inventory-title">
          <div className="personal-section-heading"><div><span className="personal-eyebrow">SUA ACADEMIA</span><h2 id="inventory-title">Equipamentos disponíveis</h2></div><span className="personal-count">{p.inventory.length}</span></div>
          <p className="personal-description">Marque apenas o que você confirmou no prédio. Nenhum equipamento vem selecionado.</p>
          <div className="personal-equipment">{KIT.map(([id,label]) => <label key={id} className={p.inventory.includes(id) ? 'is-selected' : ''}><input type="checkbox" checked={p.inventory.includes(id)} onChange={e => set({ inventory: e.target.checked ? [...p.inventory,id] : p.inventory.filter(x => x !== id), inventoryConfirmed: false })} /><span>{label}</span></label>)}</div>
          <label className="personal-notes">Outros equipamentos ou observações<textarea rows={3} maxLength={1000} placeholder="Ex.: tipo de máquina, cargas disponíveis…" value={p.inventoryNotes || ''} onChange={e => set({ inventoryNotes: e.target.value })} /></label>
          <p className="personal-help">Equipamentos anotados precisam ter seus exercícios cadastrados antes de entrar nas sugestões.</p>
          <Button variant={p.inventoryConfirmed ? 'tinted' : 'primary'} icon={p.inventoryConfirmed ? 'check' : 'plus'} onClick={() => set({ inventoryConfirmed: true })}>{p.inventoryConfirmed ? 'Inventário confirmado' : 'Confirmar equipamentos'}</Button>
        </section>}

        <details className="personal-panel personal-progress"><summary><span><Icon name="chart" />Evolução e progressão</span><Icon name="chevronDown" /></summary><p className="personal-description">{progressionAdvice(p.level)}</p><Button size="sm" icon="chart" onClick={() => nav('/history')}>Ver meu histórico</Button></details>
      </div>

      <section className="personal-panel personal-workout" aria-labelledby="suggestion-title">
        <div className="personal-section-heading"><span className="personal-eyebrow">SUGESTÃO PARA HOJE</span><span className={'personal-badge' + (plan.rest ? ' is-rest' : '')}><Icon name={plan.rest ? 'moon' : 'bolt'} />{plan.rest ? 'Dia leve' : 'Força'}</span></div>
        <h2 id="suggestion-title">{inventoryReady ? plan.name : 'Vamos preparar sua academia'}</h2>
        {inventoryReady ? <>
          <p className="personal-description">{plan.reason}</p>
          <div className="personal-stats" aria-label="Resumo do treino"><div><Icon name="clock" /><strong>{plan.minutes} min</strong><span>estimados</span></div><div><Icon name="dumbbell" /><strong>{exercises.length}</strong><span>exercícios</span></div><div><Icon name="check" /><strong>{totalSets}</strong><span>séries</span></div></div>
          {!!exercises.length && <Button variant="primary" icon="play" className="personal-start" onClick={start}>{S.active ? 'Continuar treino em andamento' : 'Começar este treino'}</Button>}
          <p className="personal-help">Tempo estimado com aquecimento e pausas. Ajuste a intensidade ao seu cansaço.</p>
        </> : <div className="personal-empty"><span><Icon name="dumbbell" /></span><p>Cadastre e confirme os equipamentos para receber um treino compatível.</p></div>}

        {!!exercises.length && <div className="personal-exercise-list">{exercises.map((e,i) => {
          const ex = EXIDX[e.id]
          return ex && <article className="personal-exercise" key={i}>
            <div className="personal-exercise-heading"><span className="personal-exercise-number">{String(i + 1).padStart(2, '0')}</span><div><h3>{exerciseNameFor(ex)}</h3><p>{e.sets} {e.sets === 1 ? 'série' : 'séries'} × {e.mode === 'time' ? `${e.sec} segundos` : `${e.reps} repetições`}<span> · pausa de {e.restSec} s</span></p></div></div>
            <div className="personal-exercise-content">
              <video controls playsInline muted loop preload="none" width="180" height="180" poster={'/exercise-media/still/' + ex.img} src={'/exercise-media/clip/' + ex.gif} aria-label={'Demonstração de ' + exerciseNameFor(ex)} />
              <details className="personal-instructions"><summary>Como fazer e substituir<Icon name="chevronDown" /></summary><ol>{instrFor(ex).map((line,j) => <li key={j}>{line}</li>)}</ol><label>Substituição disponível<select value={e.id} onChange={ev => setSwaps({ ...swaps, [plan.ex[i].id]: ev.target.value })}>{[plan.ex[i].id,...alternatives(p,plan.ex[i].id)].map(id => <option key={id} value={id}>{EXIDX[id] ? exerciseNameFor(EXIDX[id]) : id}</option>)}</select></label></details>
            </div>
          </article>
        })}</div>}
        <p className="personal-safety">Comece com movimentos leves. Se houver dor, interrompa o exercício.</p>
      </section>
    </div>

    <details className="personal-panel personal-devices"><summary><span><Icon name="shield" /><span><strong>Saúde e dispositivos</strong><small>Conexões e o que ainda precisa ser configurado</small></span></span><Icon name="chevronDown" /></summary><div className="personal-device-content"><p>As integrações exigem o app nativo no iPhone do proprietário e consentimento individual. O navegador não acessa o Apple Saúde.</p><p>{user?.name === 'Marih' ? 'Garmin Venu 3S → Garmin Connect → Apple Saúde no iPhone 14 Plus → app nativo. A ponte pode importar frequência cardíaca de sessões registradas aqui; a importação de treinos completos permanece pendente.' : 'Apple Watch Series 9: o app watchOS existente registra séries e frequência cardíaca, conectado ao app do iPhone.'}</p><p>Xiaomi: Zepp Life → Apple Saúde → app nativo pode trazer peso. A validação na sua balança está pendente. Confirme o proprietário da medição no Zepp Life.</p><p>As leituras ocorrem ao abrir os apps, sem garantia de tempo real. O lançamento manual de peso continua disponível.</p><Button size="sm" onClick={() => nav('/settings')}>Configurar integrações</Button></div></details>
    <footer className="personal-footer"><a href="https://github.com/marc0sfire/openGym">openGym · código-fonte AGPL</a><span>Demonstrações © Gym visual.</span><a href="https://github.com/marc0sfire/openGym/blob/main/NOTICE.md">Licenças e créditos</a></footer>
  </main>
}
