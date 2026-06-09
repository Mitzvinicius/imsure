/* ============================================================
   components.jsx — Sidebar, TopBar, átomos
   ============================================================ */
const { useState, useEffect, useRef } = React;

/* ---------- atoms ---------- */
function Avatar({ name, lg }) {
  return (
    <span className={'avatar' + (lg ? ' lg' : '')} style={{ background: avatarColor(name) }} title={name}>
      {initials(name)}
    </span>
  );
}

function Tipo({ value }) {
  return (
    <span className="tipo">
      <span className="pt" style={{ '--tipo-c': TIPO_COLOR[value] || 'var(--text-faint)' }}></span>
      {value}
    </span>
  );
}

function RamoTag({ value }) {
  return <span className="tag" style={{ '--tag-c': RAMO_COLOR[value] || 'var(--text-muted)' }}>{value}</span>;
}

function StagePill({ stage }) {
  if (stage === 'fechado') {
    return <span className="stage-pill" style={{ '--stage-c': 'var(--good)' }}><span className="d"></span>Fechado</span>;
  }
  const s = STAGES.find(x => x.key === stage);
  return <span className="stage-pill" style={{ '--stage-c': s ? s.color : 'var(--text-muted)' }}><span className="d"></span>{s ? s.label : stage}</span>;
}

/* ---------- Sidebar ---------- */
const NAV = [
  { icon: 'users', label: 'Cadastros' },
  { icon: 'userPlus', label: 'Indicações' },
  { icon: 'refresh', label: 'Renovações' },
  { icon: 'pencil', label: 'Cotações' },
  { icon: 'briefcase', label: 'Negócios', active: true },
  { icon: 'fileText', label: 'Emissão' },
  { icon: 'flame', label: 'Sinistro' },
  { sep: true },
  { icon: 'user', label: 'Perfil' },
  { icon: 'clipboard', label: 'Formulários' },
  { icon: 'book', label: 'Biblioteca' },
];

function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
      <div className="sb-top">
        <div className="sb-logo">
          <span className="cloud"><Icon name="cloud" size={26} strokeWidth={2.2} /></span>
          <span className="wordmark">imsure</span>
        </div>
        {!collapsed && (
          <button className="sb-collapse" onClick={onToggle} title="Recolher menu">
            <Icon name="chevronLeft" size={18} />
          </button>
        )}
      </div>
      {collapsed && (
        <button className="sb-collapse" onClick={onToggle} title="Expandir menu" style={{ margin: '0 auto 6px' }}>
          <Icon name="chevronLeft" size={18} />
        </button>
      )}

      <div className="sb-company">
        <p className="sb-company-label">Selecionar empresa</p>
        <button className="sb-company-select">
          <span className="b-icon"><Icon name="building" size={17} /></span>
          <span className="name">Santolin Consultoria</span>
          <span className="chev"><Icon name="chevronDown" size={16} /></span>
        </button>
      </div>

      <nav className="sb-nav">
        {NAV.map((it, i) => it.sep
          ? <div key={i} className="sb-sep"></div>
          : (
            <a key={i} className={'sb-item' + (it.active ? ' active' : '')} href="#" onClick={e => e.preventDefault()} title={it.label}>
              <span className="ic"><Icon name={it.icon} size={20} /></span>
              <span className="label">{it.label}</span>
            </a>
          )
        )}
      </nav>

      <div style={{ padding: '8px 12px 16px' }}>
        <a className="sb-item" href="#" onClick={e => e.preventDefault()} title="Sair">
          <span className="ic"><Icon name="logout" size={20} /></span>
          <span className="label">Sair</span>
        </a>
      </div>
    </aside>
  );
}

/* ---------- Theme toggle ---------- */
function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="icon-btn" onClick={onToggle} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
    </button>
  );
}

/* ---------- TopBar ---------- */
function TopBar({
  view, onView, vendedorQuery, onVendedorQuery,
  onNewDeal, onToggleFilter, filterOpen, activeFilterCount,
  theme, onToggleTheme, filterRef, totalPipeline,
  filters, onFilterChange, onFilterClear,
}) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>Negócios</h1>
        <span className="sub">{formatBRL(totalPipeline)} em pipeline ativo</span>
      </div>

      <button className="btn btn-primary" onClick={onNewDeal}>
        <Icon name="plus" size={18} strokeWidth={2.4} /> Criar negócio
      </button>

      <div className="segmented" role="tablist" aria-label="Visualização">
        <button className={view === 'kanban' ? 'active' : ''} onClick={() => onView('kanban')}>
          <Icon name="kanban" size={17} /> Kanban
        </button>
        <button className={view === 'lista' ? 'active' : ''} onClick={() => onView('lista')}>
          <Icon name="list" size={17} /> Lista
        </button>
      </div>

      <div className="topbar-spacer"></div>

      <div className="search">
        <Icon name="search" size={17} />
        <input
          placeholder="Filtrar por vendedor"
          value={vendedorQuery}
          onChange={e => onVendedorQuery(e.target.value)}
        />
      </div>

      <div className="filter-wrap" ref={filterRef}>
        <button className={'icon-btn' + (filterOpen || activeFilterCount ? ' on' : '')} onClick={onToggleFilter} title="Filtros">
          <Icon name="filter" size={18} />
          {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
        </button>
        {filterOpen && (
          <FilterPanel
            filters={filters}
            onChange={onFilterChange}
            onClear={onFilterClear}
            appliedCount={activeFilterCount}
          />
        )}
      </div>

      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}

Object.assign(window, { Avatar, Tipo, RamoTag, StagePill, Sidebar, TopBar, ThemeToggle });
