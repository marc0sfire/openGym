// Explicit equipment requirements: machine categories in the upstream catalogue
// cannot tell us which actual machines the building owns.
export const KIT = [
  ['dumbbell', 'Halteres'], ['bench', 'Banco de musculação'],
  ['barbell', 'Barra e anilhas'], ['leg-extension', 'Cadeira extensora'],
  ['leg-curl', 'Mesa/cadeira flexora sentada'], ['seated-row', 'Remada baixa com cabo e assento'],
  ['pullup', 'Barra fixa'],
]
// id, movement group, required kit. These entries all reuse upstream instructions/media.
export const MOVES = [
  ['0662','upper',[]], ['3211','upper',[]],
  ['1197','lower',[]], ['0145','lower',[]], ['1581','lower',[]], ['3018','lower',[]],
  ['0276','core',[]], ['1241','core',[]], ['0463','core',[]],
  ['1760','lower',['dumbbell']], ['0293','upper',['dumbbell']], ['0294','upper',['dumbbell']],
  ['5093','upper',['dumbbell']], ['0032','lower',['barbell']],
  ['0585','lower',['leg-extension']], ['0599','lower',['leg-curl']], ['0861','upper',['seated-row']],
  ['1051','recovery',[]], ['0945','recovery',[]],
]
export const DEFAULT_PERSONAL = { mode: 'home', level: 'beginner', goal: 'health', minutes: 20, days: [1,3,5], inventory: [], inventoryConfirmed: false }
export const personalOf = S => ({ ...DEFAULT_PERSONAL, ...S?.personal })
export function allowedMoves(p) {
  if (p.mode === 'gym' && !p.inventoryConfirmed) return []
  const have = p.mode === 'home' ? [] : p.inventory
  return MOVES.filter(([, , needs]) => needs.every(k => have.includes(k)))
}
const dateAt = d => new Date(d + 'T12:00:00')
const dayGap = (a,b) => Math.round((dateAt(a)-dateAt(b))/864e5)
export function dailyPlan(S, date) {
  const p = personalOf(S)
  const days = [...new Set(p.days)].filter(d => Number.isInteger(d) && d >= 0 && d <= 6).sort()
  const weekday = dateAt(date).getDay()
  const candidates = allowedMoves(p)
  // Count every recorded strength session, including freestyle and old plans.
  const recent = (S.workouts || []).filter(w => w?.d && dayGap(date,w.d) >= 0 && dayGap(date,w.d) < 2
    && !/recuperação/i.test(w.name || '') && w.entries?.some(e => e.sets?.some(s => s.done || s.sides)))
  const rest = !days.includes(weekday) || recent.length > 0
  const index = days.indexOf(weekday)
  const group = rest ? 'recovery' : index % 2 === 0 ? 'upper' : 'lower'
  const maxMinutes = Math.max(5, Math.min(90, Number(p.minutes) || 20))
  const desiredSets = rest ? 1 : p.level === 'beginner' ? 2 : 3
  const restSec = rest ? 30 : p.goal === 'strength' ? 120 : 75
  // Reserve 3 minutes for warmup; conservative 60s per set plus rests.
  const sets = Math.max(1, Math.min(desiredSets, Math.floor((maxMinutes - 3) / ((60 + restSec) / 60))))
  const eachMinutes = sets * (60 + restSec) / 60
  const slots = Math.max(1, Math.floor((maxMinutes - 3) / eachMinutes))
  let pool = candidates.filter(([,g]) => g === group || !rest && g === 'core')
  if (p.mode === 'gym') pool = [...pool.filter(x => x[2].length), ...pool.filter(x => !x[2].length)]
  if (p.level === 'beginner') pool = pool.filter(x => !['0662','0032','0463'].includes(x[0]))
  else pool = pool.filter(x => x[0] !== '3211')
  const selected = pool.slice(0, Math.min(5, slots))
  const reps = p.goal === 'strength' ? 6 : p.goal === 'hypertrophy' ? 10 : 8
  return {
    group, rest, minutes: Math.min(maxMinutes, Math.ceil(3 + selected.length * eachMinutes)),
    reason: recent.length ? 'Treino recente: hoje a sugestão é de recuperação. Respeite o cansaço e ajuste a rotina.'
      : rest ? 'Dia leve de mobilidade. Você também pode descansar completamente.'
      : 'Alterne os grupos e mantenha pelo menos um dia leve entre sessões de força.',
    name: rest ? 'Recuperação e mobilidade' : group === 'upper' ? 'Superiores e abdômen' : 'Pernas e abdômen',
    ex: selected.map(([id]) => ({ id, sets, reps: ['1051','0945','0463'].includes(id) ? 20 : reps, weight: 0, restSec,
      ...(['1051','0945','0463'].includes(id) ? { mode: 'time', sec: 20 } : {}) })),
  }
}
export function alternatives(p, id) {
  const move = MOVES.find(x => x[0] === id)
  return move ? allowedMoves(p).filter(x => x[0] !== id && x[1] === move[1]).map(x=>x[0]) : []
}
export const progressionAdvice = level => level === 'beginner'
  ? 'Comece pela flexão com joelhos apoiados. Ao completar 2 séries de 12 repetições com boa técnica em duas sessões, experimente a flexão tradicional. Para pernas, aumente as repetições do agachamento antes de experimentar o afundo.'
  : 'Primeiro aumente as repetições com boa técnica, depois as séries. Avance uma variável por vez e mantenha cerca de 2 repetições de reserva. O histórico registra cada série; a progressão de dificuldade é uma escolha sua.'
