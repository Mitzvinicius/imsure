/* ============================================================
   app.jsx — estado, filtros, montagem
   ============================================================ */
const { useState: useS, useEffect: useE, useRef: useR } = React;

function App() {
  const [deals, setDeals] = useS(SEED_DEALS);
  const [view, setView] = useS('kanban');
  const [theme, setTheme] = useS(() => localStorage.getItem('imsure-theme') || 'light');
  const [collapsed, setCollapsed] = useS(false);
  const [vendedorQuery, setVendedorQuery] = useS('');
  const [modalOpen, setModalOpen] = useS(false);
  const [filterOpen, setFilterOpen] = useS(false);
  const [filters, setFilters] = useS({ cliente: '', tipo: '', ramo: '', seguradora: '', criadoDe: '', validade: '' });
  const [selectedId, setSelectedId] = useS(null);
  const filterRef = useR(null);

  useE(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('imsure-theme', theme); }, [theme]);

  // close filter popover on outside click
  useE(() => {
    if (!filterOpen) return;
    const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [filterOpen]);

  // ESC closes modal/popover
  useE(() => {
    const h = (e) => { if (e.key === 'Escape') { setModalOpen(false); setFilterOpen(false); setSelectedId(null); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filtered = deals.filter(d => {
    if (vendedorQuery && !norm(d.vendedor).includes(norm(vendedorQuery))) return false;
    if (filters.cliente && !norm(d.lead).includes(norm(filters.cliente))) return false;
    if (filters.tipo && d.tipo !== filters.tipo) return false;
    if (filters.ramo && d.ramo !== filters.ramo) return false;
    if (filters.seguradora && d.seguradora !== filters.seguradora) return false;
    return true;
  });

  // kanban shows only the 4 funnel stages; list shows everything (incl. fechado)
  const kanbanDeals = filtered.filter(d => d.stage !== 'fechado');
  const totalPipeline = deals.filter(d => d.stage !== 'fechado' && d.stage !== 'arquivado').reduce((s, d) => s + Number(d.valor || 0), 0);

  function moveDeal(id, stage) {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage } : d));
  }
  function createDeal(deal) {
    // map label -> stage key
    const stageKey = (STAGES.find(s => s.label === deal.stage) || {}).key || 'prospeccao';
    setDeals(prev => [{ ...deal, stage: stageKey }, ...prev]);
    setModalOpen(false);
  }

  function saveDeal(updated) {
    setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelectedId(null);
  }
  function deleteDeal(id) {
    setDeals(prev => prev.filter(d => d.id !== id));
    setSelectedId(null);
  }

  const selectedDeal = deals.find(d => d.id === selectedId) || null;

  return (
    <div className="app">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="main">
        {selectedDeal ? (
          <DealDetail
            deal={selectedDeal}
            onClose={() => setSelectedId(null)}
            onSave={saveDeal}
            onDelete={deleteDeal}
          />
        ) : (
        <React.Fragment>
        <TopBar
          view={view} onView={setView}
          vendedorQuery={vendedorQuery} onVendedorQuery={setVendedorQuery}
          onNewDeal={() => setModalOpen(true)}
          onToggleFilter={() => setFilterOpen(o => !o)} filterOpen={filterOpen}
          activeFilterCount={activeFilterCount}
          theme={theme} onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          filterRef={filterRef}
          totalPipeline={totalPipeline}
          filters={filters}
          onFilterChange={setFilters}
          onFilterClear={() => setFilters({ cliente: '', tipo: '', ramo: '', seguradora: '', criadoDe: '', validade: '' })}
        />

        {view === 'kanban'
          ? <KanbanView deals={kanbanDeals} onMove={moveDeal} onOpen={d => setSelectedId(d.id)} />
          : <ListView deals={filtered} onOpen={d => setSelectedId(d.id)} />
        }
        </React.Fragment>
        )}
      </div>

      {modalOpen && <NewDealModal onClose={() => setModalOpen(false)} onCreate={createDeal} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
