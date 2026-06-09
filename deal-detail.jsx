/* ============================================================
   deal-detail.jsx — tela de detalhes do negócio
   ============================================================ */
const { useState: useSD, useRef: useRD } = React;

function ProfissaoEditor({ values, onChange }) {
  const [adding, setAdding] = useSD(false);
  const [draft, setDraft] = useSD('');
  const inputRef = useRD(null);

  function add(v) {
    const val = (v || '').trim();
    if (val && !values.includes(val)) onChange([...values, val]);
    setDraft(''); setAdding(false);
  }
  function remove(v) { onChange(values.filter(x => x !== v)); }

  return (
    <div className="prof-wrap">
      <span className="lead-ic" style={{ position: 'absolute', left: 12, top: 12 }}><Icon name="briefcase" size={17} /></span>
      <div className="chips">
        {values.map(v => (
          <span className="chip" key={v}>
            <button className="chip-x" onClick={() => remove(v)} title="Remover"><Icon name="x" size={12} /></button>
            {v}
          </span>
        ))}
        {adding ? (
          <select
            ref={inputRef}
            className="chip-add-select"
            value=""
            onChange={e => add(e.target.value)}
            onBlur={() => setAdding(false)}
            autoFocus
          >
            <option value="">Selecionar…</option>
            {PROFISSOES_OPC.filter(p => !values.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        ) : (
          <button className="chip-add" onClick={() => setAdding(true)} title="Adicionar profissão"><Icon name="plus" size={15} /></button>
        )}
      </div>
    </div>
  );
}

function DealDetail({ deal, onClose, onSave, onDelete }) {
  const [f, setF] = useSD(() => ({
    lead: deal.lead || '', email: deal.email || '', telefone: deal.telefone || '',
    profissoes: deal.profissoes || [], dataCadastro: deal.dataCadastro || '',
    tipo: deal.tipo || '', stage: deal.stage || '', ramo: deal.ramo || '',
    seguradora: deal.seguradora || '', premio: deal.valor ? formatBRL(deal.valor) : '',
    fechadoEm: deal.fechadoEm || '', vendedor: deal.vendedor || '',
    origem: deal.origem || '', grupo: deal.grupo || '', empresa: deal.empresa || 'Santolin Consultoria',
    indicacao: !!deal.indicacao,
  }));
  const [anexosOpen, setAnexosOpen] = useSD(false);
  const [dirty, setDirty] = useSD(false);
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setDirty(true); };

  function parseValor(s) { const n = parseFloat(String(s).replace(/[^\d,]/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }

  function save() {
    const stageKey = (STAGES.find(s => s.label === f.stage) || STAGES.find(s => s.key === f.stage) || {}).key || deal.stage;
    onSave({
      ...deal,
      lead: f.lead.trim() || deal.lead, email: f.email, telefone: f.telefone,
      profissoes: f.profissoes, dataCadastro: f.dataCadastro,
      tipo: f.tipo, stage: stageKey, ramo: f.ramo, seguradora: f.seguradora,
      valor: parseValor(f.premio), fechadoEm: f.fechadoEm, vendedor: f.vendedor,
      origem: f.origem, grupo: f.grupo, empresa: f.empresa,
    });
  }

  const stageLabelValue = STAGE_LABEL[f.stage] || f.stage;

  return (
    <div className="detail">
      {/* header */}
      <div className="detail-head">
        <div className="dh-left">
          <button className="btn btn-primary" onClick={onClose}>
            <Icon name="arrowLeft" size={17} strokeWidth={2.3} /> Voltar
          </button>
          <span className="dh-divider"></span>
          <Avatar name={f.lead} lg />
          <div className="dh-title">
            <span className="dh-name">{f.lead || 'Sem nome'}</span>
            <StagePill stage={f.stage} />
          </div>
        </div>
        <div className="dh-right">
          <div className="anexos-wrap">
            <button className={'btn btn-ghost' + (anexosOpen ? ' on' : '')} onClick={() => setAnexosOpen(o => !o)}>
              <Icon name="paperclip" size={17} /> Anexos
            </button>
            {anexosOpen && (
              <div className="popover anexos-pop" onClick={e => e.stopPropagation()}>
                <div className="pop-head"><h3>Anexos</h3></div>
                <div className="anexos-empty">
                  <Icon name="file" size={30} />
                  <p>Nenhum anexo neste negócio</p>
                </div>
                <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                  <Icon name="plus" size={16} /> Adicionar arquivo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="detail-body scroll-y">
        {/* person */}
        <div className="person-card">
          <h2 className="section-h">Informações da pessoa</h2>
          <div className="form-col">
            <Field label="Nome completo" icon="user">
              <input className="input" value={f.lead} onChange={e => set('lead', e.target.value)} />
            </Field>
            <Field label="E-mail" icon="mail">
              <input className="input" type="email" value={f.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Telefone principal" icon="phone">
              <input className="input" value={f.telefone} onChange={e => set('telefone', e.target.value)} />
            </Field>
            <div className="field">
              <label>Profissão do cliente</label>
              <ProfissaoEditor values={f.profissoes} onChange={v => set('profissoes', v)} />
            </div>
            <Field label="Data de cadastro" icon="calendar">
              <input className="input" value={f.dataCadastro} onChange={e => set('dataCadastro', e.target.value)} placeholder="dd/mm/aaaa" />
            </Field>
            <div className="toggle-field">
              <span className="tf-label">Cliente é indicação</span>
              <button className={'switch' + (f.indicacao ? ' on' : '')} onClick={() => set('indicacao', !f.indicacao)} aria-pressed={f.indicacao}>
                <span className="knob"></span>
              </button>
            </div>
          </div>
        </div>

        {/* business */}
        <div className="biz-card">
          <h2 className="section-h">Informações do negócio</h2>
          <div className="biz-grid">
            <SelectField label="Tipo de seguro" icon="layers" value={f.tipo} onChange={v => set('tipo', v)} placeholder="Escolha o tipo de seguro" options={TIPOS} />
            <SelectField label="Etapa do negócio" icon="filter" value={stageLabelValue} onChange={v => set('stage', v)} placeholder="Escolha a etapa" options={STAGES.map(s => s.label)} />
            <SelectField label="Ramo" icon="tag" value={f.ramo} onChange={v => set('ramo', v)} placeholder="Ramo do seguro" options={RAMOS} />
            <SelectField label="Seguradora" icon="layersGroup" value={f.seguradora} onChange={v => set('seguradora', v)} placeholder="Seguradora" options={SEGURADORAS} />
            <Field label="Prêmio bruto" icon="dollar">
              <input className="input" value={f.premio} onChange={e => set('premio', e.target.value)} placeholder="Ex: R$1.500,00" inputMode="decimal" />
            </Field>
            <Field label="Data de fechamento" icon="calendar">
              <input className="input" value={f.fechadoEm} onChange={e => set('fechadoEm', e.target.value)} placeholder="dd/mm/aaaa" />
            </Field>
            <SelectField label="Vendedor responsável" icon="user" value={f.vendedor} onChange={v => set('vendedor', v)} placeholder="Escolha o vendedor" options={VENDEDORES} />
            <SelectField label="Origem do cliente" icon="mapPin" value={f.origem} onChange={v => set('origem', v)} placeholder="Indicação, Prospecção ativa…" options={ORIGENS} />
            <SelectField label="Grupo de produção" icon="users" value={f.grupo} onChange={v => set('grupo', v)} placeholder="Defina o grupo" options={GRUPOS_PRODUCAO} />
            <SelectField label="Empresa" icon="building" value={f.empresa} onChange={v => set('empresa', v)} placeholder="Empresa" options={EMPRESAS} />
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="detail-foot">
        <button className="btn btn-danger" onClick={() => onDelete(deal.id)}>
          <Icon name="trash" size={17} /> Deletar negócio
        </button>
        <div className="df-right">
          {dirty && <span className="df-hint">Alterações não salvas</span>}
          <button className="btn btn-subtle" onClick={onClose}>Fechar</button>
          <button className="btn btn-primary" onClick={save}>
            <Icon name="save" size={17} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DealDetail, ProfissaoEditor });
