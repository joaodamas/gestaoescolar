import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  listarLancamentos,
  criarLancamento,
  aprovarLancamento,
  cancelarLancamento,
  calcularTotais,
  uploadComprovante,
  buscarConfiguracoes,
} from '../../services/financeiro'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Plus,
  X,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertCircle,
  Wallet,
  Upload,
  Lock,
} from 'lucide-react'
import { Document, baixarPDF, slugify } from '../../utils/exportPDF'
import { exportarParaExcel, formatarParaExportacao } from '../../utils/exportExcel'
import { FinanceiroRelatorioDocumento } from './documentos/FinanceiroRelatorioDocumento'

const ANO_ATUAL = new Date().getFullYear()
const MES_ATUAL = new Date().getMonth() + 1

// Perfis com acesso ao módulo financeiro
const PERFIS_PERMITIDOS = ['admin', 'diretor']
const PODE_APROVAR = ['diretor']
const PODE_CRIAR   = ['admin']

// ─── Utilitários de formatação ────────────────────────────────────────────────

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0)
}

function formatarData(str) {
  if (!str) return '—'
  const [ano, mes, dia] = str.split('-')
  return `${dia}/${mes}/${ano}`
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const BADGE_TIPO = {
  despesa: 'bg-red-100 text-red-700',
  receita: 'bg-green-100 text-green-700',
}

const BADGE_STATUS = {
  pendente:  'bg-yellow-100 text-yellow-700',
  aprovado:  'bg-blue-100 text-blue-700',
  pago:      'bg-green-100 text-green-700',
  cancelado: 'bg-slate-100 text-slate-500',
}

const LABEL_STATUS = {
  pendente:  'Pendente',
  aprovado:  'Aprovado',
  pago:      'Pago',
  cancelado: 'Cancelado',
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

function Campo({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 6 }) {
  return (
    <div
      className={`w-${size} h-${size} border-4 border-blue-600 border-t-transparent rounded-full animate-spin`}
    />
  )
}

// ─── Modal de lançamento ──────────────────────────────────────────────────────

function ModalLancamento({ tipo, onClose, onSalvo, orcamentoPrevisto, totalDespesasAprovadas, limiteComprovante }) {
  const { user, perfil, escolaId, unidadeAtualId } = useAuth()

  const formInicial = {
    categoria: '',
    subcategoria: '',
    valor: '',
    descricao: '',
    data_lancamento: new Date().toISOString().split('T')[0],
    centro_custo: '',
  }

  const [form, setForm]           = useState(formInicial)
  const [arquivo, setArquivo]     = useState(null)
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')

  const valorNum         = parseFloat(form.valor) || 0
  const saldoAtual       = orcamentoPrevisto - totalDespesasAprovadas
  const saldoApos        = tipo === 'despesa' ? saldoAtual - valorNum : saldoAtual + valorNum
  const saldoNegativo    = tipo === 'despesa' && saldoApos < 0
  const precisaComprov   = valorNum > limiteComprovante
  const comprovFaltando  = precisaComprov && !arquivo
  const bloqueado        = salvando || saldoNegativo || comprovFaltando
  const escopo = { escolaId, unidadeAtualId, perfil }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!form.categoria) { setErro('Informe a categoria.'); return }
    if (!form.valor || valorNum <= 0) { setErro('Informe um valor válido.'); return }
    if (comprovFaltando) { setErro(`Comprovante obrigatório para valores acima de ${formatarMoeda(limiteComprovante)}.`); return }
    if (saldoNegativo) { setErro('Operação bloqueada: saldo insuficiente.'); return }

    setSalvando(true)
    try {
      // Cria o documento primeiro para obter o ID
      const docRef = await criarLancamento({ ...form, tipo, valor: valorNum }, user.uid, escopo)

      // Upload de comprovante se houver arquivo
      if (arquivo) {
        const url = await uploadComprovante(arquivo, docRef.id)
        // Atualiza o doc com a URL
        const { updateDoc, doc } = await import('firebase/firestore')
        const { db } = await import('../../firebase/firebase')
        await updateDoc(doc(db, 'financeiro_lancamentos', docRef.id), { comprovante_url: url })
      }

      onSalvo()
      onClose()
    } catch (err) {
      console.error(err)
      setErro('Erro ao salvar lançamento. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header do modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            {tipo === 'despesa'
              ? <TrendingDown size={18} className="text-red-500" />
              : <TrendingUp size={18} className="text-green-500" />
            }
            <h2 className="text-base font-semibold text-slate-800">
              Nova {tipo === 'despesa' ? 'Despesa' : 'Receita'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Preview saldo */}
          <div className={`rounded-xl border p-4 ${saldoNegativo ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-xs font-medium text-slate-500 mb-1">
              {tipo === 'despesa' ? 'Saldo após esta despesa' : 'Saldo após esta receita'}
            </p>
            <p className={`text-lg font-bold ${saldoNegativo ? 'text-red-600' : 'text-slate-800'}`}>
              {formatarMoeda(saldoApos)}
            </p>
            {saldoNegativo && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> Saldo insuficiente — operação bloqueada
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Categoria *">
              <input
                required
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className={inputCls}
                placeholder="Ex: Material didático"
              />
            </Campo>
            <Campo label="Subcategoria">
              <input
                value={form.subcategoria}
                onChange={e => setForm(f => ({ ...f, subcategoria: e.target.value }))}
                className={inputCls}
                placeholder="Opcional"
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Valor (R$) *">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                className={inputCls}
                placeholder="0,00"
              />
            </Campo>
            <Campo label="Data *">
              <input
                required
                type="date"
                value={form.data_lancamento}
                onChange={e => setForm(f => ({ ...f, data_lancamento: e.target.value }))}
                className={inputCls}
              />
            </Campo>
          </div>

          <Campo label="Centro de Custo">
            <input
              value={form.centro_custo}
              onChange={e => setForm(f => ({ ...f, centro_custo: e.target.value }))}
              className={inputCls}
              placeholder="Ex: Administrativo, Pedagógico..."
            />
          </Campo>

          <Campo label="Descrição">
            <textarea
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Detalhes do lançamento..."
            />
          </Campo>

          {/* Upload comprovante */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Comprovante {precisaComprov && <span className="text-red-500">* (obrigatório acima de {formatarMoeda(limiteComprovante)})</span>}
            </label>
            <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              arquivo
                ? 'border-green-400 bg-green-50'
                : precisaComprov
                  ? 'border-red-300 bg-red-50 hover:border-red-400'
                  : 'border-slate-200 bg-slate-50 hover:border-blue-400'
            }`}>
              <Upload size={16} className={arquivo ? 'text-green-600' : 'text-slate-400'} />
              <span className="text-sm text-slate-600">
                {arquivo ? arquivo.name : 'Selecionar PDF ou imagem'}
              </span>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={e => setArquivo(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              <AlertCircle size={15} /> {erro}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm border border-slate-200 text-slate-600 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={bloqueado}
              title={saldoNegativo ? 'Saldo insuficiente' : comprovFaltando ? 'Comprovante obrigatório' : ''}
              className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {salvando && <Spinner size={4} />}
              {salvando ? 'Enviando...' : 'Enviar para aprovação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const { user, perfil, escolaId, unidadeAtualId } = useAuth()
  const escopo = useMemo(() => ({ escolaId, unidadeAtualId, perfil }), [escolaId, unidadeAtualId, perfil])

  // Guard de perfil
  if (!perfil || !PERFIS_PERMITIDOS.includes(perfil.perfil)) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <Lock size={28} className="text-slate-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-700">Acesso Restrito</h2>
          <p className="text-sm text-slate-400 mt-1">
            Você não tem permissão para acessar o módulo Financeiro.
          </p>
        </div>
      </div>
    )
  }

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [lancamentos, setLancamentos]   = useState([])
  const [totais, setTotais]             = useState({ totalReceitas: 0, totalDespesas: 0, saldoDisponivel: 0 })
  const [config, setConfig]             = useState({ orcamento_previsto: 0, limite_comprovante: 500 })
  const [carregando, setCarregando]     = useState(true)
  const [modalTipo, setModalTipo]       = useState(null) // 'despesa' | 'receita' | null
  const [acao, setAcao]                 = useState({ id: null, tipo: null }) // aprovando/cancelando
  const [erro, setErro]                 = useState('')

  // Filtros
  const [filtroTipo, setFiltroTipo]           = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroStatus, setFiltroStatus]       = useState('')
  const [filtroCusto, setFiltroCusto]         = useState('')
  const [filtroAno, setFiltroAno]             = useState(ANO_ATUAL)
  const [filtroMes, setFiltroMes]             = useState('')

  // ── Carregar dados ──────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const filtros = {
        ...(filtroTipo      && { tipo: filtroTipo }),
        ...(filtroCategoria && { categoria: filtroCategoria }),
        ...(filtroStatus    && { status: filtroStatus }),
        ...(filtroCusto     && { centro_custo: filtroCusto }),
        ...(filtroAno       && { ano: filtroAno }),
        ...(filtroMes       && { mes: Number(filtroMes) }),
      }
      const [lista, totaisCalc, cfg] = await Promise.all([
        listarLancamentos({ ...filtros, ...escopo }),
        calcularTotais(filtroAno || ANO_ATUAL, escopo),
        buscarConfiguracoes(),
      ])
      setLancamentos(lista)
      setTotais(totaisCalc)
      setConfig(cfg)
    } catch (err) {
      console.error(err)
      setErro('Erro ao carregar dados financeiros.')
    } finally {
      setCarregando(false)
    }
  }, [filtroTipo, filtroCategoria, filtroStatus, filtroCusto, filtroAno, filtroMes, escopo])

  useEffect(() => { carregar() }, [carregar])

  // ── Ações ────────────────────────────────────────────────────────────────────
  async function handleAprovar(id) {
    if (!PODE_APROVAR.includes(perfil.perfil)) return
    setAcao({ id, tipo: 'aprovando' })
    try {
      await aprovarLancamento(id, user.uid)
      carregar()
    } catch (err) {
      console.error(err)
      setErro('Erro ao aprovar lançamento.')
    } finally {
      setAcao({ id: null, tipo: null })
    }
  }

  async function handleCancelar(id) {
    if (!PODE_APROVAR.includes(perfil.perfil)) return
    if (!window.confirm('Deseja cancelar este lançamento?')) return
    setAcao({ id, tipo: 'cancelando' })
    try {
      await cancelarLancamento(id)
      carregar()
    } catch (err) {
      console.error(err)
      setErro('Erro ao cancelar lançamento.')
    } finally {
      setAcao({ id: null, tipo: null })
    }
  }

  // ── Métricas ─────────────────────────────────────────────────────────────────
  const orcamentoPrevisto    = config.orcamento_previsto ?? 0
  const limiteComprovante    = config.limite_comprovante ?? 500
  const totalExecutado       = totais.totalDespesas
  const saldoDisponivel      = orcamentoPrevisto - totalExecutado
  const pctExecucao          = orcamentoPrevisto > 0
    ? Math.min(100, Math.round((totalExecutado / orcamentoPrevisto) * 100))
    : 0

  const podeAprovar = PODE_APROVAR.includes(perfil.perfil)
  const podeCriar   = PODE_CRIAR.includes(perfil.perfil)

  // Coleta categorias distintas da lista atual para o filtro
  const categoriasDistintas = [...new Set(lancamentos.map(l => l.categoria).filter(Boolean))]
  const centrosDistintos    = [...new Set(lancamentos.map(l => l.centro_custo).filter(Boolean))]

  function linhasExportacao() {
    return formatarParaExportacao(lancamentos, {
      'Data': item => formatarData(item.data_lancamento),
      'Tipo': 'tipo',
      'Categoria': 'categoria',
      'Subcategoria': 'subcategoria',
      'Centro de custo': 'centro_custo',
      'Valor': item => Number(item.valor ?? 0),
      'Status': 'status',
      'Descrição': 'descricao',
      'Aprovado por': 'aprovado_por',
    })
  }

  function exportarExcel() {
    exportarParaExcel(linhasExportacao(), `financeiro-${filtroAno || ANO_ATUAL}`, 'Financeiro')
  }

  async function exportarPDF() {
    const documento = (
      <Document>
        <FinanceiroRelatorioDocumento
          dados={{
            lancamentos,
            ano: filtroAno || ANO_ATUAL,
            totais: { orcamentoPrevisto, totalExecutado, saldoDisponivel },
            dataGeracao: new Date().toLocaleString('pt-BR'),
          }}
        />
      </Document>
    )
    await baixarPDF(documento, `financeiro-${slugify(filtroAno || ANO_ATUAL)}.pdf`)
  }

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Orçamento & Lançamentos · Ano {filtroAno || ANO_ATUAL}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportarExcel}
            disabled={lancamentos.length === 0}
            className="flex items-center gap-2 text-sm border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Download size={15} /> Excel
          </button>
          <button
            onClick={exportarPDF}
            disabled={lancamentos.length === 0}
            className="flex items-center gap-2 text-sm border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <FileText size={15} /> PDF
          </button>
          {podeCriar && (
            <>
              <button
                onClick={() => setModalTipo('despesa')}
                className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                <Plus size={15} /> Nova Despesa
              </button>
              <button
                onClick={() => setModalTipo('receita')}
                className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                <Plus size={15} /> Nova Receita
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Cards de totais ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Orçamento Previsto */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Orçamento Previsto</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Wallet size={16} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-700">{formatarMoeda(orcamentoPrevisto)}</p>
          <p className="text-xs text-slate-400 mt-1">Ano {filtroAno || ANO_ATUAL}</p>
        </div>

        {/* Total Executado */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Executado</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown size={16} className="text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatarMoeda(totalExecutado)}</p>

          {/* Barra de progresso */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Execução orçamentária</span>
              <span>{pctExecucao}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  pctExecucao >= 90 ? 'bg-red-500' : pctExecucao >= 70 ? 'bg-yellow-400' : 'bg-blue-500'
                }`}
                style={{ width: `${pctExecucao}%` }}
              />
            </div>
          </div>
        </div>

        {/* Saldo Disponível */}
        <div className={`bg-white rounded-2xl shadow-sm border p-5 ${saldoDisponivel < 0 ? 'border-red-200' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo Disponível</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${saldoDisponivel < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <DollarSign size={16} className={saldoDisponivel < 0 ? 'text-red-500' : 'text-green-600'} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${saldoDisponivel < 0 ? 'text-red-600' : 'text-green-700'}`}>
            {formatarMoeda(saldoDisponivel)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Receitas aprovadas: {formatarMoeda(totais.totalReceitas)}
          </p>
        </div>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3">
        {/* Tipo */}
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos os tipos</option>
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>

        {/* Categoria */}
        <select
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todas as categorias</option>
          {categoriasDistintas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Status */}
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
        </select>

        {/* Centro de Custo */}
        <select
          value={filtroCusto}
          onChange={e => setFiltroCusto(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos os centros</option>
          {centrosDistintos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Mês */}
        <select
          value={filtroMes}
          onChange={e => setFiltroMes(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos os meses</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
            </option>
          ))}
        </select>

        {/* Ano */}
        <select
          value={filtroAno}
          onChange={e => setFiltroAno(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {[ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* ── Alerta de erro global ───────────────────────────────────────────── */}
      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          <AlertCircle size={15} /> {erro}
        </div>
      )}

      {/* ── Tabela de lançamentos ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center h-48">
            <Spinner />
          </div>
        ) : lancamentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
            <FileText size={40} className="text-slate-200" />
            <p className="text-sm">Nenhum lançamento encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3 whitespace-nowrap">Data</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Tipo</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Categoria</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Centro</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Valor</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Comprov.</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lancamentos.map(l => {
                  const emAcao = acao.id === l.id
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      {/* Data */}
                      <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {formatarData(l.data_lancamento)}
                      </td>

                      {/* Tipo badge */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${BADGE_TIPO[l.tipo] ?? 'bg-slate-100 text-slate-600'}`}>
                          {l.tipo}
                        </span>
                      </td>

                      {/* Categoria + Subcategoria + Descrição */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{l.categoria || '—'}</p>
                        {l.subcategoria && (
                          <p className="text-xs text-slate-400">{l.subcategoria}</p>
                        )}
                        {l.descricao && (
                          <p className="text-xs text-slate-400 truncate max-w-[180px]" title={l.descricao}>
                            {l.descricao}
                          </p>
                        )}
                      </td>

                      {/* Centro de Custo */}
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                        {l.centro_custo || '—'}
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`text-sm font-semibold ${l.tipo === 'despesa' ? 'text-red-600' : 'text-green-600'}`}>
                          {l.tipo === 'despesa' ? '- ' : '+ '}{formatarMoeda(l.valor)}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${BADGE_STATUS[l.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {LABEL_STATUS[l.status] ?? l.status}
                        </span>
                      </td>

                      {/* Comprovante */}
                      <td className="px-4 py-3 text-center">
                        {l.comprovante_url ? (
                          <a
                            href={l.comprovante_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <ExternalLink size={12} /> Ver
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          {/* Botão Aprovar — apenas Diretor e status pendente */}
                          {podeAprovar && l.status === 'pendente' && (
                            <button
                              onClick={() => handleAprovar(l.id)}
                              disabled={emAcao}
                              title="Aprovar lançamento"
                              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {emAcao && acao.tipo === 'aprovando'
                                ? <Spinner size={3} />
                                : <CheckCircle size={13} />
                              }
                              Aprovar
                            </button>
                          )}

                          {/* Botão Cancelar — apenas Diretor e status pendente */}
                          {podeAprovar && l.status === 'pendente' && (
                            <button
                              onClick={() => handleCancelar(l.id)}
                              disabled={emAcao}
                              title="Cancelar lançamento"
                              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {emAcao && acao.tipo === 'cancelando'
                                ? <Spinner size={3} />
                                : <XCircle size={13} />
                              }
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de lançamento ─────────────────────────────────────────────── */}
      {modalTipo && (
        <ModalLancamento
          tipo={modalTipo}
          onClose={() => setModalTipo(null)}
          onSalvo={carregar}
          orcamentoPrevisto={orcamentoPrevisto}
          totalDespesasAprovadas={totais.totalDespesas}
          limiteComprovante={limiteComprovante}
        />
      )}
    </div>
  )
}
