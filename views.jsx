/* ============================================================
   views.jsx — Kanban (drag&drop), Lista, Modal, Filtros
   ============================================================ */
const { useState: useStateV, useRef: useRefV } = React;

/* ---------- Deal card ---------- */
function DealCard({ deal, stageColor, dragging, onDragStart, onDragEnd, onOpen }) {
  return (
    <article
      className={'card' + (dragging ? ' dragging' : '')}
      style={{ '--stage-c': stageColor }}
      draggable
      onDragStart={e => onDragStart(e, deal)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen && onOpen(deal)}
    >
      <div className="card-top">
        <span className="card-lead">{deal.lead}</span>
        <span className="card-value">{formatBRL(deal.valor)}</span>
      </div>
      <div className="card-meta">
        <Tipo value={deal.tipo} />
        <RamoTag value={deal.ramo} />
        {deal.indicacao && (
          <span className="tag" style={{ '--tag-c': 'var(--accent-ink)' }}>Indicação</span>
        )}
      </div>
      <div className="card-foot">
        <div className="card-vendor">
          <Avatar name={deal.vendedor} />
          <span className="vn">{deal.vendedor}</span>
        </div>
        <span className={'days ' + daysClass(deal.dias)}>
          <Icon name="clock" size={13} /> {daysLabel(deal.dias)}
        </span>
      </div>
    </article>
  );
}

/* ---------- Kanban column ---------- */
function KanbanColumn({ stage, deals, draggingId, dropTarget, handlers, onOpen }) {
  const total = deals.reduce((s, d) => s + Number(d.valor || 0), 0);
  const isTarget = dropTarget === stage.key;
  return (
    <section
      className={'column' + (isTarget ? ' drop-target' : '')}
      style={{ '--stage-c': stage.color }}
      onDragOver={e => handlers.onDragOver(e, stage.key)}
      onDragLeave={handlers.onDragLeave}
      onDrop={e => handlers.onDrop(e, stage.key)}
    >
      <div className="col-head">
        <div className="col-head-top">
          <span className="col-dot"></span>
          <span className="col-title">{stage.label}</span>
          <span className="col-count">{deals.length}</span>
        </div>
        <div className="col-total">
          <span className="v">{formatBRL(total)}</span>
          <span className="l">em prêmio total</span>
        </div>
      </div>
      <div className="col-body scroll-y">
        {deals.map(d => (
          <DealCard
            key={d.id}
            deal={d}
            stageColor={stage.color}
            dragging={draggingId === d.id}
            onDragStart={handlers.onDragStart}
            onDragEnd={handlers.onDragEnd}
            onOpen={onOpen}
          />
        ))}
        {isTarget && draggingId && <div className="card placeholder" style={{ '--stage-c': stage.color }}></div>}
        {deals.length === 0 && !isTarget && (
          <div className="col-empty">Nenhum negócio aqui ainda</div>
        )}
      </div>
    </section>
  );
}

/* ---------- Kanban board ---------- */
function KanbanView({ deals, onMove, onOpen }) {
  const [draggingId, setDraggingId] = useStateV(null);
  const [dropTarget, setDropTarget] = useStateV(null);
  const dragId = useRefV(null);

  const handlers = {
    onDragStart(e, deal) {
      dragId.current = deal.id;
      setDraggingId(deal.id);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', deal.id); } catch (_) {}
    },
    onDragEnd() { dragId.current = null; setDraggingId(null); setDropTarget(null); },
    onDragOver(e, stageKey) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropTarget !== stageKey) setDropTarget(stageKey); },
    onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null); },
    onDrop(e, stageKey) {
      e.preventDefault();
      const id = dragId.current;
      if (id) onMove(id, stageKey);
      dragId.current = null; setDraggingId(null); setDropTarget(null);
    },
  };

  return (
    <div className="board-wrap">
      <div className="board scroll-x">
        {STAGES.map(stage => (
          <KanbanColumn
            key={stage.key}
            stage={stage}
            deals={deals.filter(d => d.stage === stage.key)}
            draggingId={draggingId}
            dropTarget={dropTarget}
            handlers={handlers}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- List view ---------- */
function ListView({ deals, onOpen }) {
  if (deals.length === 0) {
    return (
      <div className="list-wrap">
        <div className="empty-state"><div className="inner">
          <Icon name="inbox" size={48} />
          <p>Nenhum negócio encontrado com os filtros atuais</p>
        </div></div>
      </div>
    );
  }
  return (
    <div className="list-wrap scroll-y">
      <div className="table-card">
        <table className="deals">
          <thead>
            <tr>
              <th>Nome do lead</th>
              <th>Tipo de negócio</th>
              <th>Etapa</th>
              <th>Ramo</th>
              <th className="num">Valor</th>
              <th>Vendedor</th>
              <th>Criado em</th>
              <th>Fechado em</th>
            </tr>
          </thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id} onClick={() => onOpen && onOpen(d)} style={{ cursor: 'pointer' }}>
                <td><span className="lead-cell">{d.lead}</span></td>
                <td className="muted">{d.tipo}</td>
                <td><StagePill stage={d.stage} /></td>
                <td><RamoTag value={d.ramo} /></td>
                <td className="num" style={{ fontWeight: 700 }}>{formatBRL(d.valor)}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={d.vendedor} />
                    <span className="muted" style={{ fontWeight: 600 }}>{d.vendedor}</span>
                  </span>
                </td>
                <td className="muted">{d.criadoEm || '—'}</td>
                <td className="muted">{d.fechadoEm || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Field helpers ---------- */
function Field({ label, icon, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className={'input-wrap' + (icon ? ' has-ic' : '')}>
        {icon && <span className="lead-ic"><Icon name={icon} size={17} /></span>}
        {children}
      </div>
    </div>
  );
}
function SelectField({ label, icon, value, onChange, placeholder, options }) {
  return (
    <Field label={label} icon={icon}>
      <select className="input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="select-chev"><Icon name="chevronDown" size={16} /></span>
    </Field>
  );
}

/* ---------- New deal modal ---------- */
function NewDealModal({ onClose, onCreate }) {
  const [f, setF] = useStateV({
    lead: '', telefone: '', vendedor: '', indicacao: false,
    tipo: '', stage: '', ramo: '', valor: '',
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const valid = f.lead.trim() && f.tipo && f.stage && f.ramo;

  function parseValor(s) { const n = parseFloat(String(s).replace(/[^\d,]/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }

  function submit() {
    if (!valid) return;
    onCreate({
      id: nid(), lead: f.lead.trim(), telefone: f.telefone, vendedor: f.vendedor || VENDEDORES[0],
      indicacao: f.indicacao, tipo: f.tipo, stage: f.stage, ramo: f.ramo, valor: parseValor(f.valor),
      dias: 0, seguradora: '', criadoEm: new Date().toLocaleDateString('pt-BR'),
    });
  }

  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2><span className="ic"><Icon name="briefcase" size={20} /></span> Novo negócio</h2>
          <button className="modal-close" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="modal-body scroll-y">
          <div className="form-col">
            <p className="form-section-title">Detalhes do lead</p>
            <Field label="Pessoa em contato" icon="user">
              <input className="input" placeholder="Nome da pessoa" value={f.lead} onChange={e => set('lead', e.target.value)} autoFocus />
            </Field>
            <Field label="Telefone" icon="phone">
              <input className="input" placeholder="Telefone de contato" value={f.telefone} onChange={e => set('telefone', e.target.value)} />
            </Field>
            <SelectField label="Vendedor responsável" icon="user" value={f.vendedor} onChange={v => set('vendedor', v)} placeholder="Escolha o vendedor" options={VENDEDORES} />
            <div className="toggle-field">
              <span className="tf-label">Cliente é indicação</span>
              <button className={'switch' + (f.indicacao ? ' on' : '')} onClick={() => set('indicacao', !f.indicacao)} aria-pressed={f.indicacao}>
                <span className="knob"></span>
              </button>
            </div>
          </div>

          <div className="form-col">
            <p className="form-section-title">Detalhes do negócio</p>
            <SelectField label="Tipo" icon="layers" value={f.tipo} onChange={v => set('tipo', v)} placeholder="Escolha o tipo de seguro" options={TIPOS} />
            <SelectField label="Etapa" icon="filter" value={f.stage} onChange={v => set('stage', v)} placeholder="Escolha a etapa"
              options={STAGES.map(s => s.label)}
            />
            <SelectField label="Ramo" icon="tag" value={f.ramo} onChange={v => set('ramo', v)} placeholder="Ramo do seguro" options={RAMOS} />
            <Field label="Valor potencial" icon="dollar">
              <input className="input" placeholder="Ex: R$1.500,00" value={f.valor} onChange={e => set('valor', e.target.value)} inputMode="decimal" />
            </Field>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-subtle" onClick={onClose}>Fechar</button>
          <button className="btn btn-primary" disabled={!valid} style={{ opacity: valid ? 1 : .5, pointerEvents: valid ? 'auto' : 'none' }} onClick={submit}>
            <Icon name="plus" size={18} strokeWidth={2.4} /> Criar negócio
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Filter popover ---------- */
function FilterPanel({ filters, onChange, onClear, appliedCount }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });
  return (
    <div className="popover" onClick={e => e.stopPropagation()}>
      <div className="pop-head">
        <h3>Filtros avançados</h3>
        {appliedCount > 0 && <span className="pop-applied">{appliedCount} ativo{appliedCount > 1 ? 's' : ''}</span>}
      </div>
      <div className="pop-grid">
        <div className="pop-field" style={{ gridColumn: 'span 1' }}>
          <label>Procurar clientes</label>
          <div className="input-wrap"><input className="input" placeholder="Nome do cliente" value={filters.cliente} onChange={e => set('cliente', e.target.value)} /></div>
        </div>
        <div className="pop-field">
          <label>Tipo de seguro</label>
          <div className="input-wrap">
            <select className="input" value={filters.tipo} onChange={e => set('tipo', e.target.value)}>
              <option value="">Todos os tipos</option>
              {TIPOS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <span className="select-chev"><Icon name="chevronDown" size={15} /></span>
          </div>
        </div>
        <div className="pop-field">
          <label>Ramo</label>
          <div className="input-wrap">
            <select className="input" value={filters.ramo} onChange={e => set('ramo', e.target.value)}>
              <option value="">Todos os ramos</option>
              {RAMOS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <span className="select-chev"><Icon name="chevronDown" size={15} /></span>
          </div>
        </div>
        <div className="pop-field">
          <label>Seguradora</label>
          <div className="input-wrap">
            <select className="input" value={filters.seguradora} onChange={e => set('seguradora', e.target.value)}>
              <option value="">Todas</option>
              {SEGURADORAS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <span className="select-chev"><Icon name="chevronDown" size={15} /></span>
          </div>
        </div>
        <div className="pop-field">
          <label>Criados a partir de</label>
          <div className="input-wrap"><input className="input" type="date" value={filters.criadoDe} onChange={e => set('criadoDe', e.target.value)} /></div>
        </div>
        <div className="pop-field">
          <label>Cotação válida até</label>
          <div className="input-wrap"><input className="input" type="date" value={filters.validade} onChange={e => set('validade', e.target.value)} /></div>
        </div>
      </div>
      <div className="pop-foot">
        <button className="btn btn-subtle" onClick={onClear}>Limpar filtros</button>
        <span className="pop-applied">Filtros aplicados em tempo real</span>
      </div>
    </div>
  );
}

Object.assign(window, { DealCard, KanbanColumn, KanbanView, ListView, NewDealModal, FilterPanel });
