import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { Button } from './ui.jsx'
export default function HealthConsent() {
  const [accepted, setAccepted] = useState(false)
  const user = useStore(s=>s.user), update = useStore(s=>s.update)
  return <main className="narrow" style={{paddingTop:40}}><div className="card"><h1>Seus dados, {user?.name}</h1>
    <p>Este app guarda seus treinos, medidas, peso e metas na sua conta, em banco PostgreSQL Neon, com a aplicação hospedada na Vercel. Cada conta tem acesso aos próprios registros.</p>
    <p>Importações do Apple Saúde exigem consentimento separado no seu iPhone. A balança e os relógios começam desconectados. Você pode exportar seus dados ou excluir sua conta nas configurações.</p>
    <label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} /> Autorizo o armazenamento dos meus dados de treino e saúde para acompanhar minha evolução.</label>
    <div style={{height:18}} /><Button variant="primary" disabled={!accepted} onClick={()=>update(s=>{s.personalConsent={version:1,agreedAt:Date.now(),owner:user.id}})}>Salvar consentimento e continuar</Button>
    <Button onClick={()=>useStore.getState().signOut()}>Sair</Button>
  </div></main>
}
