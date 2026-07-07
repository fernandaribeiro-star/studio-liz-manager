import { supabase } from './supabase.js'

export async function runSeed() {
  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  // Categorias de gasto
  const { data: cats } = await supabase.from('categorias_gasto').insert([
    { nome: 'Aluguel' }, { nome: 'Produtos' }, { nome: 'Marketing' },
    { nome: 'Equipamentos' }, { nome: 'Outros' }
  ]).select()

  // Procedimentos
  const { data: procs } = await supabase.from('procedimentos').insert([
    { nome: 'Limpeza de Pele', duracao_min: 90, valor_padrao: 150 },
    { nome: 'Microagulhamento', duracao_min: 60, valor_padrao: 280 },
    { nome: 'Peeling Químico', duracao_min: 45, valor_padrao: 200 },
    { nome: 'Drenagem Linfática', duracao_min: 60, valor_padrao: 120 },
    { nome: 'Hidratação Facial', duracao_min: 60, valor_padrao: 130 },
    { nome: 'Radiofrequência', duracao_min: 50, valor_padrao: 220 },
    { nome: 'Design de Sobrancelha', duracao_min: 30, valor_padrao: 80 },
  ]).select()

  // Clientes
  const hoje = new Date()
  const diaMes = hoje.getDate()
  const mesAtual = hoje.getMonth() + 1

  const aniv1Mes = mesAtual
  const aniv1Dia = diaMes + 2 > 28 ? 15 : diaMes + 2

  const aniv2Mes = mesAtual === 12 ? 1 : mesAtual + 1
  const aniv2Dia = 10

  const { data: clientes } = await supabase.from('clientes').insert([
    {
      nome: 'Ana Paula Ferreira', telefone: '11987654321', email: 'ana@email.com',
      nascimento: `1990-${String(aniv1Mes).padStart(2,'0')}-${String(aniv1Dia).padStart(2,'0')}`,
      instagram: '@anapaula', como_conheceu: 'Instagram', ativa: true,
      anamnese: 'Alergia a látex. Pele sensível.'
    },
    {
      nome: 'Beatriz Santos', telefone: '11976543210', email: 'bea@email.com',
      nascimento: `1988-${String(aniv2Mes).padStart(2,'0')}-${String(aniv2Dia).padStart(2,'0')}`,
      instagram: '@beatrizsantos', como_conheceu: 'Indicação', ativa: true,
      anamnese: 'Usa isotretinoína. Verificar antes de procedimentos.'
    },
    {
      nome: 'Carla Mendonça', telefone: '11965432109', email: 'carla@email.com',
      nascimento: '1995-03-22',
      como_conheceu: 'Google', ativa: true
    },
    {
      nome: 'Daniela Rocha', telefone: '11954321098', email: 'dani@email.com',
      nascimento: '1992-07-14',
      como_conheceu: 'Amiga', ativa: true
    },
    {
      nome: 'Eduarda Lima', telefone: '11943210987',
      nascimento: '1998-11-30',
      como_conheceu: 'Instagram', ativa: false
    },
    {
      nome: 'Fernanda Costa', telefone: '11932109876', email: 'fernanda@email.com',
      nascimento: '1985-05-08',
      como_conheceu: 'Indicação', ativa: false
    },
  ]).select()

  if (!clientes || !procs) return { error: 'Falha ao inserir dados base' }

  // Estoque
  await supabase.from('estoque').insert([
    { nome: 'Ácido Hialurônico', categoria: 'Ativo', embalagem_nome: 'Frasco 30ml', embalagem_qtd_atual: 3, embalagem_minimo: 2, custo_por_embalagem: 85, unidades_por_embalagem: 30, unidade_nome: 'ml', fornecedor: 'Dermolab' },
    { nome: 'Peeling Mandélico 30%', categoria: 'Peeling', embalagem_nome: 'Frasco 50ml', embalagem_qtd_atual: 1, embalagem_minimo: 2, custo_por_embalagem: 120, unidades_por_embalagem: 50, unidade_nome: 'ml', fornecedor: 'BioPharm' },
    { nome: 'Agulhas Microagulhamento', categoria: 'Descartável', embalagem_nome: 'Caixa 10un', embalagem_qtd_atual: 0, embalagem_minimo: 1, custo_por_embalagem: 45, unidades_por_embalagem: 10, unidade_nome: 'un', fornecedor: 'MedSupply' },
    { nome: 'Vitamina C Estabilizada', categoria: 'Ativo', embalagem_nome: 'Frasco 30g', embalagem_qtd_atual: 5, embalagem_minimo: 2, custo_por_embalagem: 65, unidades_por_embalagem: 30, unidade_nome: 'g', fornecedor: 'Dermolab' },
    { nome: 'Luvas Descartáveis M', categoria: 'Descartável', embalagem_nome: 'Caixa 100un', embalagem_qtd_atual: 4, embalagem_minimo: 2, custo_por_embalagem: 28, unidades_por_embalagem: 100, unidade_nome: 'par', fornecedor: 'MedSupply' },
    { nome: 'Máscara Hidratante', categoria: 'Cosmético', embalagem_nome: 'Pote 200g', embalagem_qtd_atual: 2, embalagem_minimo: 1, custo_por_embalagem: 55, unidades_por_embalagem: 200, unidade_nome: 'g', fornecedor: 'BioPharm' },
    { nome: 'Sérum Antioxidante', categoria: 'Ativo', embalagem_nome: 'Frasco 15ml', embalagem_qtd_atual: 6, embalagem_minimo: 3, custo_por_embalagem: 95, unidades_por_embalagem: 15, unidade_nome: 'ml', fornecedor: 'Dermolab' },
  ])

  // Atendimentos no mês atual
  const d = (dia, hora = '10:00') => {
    const dt = new Date(ano, mes - 1, dia)
    const [h, m] = hora.split(':')
    dt.setHours(parseInt(h), parseInt(m))
    return dt.toISOString()
  }

  const diasAtend = [2, 4, 6, 8, 10, 13, 15, 17].filter(dia => dia <= hoje.getDate())

  const atendimentosData = diasAtend.slice(0, 8).map((dia, i) => ({
    cliente_id: clientes[i % 4].id,
    procedimento_id: procs[i % procs.length].id,
    data_hora: d(dia, ['09:00','10:00','11:00','14:00','15:00','16:00','09:30','14:30'][i]),
    valor: procs[i % procs.length].valor_padrao,
    pagamento: ['pix', 'cartao_credito', 'dinheiro', 'pix'][i % 4],
    sessao_numero: 1,
    sessao_total: 1,
  }))

  await supabase.from('atendimentos').insert(atendimentosData)

  // Agendamentos futuros
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  const depoisAmanha = new Date(hoje)
  depoisAmanha.setDate(depoisAmanha.getDate() + 2)

  await supabase.from('agendamentos').insert([
    {
      cliente_id: clientes[0].id,
      procedimento_id: procs[0].id,
      data_hora: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 10, 0).toISOString(),
      duracao_min: 90,
      valor: 150,
      pagamento: 'pix',
      status: 'confirmado',
    },
    {
      cliente_id: clientes[1].id,
      procedimento_id: procs[1].id,
      data_hora: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 14, 0).toISOString(),
      duracao_min: 60,
      valor: 280,
      pagamento: 'cartao_credito',
      status: 'agendado',
    },
    {
      cliente_id: clientes[2].id,
      procedimento_id: procs[2].id,
      data_hora: new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate(), 9, 0).toISOString(),
      duracao_min: 45,
      valor: 200,
      pagamento: 'pix',
      status: 'agendado',
    },
    {
      cliente_id: clientes[3].id,
      procedimento_id: procs[3].id,
      data_hora: new Date(depoisAmanha.getFullYear(), depoisAmanha.getMonth(), depoisAmanha.getDate(), 11, 0).toISOString(),
      duracao_min: 60,
      valor: 120,
      pagamento: 'dinheiro',
      status: 'agendado',
    },
  ])

  // Gastos
  if (cats && cats.length > 0) {
    await supabase.from('gastos').insert([
      { descricao: 'Aluguel do espaço', valor: 250, categoria_id: cats[0].id, data: `${ano}-${String(mes).padStart(2,'0')}-01` },
      { descricao: 'Produtos BioPharm', valor: 480, categoria_id: cats[1].id, data: `${ano}-${String(mes).padStart(2,'0')}-05` },
      { descricao: 'Impulsionamento Instagram', valor: 150, categoria_id: cats[2].id, data: `${ano}-${String(mes).padStart(2,'0')}-08` },
      { descricao: 'Manutenção equipamento', valor: 200, categoria_id: cats[3].id, data: `${ano}-${String(mes).padStart(2,'0')}-10` },
    ])
  }

  // Sessões ativas
  const sessaoProc1 = procs.find(p => p.nome === 'Microagulhamento') || procs[1]
  const sessaoProc2 = procs.find(p => p.nome === 'Drenagem Linfática') || procs[3]

  await supabase.from('sessoes').insert([
    {
      cliente_id: clientes[0].id,
      procedimento_id: sessaoProc1.id,
      total_sessoes: 5,
      sessoes_feitas: 2,
      intervalo_dias: 21,
      data_inicio: `${ano}-${String(mes).padStart(2,'0')}-02`,
      data_ultima: `${ano}-${String(mes).padStart(2,'0')}-02`,
      data_proxima: (() => {
        const prox = new Date(ano, mes - 1, 23)
        return prox.toISOString().split('T')[0]
      })(),
      status: 'ativa',
    },
    {
      cliente_id: clientes[1].id,
      procedimento_id: sessaoProc2.id,
      total_sessoes: 8,
      sessoes_feitas: 6,
      intervalo_dias: 14,
      data_inicio: `${ano}-${String(mes - 1 > 0 ? mes-1 : 12).padStart(2,'0')}-15`,
      data_ultima: `${ano}-${String(mes).padStart(2,'0')}-08`,
      data_proxima: (() => {
        const prox = new Date(ano, mes - 1, 22)
        return prox.toISOString().split('T')[0]
      })(),
      status: 'ativa',
    },
  ])

  // Templates de marketing
  await supabase.from('templates_marketing').insert([
    {
      nome: 'Confirmação de agendamento',
      tipo: 'confirmacao',
      mensagem: 'Olá {nome}! 💜 Confirmando seu agendamento de {procedimento} no dia {data} às {horario}. Qualquer dúvida estou aqui! — Studio Liz'
    },
    {
      nome: 'Lembrete véspera',
      tipo: 'lembrete',
      mensagem: 'Oi {nome}! 🌸 Lembrando que amanhã você tem {procedimento} às {horario}. Nos vemos em breve! — Studio Liz'
    },
    {
      nome: 'Parabéns aniversário',
      tipo: 'aniversario',
      mensagem: 'Feliz aniversário, {nome}! 🎉✨ Que este novo ano seja incrível! Como presente especial, você tem um desconto surpresa te esperando. Entre em contato! — Studio Liz 💜'
    },
    {
      nome: 'Reativação de cliente',
      tipo: 'reativacao',
      mensagem: 'Oi {nome}! Sentimos sua falta! 🌷 Faz um tempinho que não te vemos por aqui. Temos novidades e promoções esperando por você. Bora agendar? — Studio Liz'
    },
    {
      nome: 'Pós-atendimento',
      tipo: 'pos_atendimento',
      mensagem: 'Oi {nome}! Espero que esteja adorando o resultado! 💫 Lembre-se das recomendações pós-procedimento. Qualquer dúvida, é só chamar! — Studio Liz 💜'
    },
  ])

  return { success: true }
}
