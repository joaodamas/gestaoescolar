import { useEffect, useState } from 'react'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useAuth } from '../../context/AuthContext'
import { storage } from '../../firebase/firebase'
import { buscarConfiguracoes, salvarConfiguracoes } from '../../services/configuracoes'
import {
  Settings, Save, Target, Sparkles, Building2, Wallet,
  TrendingUp, BookCheck, GraduationCap, Plus, Trash2, CheckCircle2, AlertCircle,
  Upload
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card, CardHeader, Spinner } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'

export default function ConfiguracoesPage() {
  const { user, perfil } = useAuth()
  const [config, setConfig] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const podeEditar = ['diretor', 'admin'].includes(perfil?.perfil)

  useEffect(() => {
    buscarConfiguracoes().then(c => {
      setConfig(c)
      setCarregando(false)
    })
  }, [])

  function atualizar(campo, valor) {
    setConfig(c => ({ ...c, [campo]: valor }))
    setSucesso(false)
  }

  function atualizarRegraRecuperacao(campo, valor) {
    setConfig(c => ({
      ...c,
      regras_recuperacao_final: {
        ...(c.regras_recuperacao_final ?? {}),
        [campo]: valor,
      },
    }))
    setSucesso(false)
  }

  function atualizarEndereco(campo, valor) {
    setConfig(c => ({
      ...c,
      endereco: {
        ...(c.endereco ?? {}),
        [campo]: valor,
      },
    }))
    setSucesso(false)
  }

  function atualizarValor(idx, valor) {
    const valores = [...(config.valores ?? [])]
    valores[idx] = valor
    atualizar('valores', valores)
  }

  function removerValor(idx) {
    atualizar('valores', (config.valores ?? []).filter((_, i) => i !== idx))
  }

  function adicionarValor() {
    atualizar('valores', [...(config.valores ?? []), ''])
  }

  function atualizarSaeb(ano, valorBruto) {
    // Aceita vírgula ou ponto como separador decimal
    // Mantém a string crua no estado para permitir edição livre
    const limpa = String(valorBruto).replace(',', '.').replace(/[^\d.]/g, '')
    atualizar('saeb_historico', { ...(config.saeb_historico ?? {}), [ano]: limpa })
  }

  function removerSaeb(ano) {
    const novo = { ...(config.saeb_historico ?? {}) }
    delete novo[ano]
    atualizar('saeb_historico', novo)
  }

  function adicionarSaeb() {
    const proxAno = new Date().getFullYear()
    atualizar('saeb_historico', { ...(config.saeb_historico ?? {}), [proxAno]: 0 })
  }

  async function handleSalvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      let logoUrl = config.logo_url ?? ''
      if (logoFile) {
        const extensao = logoFile.name.split('.').pop() || 'png'
        const logoRef = ref(storage, `configuracoes/logo_escola.${extensao}`)
        await uploadBytes(logoRef, logoFile)
        logoUrl = await getDownloadURL(logoRef)
      }

      // Converte saeb_historico para números no momento de salvar
      const saebNumerico = Object.fromEntries(
        Object.entries(config.saeb_historico ?? {})
          .map(([ano, v]) => [ano, Number(v) || 0])
      )
      const limpo = {
        ...config,
        valores: (config.valores ?? []).filter(v => v?.trim()),
        saeb_historico: saebNumerico,
        meta_saeb: Number(config.meta_saeb) || 6.0,
        logo_url: logoUrl,
        pdde_alerta_dias: Number(config.pdde_alerta_dias) || 15,
      }
      await salvarConfiguracoes(limpo, user.uid)
      setConfig(limpo)
      setLogoFile(null)
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    } catch (err) {
      setErro('Erro ao salvar. Verifique suas permissões.')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>

  return (
    <div>
      <PageHeader
        titulo="Configurações da Escola"
        descricao="Dados gerais, metas pedagógicas e parâmetros financeiros"
        icon={Settings}
        acoes={
          podeEditar && (
            <Button variante="accent" icon={Save} loading={salvando} onClick={handleSalvar}>
              Salvar Alterações
            </Button>
          )
        }
      />

      {!podeEditar && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} /> Apenas Diretor e Admin podem editar as configurações.
        </div>
      )}

      {sucesso && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2 animate-in slide-up duration-200">
          <CheckCircle2 size={16} /> Configurações salvas com sucesso.
        </div>
      )}

      {erro && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      <form onSubmit={handleSalvar} className="space-y-5">
        {/* Dados da Escola */}
        <Card>
          <CardHeader titulo="Dados da Escola" descricao="Identificação institucional" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nome da Escola" value={config.nome_escola ?? ''} onChange={e => atualizar('nome_escola', e.target.value)} disabled={!podeEditar} />
            <Input label="CNPJ" value={config.cnpj ?? ''} onChange={e => atualizar('cnpj', e.target.value)} disabled={!podeEditar} placeholder="00.000.000/0001-00" />
            <Input label="Slogan" value={config.slogan ?? ''} onChange={e => atualizar('slogan', e.target.value)} disabled={!podeEditar} className="md:col-span-2" />
            <Input label="Ano Letivo Atual" type="number" value={config.ano_letivo_atual ?? new Date().getFullYear()} onChange={e => atualizar('ano_letivo_atual', Number(e.target.value))} disabled={!podeEditar} />
            <div className="md:col-span-2 flex flex-col md:flex-row md:items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Logo da escola" className="w-full h-full object-contain p-2" />
                ) : (
                  <Building2 size={28} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700 mb-2">LOGO DA ESCOLA</p>
                <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  podeEditar ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}>
                  <Upload size={15} />
                  {logoFile ? logoFile.name : 'Selecionar arquivo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={!podeEditar}
                    onChange={e => setLogoFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-400 mt-2">PNG, JPG ou WEBP. O arquivo será salvo no Firebase Storage.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader titulo="Endereço" descricao="Endereço completo da unidade escolar" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-6 gap-4">
            <Input label="CEP" value={config.endereco?.cep ?? ''} onChange={e => atualizarEndereco('cep', e.target.value)} disabled={!podeEditar} placeholder="00000-000" />
            <Input label="Rua" value={config.endereco?.rua ?? ''} onChange={e => atualizarEndereco('rua', e.target.value)} disabled={!podeEditar} className="md:col-span-3" />
            <Input label="Número" value={config.endereco?.numero ?? ''} onChange={e => atualizarEndereco('numero', e.target.value)} disabled={!podeEditar} />
            <Input label="Complemento" value={config.endereco?.complemento ?? ''} onChange={e => atualizarEndereco('complemento', e.target.value)} disabled={!podeEditar} />
            <Input label="Bairro" value={config.endereco?.bairro ?? ''} onChange={e => atualizarEndereco('bairro', e.target.value)} disabled={!podeEditar} className="md:col-span-2" />
            <Input label="Cidade" value={config.endereco?.cidade ?? ''} onChange={e => atualizarEndereco('cidade', e.target.value)} disabled={!podeEditar} className="md:col-span-3" />
            <Input label="Estado" value={config.endereco?.estado ?? ''} onChange={e => atualizarEndereco('estado', e.target.value.toUpperCase().slice(0, 2))} disabled={!podeEditar} maxLength={2} />
          </div>
        </Card>

        {/* Missão e Valores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader titulo="Nossa Missão" descricao="Texto exibido no dashboard" />
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-50 ring-1 ring-blue-200 rounded-xl flex items-center justify-center shrink-0">
                  <Target size={18} className="text-blue-600" />
                </div>
                <Textarea
                  value={config.missao ?? ''}
                  onChange={e => atualizar('missao', e.target.value)}
                  rows={4}
                  disabled={!podeEditar}
                  className="flex-1"
                  placeholder="Garantir aprendizagens significativas e formar cidadãos para a vida."
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader titulo="Nossos Valores" descricao="Lista exibida no dashboard"
              acao={podeEditar && <Button variante="ghost" tamanho="sm" icon={Plus} onClick={adicionarValor}>Adicionar</Button>}
            />
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-50 ring-1 ring-purple-200 rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles size={18} className="text-purple-600" />
                </div>
                <div className="flex-1 space-y-2">
                  {(config.valores ?? []).map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={v} onChange={e => atualizarValor(i, e.target.value)} disabled={!podeEditar} className="flex-1" placeholder="Ex: Respeito" />
                      {podeEditar && (
                        <button type="button" onClick={() => removerValor(i)} className="px-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(config.valores ?? []).length === 0 && (
                    <p className="text-xs text-slate-400 italic">Nenhum valor cadastrado.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Metas Pedagógicas */}
        <Card>
          <CardHeader titulo="Metas Pedagógicas" descricao="Usadas no cálculo e exibição do dashboard" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-emerald-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-emerald-900 mb-1">META PRESENÇA</p>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={100} value={config.meta_presenca ?? 90} onChange={e => atualizar('meta_presenca', Number(e.target.value))} disabled={!podeEditar} className="w-20" />
                  <span className="text-sm font-medium text-slate-600">%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50/50 rounded-xl border border-orange-100">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                <BookCheck size={18} className="text-orange-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-orange-900 mb-1">META APROVAÇÃO</p>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={100} value={config.meta_aprovacao ?? 90} onChange={e => atualizar('meta_aprovacao', Number(e.target.value))} disabled={!podeEditar} className="w-20" />
                  <span className="text-sm font-medium text-slate-600">%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                <GraduationCap size={18} className="text-purple-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-purple-900 mb-1">META SAEB</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={config.meta_saeb ?? ''}
                    placeholder="6.0"
                    onChange={e => {
                      const limpa = String(e.target.value).replace(',', '.').replace(/[^\d.]/g, '')
                      atualizar('meta_saeb', limpa)
                    }}
                    disabled={!podeEditar}
                    className="w-20"
                  />
                  <span className="text-sm font-medium text-slate-600">/ 10</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader titulo="Regras de Recuperação Final" descricao="Usadas no cálculo de situação das notas" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <BookCheck size={18} className="text-blue-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-900 mb-1">MÉDIA PARA APROVAÇÃO</p>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step="0.1"
                  value={config.regras_recuperacao_final?.media_aprovacao ?? 6}
                  onChange={e => atualizarRegraRecuperacao('media_aprovacao', Number(e.target.value))}
                  disabled={!podeEditar}
                  className="w-24"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle size={18} className="text-amber-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-900 mb-1">MÍNIMO PARA RECUPERAÇÃO</p>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step="0.1"
                  value={config.regras_recuperacao_final?.media_recuperacao_minima ?? 4}
                  onChange={e => atualizarRegraRecuperacao('media_recuperacao_minima', Number(e.target.value))}
                  disabled={!podeEditar}
                  className="w-24"
                />
              </div>
            </div>

            <label className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              podeEditar ? 'bg-slate-50 border-slate-200 cursor-pointer' : 'bg-slate-50/50 border-slate-100'
            }`}>
              <input
                type="checkbox"
                checked={config.regras_recuperacao_final?.usar_maior_nota ?? true}
                onChange={e => atualizarRegraRecuperacao('usar_maior_nota', e.target.checked)}
                disabled={!podeEditar}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-900">USAR MAIOR NOTA</p>
                <p className="text-xs text-slate-500 mt-1">Quando desmarcado, usa média entre bimestre e recuperação.</p>
              </div>
            </label>
          </div>
        </Card>

        {/* Histórico SAEB */}
        <Card>
          <CardHeader
            titulo="Histórico SAEB"
            descricao="Notas anuais exibidas no gráfico do dashboard"
            acao={podeEditar && <Button variante="ghost" tamanho="sm" icon={Plus} onClick={adicionarSaeb}>Adicionar Ano</Button>}
          />
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(config.saeb_historico ?? {}).sort(([a], [b]) => Number(a) - Number(b)).map(([ano, nota]) => (
                <div key={ano} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 mb-2">{ano}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={nota === 0 ? '' : nota ?? ''}
                      placeholder="0.0"
                      onChange={e => atualizarSaeb(ano, e.target.value)}
                      disabled={!podeEditar}
                      className="flex-1"
                    />
                    {podeEditar && (
                      <button type="button" onClick={() => removerSaeb(ano)} className="text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {Object.keys(config.saeb_historico ?? {}).length === 0 && (
                <p className="col-span-full text-xs text-slate-400 italic text-center py-4">
                  Nenhum histórico cadastrado. Clique em "Adicionar Ano" para incluir.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Financeiro */}
        <Card>
          <CardHeader titulo="Parâmetros Financeiros" descricao="Orçamento anual e regras de aprovação" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Wallet size={18} className="text-blue-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-900 mb-1">ORÇAMENTO PREVISTO ANUAL</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">R$</span>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={config.orcamento_previsto ?? 0}
                    onChange={e => atualizar('orcamento_previsto', Number(e.target.value))}
                    disabled={!podeEditar}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-amber-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-900 mb-1">LIMITE PARA COMPROVANTE OBRIGATÓRIO</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">R$</span>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={config.limite_comprovante ?? 500}
                    onChange={e => atualizar('limite_comprovante', Number(e.target.value))}
                    disabled={!podeEditar}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle size={18} className="text-emerald-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-emerald-900 mb-1">ALERTA PDDE</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={config.pdde_alerta_dias ?? 15}
                    onChange={e => atualizar('pdde_alerta_dias', Number(e.target.value))}
                    disabled={!podeEditar}
                    className="w-20"
                  />
                  <span className="text-sm font-medium text-slate-600">dias antes</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Pesos das Avaliações */}
        <Card>
          <CardHeader titulo="Pesos das Avaliações" descricao="Usados no cálculo da média bimestral" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'prova', label: 'Prova', cor: 'rose' },
              { key: 'trabalho', label: 'Trabalho', cor: 'blue' },
              { key: 'participacao', label: 'Participação', cor: 'emerald' },
            ].map(({ key, label, cor }) => (
              <div key={key} className={`bg-${cor}-50/50 rounded-xl p-3 border border-${cor}-100`}>
                <p className={`text-xs font-semibold text-${cor}-900 mb-2`}>{label.toUpperCase()}</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    value={config.regras_nota?.[key] ?? 0}
                    onChange={e => atualizar('regras_nota', { ...(config.regras_nota ?? {}), [key]: Number(e.target.value) })}
                    disabled={!podeEditar}
                    className="flex-1"
                  />
                  <span className="text-xs text-slate-500">peso</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5">
            <p className="text-xs text-slate-500 italic">
              Soma atual: {Object.values(config.regras_nota ?? {}).reduce((a, b) => a + Number(b), 0).toFixed(2)} (recomenda-se totalizar 1.0)
            </p>
          </div>
        </Card>

        {podeEditar && (
          <div className="flex justify-end">
            <Button variante="accent" icon={Save} loading={salvando} type="submit" tamanho="lg">
              Salvar Configurações
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
