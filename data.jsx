/* ============================================================
   data.jsx — ícones, dados de exemplo e helpers
   ============================================================ */

/* ---------- Icon set (inline, line style) ---------- */
const ICON_PATHS = {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  kanban: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/>',
  list: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  briefcase: '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  dollar: '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  mapPin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  layersGroup: '<path d="M5 7 3 5"/><path d="M9 6V3"/><path d="m13 7 2-2"/><circle cx="9" cy="13" r="3"/><path d="m11.83 11.17 1.94-1.91"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
};

function Icon({ name, size = 20, strokeWidth = 2, className, style }) {
  const p = ICON_PATHS[name] || '';
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
    className, style, 'aria-hidden': true,
    dangerouslySetInnerHTML: { __html: p },
  });
}

/* ---------- Domain config ---------- */
const STAGES = [
  { key: 'prospeccao', label: 'Prospecções / Renovações', color: 'var(--stage-prospeccao)' },
  { key: 'contato',    label: 'Contato feito',            color: 'var(--stage-contato)' },
  { key: 'negociacao', label: 'Em negociação',            color: 'var(--stage-negociacao)' },
  { key: 'arquivado',  label: 'Negócios arquivados',      color: 'var(--stage-arquivado)' },
];
const STAGE_LABEL = Object.fromEntries(STAGES.map(s => [s.key, s.label]));

const TIPOS = ['Seguro novo', 'Renovação com alteração', 'Renovação simples', 'Endosso'];
const TIPO_COLOR = {
  'Seguro novo': '#2563eb',
  'Renovação com alteração': '#0891b2',
  'Renovação simples': '#0d9488',
  'Endosso': '#9333ea',
};

const RAMOS = ['Automóvel', 'Vida Individual', 'Residencial', 'Resp. Civil Profissional', 'Empresarial', 'Saúde'];
const RAMO_COLOR = {
  'Automóvel': '#2563eb',
  'Vida Individual': '#e11d48',
  'Residencial': '#059669',
  'Resp. Civil Profissional': '#7c3aed',
  'Empresarial': '#d97706',
  'Saúde': '#0891b2',
};

const VENDEDORES = ['Mitzrael Tassinari', 'Ana Beatriz Lemos', 'Carlos Eduardo Pires', 'Juliana Reis'];
const SEGURADORAS = ['Porto Seguro', 'Bradesco Seguros', 'SulAmérica', 'Allianz', 'Tokio Marine', 'Mapfre'];
const ORIGENS = ['Indicação', 'Prospecção ativa', 'Campanha', 'Renovação', 'Site', 'Redes sociais'];
const PROFISSOES_OPC = ['Administrador', 'Empresário(a)', 'Médico(a)', 'Advogado(a)', 'Engenheiro(a)', 'Autônomo(a)', 'Servidor(a) público', 'Comerciante', 'Professor(a)'];
const GRUPOS_PRODUCAO = ['Produção própria', 'Grupo Sul', 'Grupo Capital', 'Parceria corretora'];
const EMPRESAS = ['Santolin Consultoria'];

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#db2777', '#ca8a04', '#0d9488', '#dc2626'];

/* ---------- Sample data ---------- */
let _id = 100;
const nid = () => 'd' + (++_id);
function slugMail(name) {
  return (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '').trim().split(/\s+/).slice(0, 2).join('.') + '@email.com';
}
function pick(arr, seed) { let h = 0; for (let i = 0; i < (seed || '').length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0; return arr[h % arr.length]; }
function mk(o) {
  const d = {
    telefone: '(48) 9 ' + Math.floor(8000 + Math.random() * 1999) + '-' + Math.floor(1000 + Math.random() * 8999),
    indicacao: false, ...o,
  };
  d.id = nid();
  d.email = d.email || slugMail(d.lead);
  d.profissoes = d.profissoes || [pick(PROFISSOES_OPC, d.lead)];
  d.dataCadastro = d.dataCadastro || d.criadoEm || '';
  d.origem = d.origem || (d.indicacao ? 'Indicação' : pick(ORIGENS, d.lead + d.tipo));
  d.grupo = d.grupo || pick(GRUPOS_PRODUCAO, d.lead);
  d.empresa = d.empresa || 'Santolin Consultoria';
  return d;
}

const SEED_DEALS = [
  mk({ lead: 'Mitzrael Tassinari', tipo: 'Seguro novo', ramo: 'Empresarial', valor: 15000, vendedor: 'Mitzrael Tassinari', dias: 4, stage: 'prospeccao', seguradora: 'Porto Seguro', criadoEm: '02/06/2026' }),
  mk({ lead: 'Marcos Antônio Vieira', tipo: 'Renovação com alteração', ramo: 'Automóvel', valor: 1500, vendedor: 'Ana Beatriz Lemos', dias: 2, stage: 'prospeccao', seguradora: 'Bradesco Seguros', criadoEm: '04/06/2026' }),
  mk({ lead: 'Construtora Horizonte', tipo: 'Seguro novo', ramo: 'Empresarial', valor: 8200, vendedor: 'Carlos Eduardo Pires', dias: 9, stage: 'prospeccao', seguradora: 'Allianz', criadoEm: '28/05/2026', indicacao: true }),
  mk({ lead: 'Patrícia Gomes', tipo: 'Renovação simples', ramo: 'Residencial', valor: 980, vendedor: 'Juliana Reis', dias: 1, stage: 'prospeccao', seguradora: 'SulAmérica', criadoEm: '05/06/2026' }),

  mk({ lead: 'Rafael Monteiro', tipo: 'Seguro novo', ramo: 'Automóvel', valor: 3200, vendedor: 'Ana Beatriz Lemos', dias: 6, stage: 'contato', seguradora: 'Tokio Marine', criadoEm: '01/06/2026' }),
  mk({ lead: 'Clínica Bem Viver', tipo: 'Seguro novo', ramo: 'Saúde', valor: 12400, vendedor: 'Carlos Eduardo Pires', dias: 14, stage: 'contato', seguradora: 'SulAmérica', criadoEm: '24/05/2026', indicacao: true }),
  mk({ lead: 'Fernanda Lopes', tipo: 'Renovação com alteração', ramo: 'Vida Individual', valor: 2100, vendedor: 'Juliana Reis', dias: 3, stage: 'contato', seguradora: 'Bradesco Seguros', criadoEm: '03/06/2026' }),

  mk({ lead: 'André Carvalho', tipo: 'Seguro novo', ramo: 'Automóvel', valor: 4800, vendedor: 'Mitzrael Tassinari', dias: 21, stage: 'negociacao', seguradora: 'Porto Seguro', criadoEm: '17/05/2026' }),
  mk({ lead: 'Studio Arquitetura M&V', tipo: 'Seguro novo', ramo: 'Resp. Civil Profissional', valor: 6700, vendedor: 'Ana Beatriz Lemos', dias: 11, stage: 'negociacao', seguradora: 'Mapfre', criadoEm: '27/05/2026', indicacao: true }),

  mk({ lead: 'Lucas Pereira', tipo: 'Endosso', ramo: 'Residencial', valor: 760, vendedor: 'Juliana Reis', dias: 38, stage: 'arquivado', seguradora: 'Allianz', criadoEm: '01/05/2026' }),

  /* closed — aparecem só na lista */
  mk({ lead: 'Sandro Almeida', tipo: 'Seguro novo', ramo: 'Resp. Civil Profissional', valor: 1500, vendedor: 'Mitzrael Tassinari', dias: 0, stage: 'fechado', seguradora: 'Mapfre', criadoEm: '12/09/2024', fechadoEm: '27/01/2025' }),
  mk({ lead: 'Conceição M. R. Carrão', tipo: 'Renovação com alteração', ramo: 'Automóvel', valor: 1500, vendedor: 'Ana Beatriz Lemos', dias: 0, stage: 'fechado', seguradora: 'Porto Seguro', criadoEm: '18/04/2024', fechadoEm: '10/05/2024' }),
  mk({ lead: 'Áureo Duarte Carrão', tipo: 'Endosso', ramo: 'Automóvel', valor: 1000, vendedor: 'Carlos Eduardo Pires', dias: 0, stage: 'fechado', seguradora: 'Bradesco Seguros', criadoEm: '18/04/2024', fechadoEm: '10/05/2024' }),
  mk({ lead: 'Andrea Souto Silva', tipo: 'Seguro novo', ramo: 'Resp. Civil Profissional', valor: 1500, vendedor: 'Juliana Reis', dias: 0, stage: 'fechado', seguradora: 'SulAmérica', criadoEm: '06/05/2024', fechadoEm: '13/05/2024' }),
  mk({ lead: 'Mitzrael Tassinari', tipo: 'Endosso', ramo: 'Vida Individual', valor: 1000, vendedor: 'Mitzrael Tassinari', dias: 0, stage: 'fechado', seguradora: 'Tokio Marine', criadoEm: '13/05/2024', fechadoEm: '13/05/2024' }),
  mk({ lead: 'Mitzrael Tassinari', tipo: 'Endosso', ramo: 'Residencial', valor: 1500, vendedor: 'Mitzrael Tassinari', dias: 0, stage: 'fechado', seguradora: 'Allianz', criadoEm: '13/05/2024', fechadoEm: '13/05/2024' }),
];

/* ---------- helpers ---------- */
const formatBRL = (n) => 'R$' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatBRLshort = (n) => {
  n = Number(n || 0);
  if (n >= 1000) return 'R$' + (n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: n % 1000 === 0 ? 0 : 1, maximumFractionDigits: 1 }) + ' mil';
  return formatBRL(n);
};
function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
function avatarColor(name) {
  let h = 0; for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function daysClass(d) { return d >= 30 ? 'cold' : d >= 14 ? 'warn' : ''; }
function daysLabel(d) { return d === 0 ? 'hoje' : d === 1 ? '1 dia' : d + ' dias'; }

Object.assign(window, {
  Icon, STAGES, STAGE_LABEL, TIPOS, TIPO_COLOR, RAMOS, RAMO_COLOR,
  VENDEDORES, SEGURADORAS, ORIGENS, PROFISSOES_OPC, GRUPOS_PRODUCAO, EMPRESAS,
  SEED_DEALS, formatBRL, formatBRLshort,
  initials, avatarColor, daysClass, daysLabel, nid,
});
