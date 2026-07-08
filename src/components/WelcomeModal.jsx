import { useState, useEffect } from 'react'

const FRASES = [
  'Cada cliente que entra pela sua porta carrega uma história. Você a transforma.',
  'Beleza não é vaidade, é cuidado. E você é mestre nisso.',
  'Seu trabalho não é só estética — é confiança, é autoestima, é recomeço.',
  'Um toque certo pode mudar como alguém se vê no espelho pelo resto do dia.',
  'Você não vende procedimentos. Você devolve pessoas a si mesmas.',
  'Hoje é um novo dia para fazer alguém se sentir incrível.',
  'Clientes satisfeitas são a melhor propaganda que existe.',
  'Cada detalhe importa. E você sabe exatamente quais detalhes fazem a diferença.',
  'Sua técnica é o seu diploma. Sua dedicação é o seu diferencial.',
  'Empreender é acreditar no que você faz antes de todo mundo.',
  'A consistência que outros chamam de rotina, você chama de excelência.',
  'Quando você cuida de alguém, você cuida de uma família inteira.',
  'Não existe atalho para um trabalho bem feito. E você escolhe bem.',
  'A sua agenda cheia é reflexo da confiança que depositaram em você.',
  'Cada nova cliente é uma chance de superar a última versão do seu trabalho.',
  'Você não é só esteticista. Você é a melhor parte do dia de alguém.',
  'A beleza começa no olhar de quem cuida.',
  'Persistência transforma sonhos em agendas lotadas.',
  'O segredo do sucesso não é trabalhar mais — é trabalhar com intenção.',
  'Uma cliente bem atendida volta. E traz mais três com ela.',
  'Ser dona do seu tempo é o maior luxo que você conquistou.',
  'Sua presença nesse espaço já faz diferença antes de qualquer procedimento.',
  'Resultados lindos comecem em profissionais que nunca param de aprender.',
  'Você não escolheu a beleza por acaso. A beleza escolheu você.',
  'Todo dia é uma nova oportunidade de se tornar a profissional que você quer ser.',
  'O cuidado que você oferece é o mesmo que você merece receber.',
  'Você construiu isso. Tijolo por tijolo. Cliente por cliente.',
  'Que este dia traga bons resultados, clientes felizes e muito orgulho de si.',
  'O seu trabalho transforma muito mais do que aparências.',
  'Aqui não é só um estúdio. É um espaço de cura e confiança.',
  'Cada sessão é uma história de transformação. A sua autoria.',
  'Você inspira outras mulheres só por existir e persistir.',
]

export function WelcomeModal() {
  const [visible, setVisible] = useState(false)
  const [frase] = useState(() => FRASES[Math.floor(Math.random() * FRASES.length)])

  useEffect(() => {
    const shown = sessionStorage.getItem('liz_welcome_shown')
    if (!shown) {
      const t = setTimeout(() => {
        setVisible(true)
        sessionStorage.setItem('liz_welcome_shown', '1')
      }, 400)
      return () => clearTimeout(t)
    }
  }, [])

  const hora = new Date().getHours()
  const [saudacao, emoji] = hora < 12
    ? ['Bom dia', '☀️']
    : hora < 18
    ? ['Boa tarde', '🌤️']
    : ['Boa noite', '🌙']

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(25,12,38,0.72)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.3s ease' }}
      onClick={() => setVisible(false)}
    >
      <div
        className="card text-center"
        style={{ maxWidth: 420, width: '100%', padding: '48px 40px', animation: 'welcomeScale 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 16 }}>{emoji}</div>

        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 }}>
          {saudacao}
        </p>
        <p style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600, marginTop: 6 }}>
          Studio Liz
        </p>

        <p style={{ color: 'var(--ink-soft)', fontSize: 15, fontStyle: 'italic', lineHeight: 1.65, margin: '28px 0', fontFamily: "'Cormorant Garamond', serif" }}>
          "{frase}"
        </p>

        <button
          className="btn-primary w-full justify-center"
          style={{ fontSize: 14 }}
          onClick={() => setVisible(false)}
        >
          Começar o dia
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes welcomeScale { from { opacity:0; transform:scale(0.88) translateY(12px) } to { opacity:1; transform:scale(1) translateY(0) } }
      `}</style>
    </div>
  )
}
