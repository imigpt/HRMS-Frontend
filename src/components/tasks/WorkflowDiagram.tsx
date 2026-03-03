/**
 * WorkflowDiagram — Editable Workflow Canvas
 * Jira-style interactive editor: drag nodes, draw transitions,
 * rename, recolor, delete. Persists to localStorage.
 */
import { useState, useRef, useCallback, useEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GitBranch, LayoutDashboard, List, Plus, Trash2, MousePointer2,
  ArrowRightLeft, RotateCcw, Users, ShieldCheck, User, Check, Save, X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WFNode {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  bg: string;
}

interface WFEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  roles: string[];
  control?: { x: number; y: number };
}

interface WorkflowData {
  nodes: WFNode[];
  edges: WFEdge[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Default data
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_NODES: WFNode[] = [
  { id: 'draft',            label: 'Draft',            x: 50,  y: 80,  w: 150, h: 46, color: '#6b7280', bg: '#1e2330' },
  { id: 'pending-approval', label: 'Pending Approval', x: 270, y: 80,  w: 190, h: 46, color: '#d97706', bg: '#2a2210' },
  { id: 'assigned',         label: 'Assigned',         x: 530, y: 80,  w: 148, h: 46, color: '#2563eb', bg: '#10182a' },
  { id: 'in-progress',      label: 'In Progress',      x: 750, y: 80,  w: 160, h: 46, color: '#7c3aed', bg: '#1a1028' },
  { id: 'rejected',         label: 'Rejected',         x: 50,  y: 290, w: 150, h: 46, color: '#dc2626', bg: '#2a1010' },
  { id: 'under-review',     label: 'Under Review',     x: 750, y: 290, w: 172, h: 46, color: '#db2777', bg: '#2a1020' },
  { id: 'completed',        label: 'Completed',        x: 530, y: 290, w: 148, h: 46, color: '#059669', bg: '#0f2318' },
  { id: 'closed',           label: 'Closed',           x: 530, y: 470, w: 148, h: 46, color: '#475569', bg: '#141b22' },
];

const DEFAULT_EDGES: WFEdge[] = [
  { id: 'e-submit',          from: 'draft',           to: 'pending-approval', label: 'Submit',            roles: ['employee', 'hr', 'admin'] },
  { id: 'e-approve',         from: 'pending-approval',to: 'assigned',         label: 'Approve',           roles: ['hr', 'admin'] },
  { id: 'e-reject',          from: 'pending-approval',to: 'rejected',         label: 'Reject',            roles: ['hr', 'admin'] },
  { id: 'e-start',           from: 'assigned',        to: 'in-progress',      label: 'Start',             roles: ['employee', 'hr', 'admin'] },
  { id: 'e-submit-review',   from: 'in-progress',     to: 'under-review',     label: 'Submit for Review', roles: ['employee', 'hr', 'admin'] },
  { id: 'e-approve-review',  from: 'under-review',    to: 'completed',        label: 'Approve Review',    roles: ['hr', 'admin'] },
  { id: 'e-send-back',       from: 'under-review',    to: 'in-progress',      label: 'Send Back',         roles: ['hr', 'admin'] },
  { id: 'e-close',           from: 'completed',       to: 'closed',           label: 'Close',             roles: ['hr', 'admin'] },
  { id: 'e-reopen-rejected', from: 'rejected',        to: 'draft',            label: 'Reopen',            roles: ['hr', 'admin'] },
  { id: 'e-reopen-closed',   from: 'closed',          to: 'draft',            label: 'Reopen',            roles: ['hr', 'admin'] },
];

const STORAGE_KEY = 'hrms-workflow-data';

function loadData(): WorkflowData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { nodes: DEFAULT_NODES, edges: DEFAULT_EDGES };
}
function saveData(d: WorkflowData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

// ─────────────────────────────────────────────────────────────────────────────
// Colour palette
// ─────────────────────────────────────────────────────────────────────────────

const NODE_COLORS = [
  { color: '#6b7280', bg: '#1e2330' },
  { color: '#d97706', bg: '#2a2210' },
  { color: '#2563eb', bg: '#10182a' },
  { color: '#7c3aed', bg: '#1a1028' },
  { color: '#dc2626', bg: '#2a1010' },
  { color: '#db2777', bg: '#2a1020' },
  { color: '#059669', bg: '#0f2318' },
  { color: '#0891b2', bg: '#0a1f26' },
  { color: '#475569', bg: '#141b22' },
  { color: '#ca8a04', bg: '#221e08' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Geometry
// ─────────────────────────────────────────────────────────────────────────────

function edgeColor(roles: string[]) {
  return roles.includes('employee') ? '#22c55e' : '#3b82f6';
}

function buildPath(a: WFNode, b: WFNode, offset = 0, control?: { x: number; y: number }) {
  const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2, by = b.y + b.h / 2;
  const dx = bx - ax, dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len, uy = dy / len;
  const scaleA = Math.min(a.w / 2 / (Math.abs(ux) || 1e-6), a.h / 2 / (Math.abs(uy) || 1e-6));
  const scaleB = Math.min(b.w / 2 / (Math.abs(ux) || 1e-6), b.h / 2 / (Math.abs(uy) || 1e-6));
  const ex = ax + ux * scaleA, ey = ay + uy * scaleA;
  const fx = bx - ux * scaleB, fy = by - uy * scaleB;
  let c1x: number, c1y: number;
  if (control) {
    c1x = control.x; c1y = control.y;
  } else {
    const mx = (ex + fx) / 2, my = (ey + fy) / 2;
    const px = -uy * offset * 38, py = ux * offset * 38;
    c1x = mx + px; c1y = my + py;
  }
  const d = `M ${ex.toFixed(1)} ${ey.toFixed(1)} Q ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${fx.toFixed(1)} ${fy.toFixed(1)}`;
  // Quadratic bezier midpoint for label (t=0.5)
  const lx = 0.25 * ex + 0.5 * c1x + 0.25 * fx;
  const ly = 0.25 * ey + 0.5 * c1y + 0.25 * fy;
  return { d, lx, ly, c1x, c1y };
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline rename input
// ─────────────────────────────────────────────────────────────────────────────

function InlineInput({ value, x, y, w, onDone, onCancel }: {
  value: string; x: number; y: number; w: number;
  onDone: (v: string) => void; onCancel: () => void;
}) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const commit = () => { if (v.trim()) onDone(v.trim()); else onCancel(); };
  return (
    <foreignObject x={x - 4} y={y - 4} width={w + 8} height={36}>
      <input
        ref={ref}
        // @ts-ignore
        xmlns="http://www.w3.org/1999/xhtml"
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel(); }}
        style={{
          width: '100%', height: 28, fontSize: 13, fontWeight: 600,
          background: '#1e293b', color: '#f1f5f9', border: '2px solid #7c3aed',
          borderRadius: 6, padding: '0 6px', outline: 'none',
        }}
      />
    </foreignObject>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Properties panel
// ─────────────────────────────────────────────────────────────────────────────

function PropsPanel({ selected, nodes, edges, onUpdateNode, onUpdateEdge, onDelete }: {
  selected: string | null;
  nodes: WFNode[];
  edges: WFEdge[];
  onUpdateNode: (id: string, c: Partial<WFNode>) => void;
  onUpdateEdge: (id: string, c: Partial<WFEdge>) => void;
  onDelete: () => void;
}) {
  const nd = nodes.find(n => n.id === selected);
  const ed = edges.find(e => e.id === selected);

  if (!selected || (!nd && !ed)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs text-center px-3 gap-2 select-none">
        <MousePointer2 className="h-6 w-6 opacity-30" />
        <p>Click a node or arrow to see its properties</p>
      </div>
    );
  }

  if (nd) return (
    <div className="p-3 space-y-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Node</p>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Label</label>
        <input className="w-full bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary"
          value={nd.label} onChange={e => onUpdateNode(nd.id, { label: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Color</label>
        <div className="grid grid-cols-5 gap-1.5">
          {NODE_COLORS.map(c => (
            <button key={c.color} onClick={() => onUpdateNode(nd.id, { color: c.color, bg: c.bg })}
              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${nd.color === c.color ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ background: c.color }} />
          ))}
        </div>
      </div>
      <Button variant="destructive" size="sm" className="w-full gap-1.5 mt-2" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" /> Delete Node
      </Button>
    </div>
  );

  if (ed) return (
    <div className="p-3 space-y-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Transition</p>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Label</label>
        <input className="w-full bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary"
          value={ed.label} onChange={e => onUpdateEdge(ed.id, { label: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Who can trigger</label>
        {['employee', 'hr', 'admin'].map(role => (
          <label key={role} className="flex items-center gap-2 cursor-pointer py-0.5">
            <input type="checkbox" className="accent-primary"
              checked={ed.roles.includes(role)}
              onChange={e => {
                const roles = e.target.checked ? [...ed.roles, role] : ed.roles.filter(r => r !== role);
                if (roles.length > 0) onUpdateEdge(ed.id, { roles });
              }} />
            <span className="capitalize text-xs text-foreground">{role}</span>
          </label>
        ))}
      </div>
      <Button variant="destructive" size="sm" className="w-full gap-1.5 mt-2" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" /> Delete Arrow
      </Button>
    </div>
  );

  return null;
}

function EdgeDialog({ openData, onClose, onConfirm }: {
  openData: null | { from: string; to: string; label: string; roles: string[] };
  onClose: () => void;
  onConfirm: (payload: { label: string; roles: string[] }) => void;
}) {
  const [label, setLabel] = useState(openData?.label || '');
  const [roles, setRoles] = useState<string[]>(openData?.roles || []);
  useEffect(() => { setLabel(openData?.label || ''); setRoles(openData?.roles || []); }, [openData]);
  if (!openData) return null;
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[420px]">
        <DialogHeader>
          <DialogTitle>New Transition</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs text-muted-foreground">Label</label>
            <input className="w-full bg-secondary border border-border rounded px-2 py-1 text-sm" value={label} onChange={e => setLabel(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Who can trigger</label>
            <div className="flex gap-3 mt-2">
              {['employee','hr','admin'].map(r => (
                <label key={r} className="flex items-center gap-2">
                  <input type="checkbox" checked={roles.includes(r)} onChange={e => setRoles(prev => e.target.checked ? [...prev, r] : prev.filter(x=>x!==r))} />
                  <span className="capitalize text-sm">{r}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onConfirm({ label: label || 'Transition', roles: roles.length ? roles : ['employee','hr','admin'] })}>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas editor
// ─────────────────────────────────────────────────────────────────────────────

let _nc = 200, _ec = 200;
type Mode = 'select' | 'addEdge';

function EditorCanvas() {
  const [data, setData] = useState<WorkflowData>(loadData);
  const [mode, setMode] = useState<Mode>('select');
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [edgeDialog, setEdgeDialog] = useState<null | { from: string; to: string; label: string; roles: string[] }>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [draggingControl, setDraggingControl] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { nodes, edges } = data;

  const update = useCallback((next: WorkflowData) => setData(next), []);

  const handleSave = () => { saveData(data); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  const handleReset = () => {
    if (!confirm('Reset to default workflow? This will discard your changes.')) return;
    const def = { nodes: DEFAULT_NODES, edges: DEFAULT_EDGES };
    setData(def); saveData(def); setSelected(null);
  };
  const handleAddNode = () => {
    const id = `node-${++_nc}`;
    const c = NODE_COLORS[_nc % NODE_COLORS.length];
    const newNode: WFNode = { id, label: 'New Status', x: 200 + Math.random()*300, y: 180 + Math.random()*120, w: 148, h: 46, color: c.color, bg: c.bg };
    update({ ...data, nodes: [...nodes, newNode] });
    setSelected(id); setMode('select');
    setTimeout(() => setEditing(id), 30);
  };

  const handleDelete = useCallback(() => {
    if (!selected) return;
    if (nodes.some(n => n.id === selected))
      update({ nodes: nodes.filter(n => n.id !== selected), edges: edges.filter(e => e.from !== selected && e.to !== selected) });
    else
      update({ ...data, edges: edges.filter(e => e.id !== selected) });
    setSelected(null);
  }, [selected, nodes, edges, data, update]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !editing) handleDelete();
      if (e.key === 'Escape') { setMode('select'); setPendingFrom(null); setSelected(null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selected, editing, handleDelete]);

  const svgPoint = (e: MouseEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM()!.inverse());
  };

  const handleNodeClick = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    if (editing) return;
    if (mode === 'addEdge') {
      if (!pendingFrom) { setPendingFrom(id); return; }
      if (pendingFrom !== id) {
        // Open dialog to collect label and allowed roles before creating edge
        setEdgeDialog({ from: pendingFrom, to: id, label: 'Transition', roles: ['employee', 'hr', 'admin'] });
      }
      setPendingFrom(null); setMode('select');
      return;
    }
    setSelected(id);
  };

  const handleNodeDblClick = (e: MouseEvent, id: string) => { e.stopPropagation(); setEditing(id); };

  const handleNodeMouseDown = (e: MouseEvent, id: string) => {
    if (mode !== 'select') return;
    e.stopPropagation();
    const p = svgPoint(e);
    const n = nodes.find(x => x.id === id)!;
    setDragging({ id, ox: p.x - n.x, oy: p.y - n.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggingControl) {
      const p = svgPoint(e);
      update({ ...data, edges: edges.map(ed => ed.id === draggingControl ? { ...ed, control: { x: p.x, y: p.y } } : ed) });
      return;
    }
    if (!dragging) return;
    const p = svgPoint(e);
    update({ ...data, nodes: nodes.map(n => n.id === dragging.id ? { ...n, x: Math.max(4, p.x - dragging.ox), y: Math.max(4, p.y - dragging.oy) } : n) });
  };

  const onUpdateNode = (id: string, c: Partial<WFNode>) => update({ ...data, nodes: nodes.map(n => n.id === id ? { ...n, ...c } : n) });
  const onUpdateEdge = (id: string, c: Partial<WFEdge>) => update({ ...data, edges: edges.map(e => e.id === id ? { ...e, ...c } : e) });

  const parallelOffset = (eid: string, a: string, b: string) => {
    const same = edges.filter(e => e.from === a && e.to === b);
    const idx = same.findIndex(e => e.id === eid);
    return idx - (same.length - 1) / 2;
  };

  return (
    <div className="flex gap-0 h-full overflow-hidden rounded-lg border border-border/50">
      {/* Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border/60 bg-card/60 shrink-0 flex-wrap">
          <button onClick={() => { setMode('select'); setPendingFrom(null); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${mode === 'select' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'}`}>
            <MousePointer2 className="h-3.5 w-3.5" /> Select
          </button>
          <button onClick={handleAddNode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-secondary text-muted-foreground transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Status
          </button>
          <button onClick={() => { setMode(mode === 'addEdge' ? 'select' : 'addEdge'); setPendingFrom(null); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${mode === 'addEdge' ? 'bg-violet-600 text-white' : 'hover:bg-secondary text-muted-foreground'}`}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {mode === 'addEdge' ? (pendingFrom ? 'Click target…' : 'Click source…') : 'Add Transition'}
          </button>
          <div className="h-4 w-px bg-border/60 mx-0.5" />
          <button onClick={handleDelete} disabled={!selected}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-destructive/20 text-muted-foreground disabled:opacity-30 transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-secondary text-muted-foreground transition-colors">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
              {saved ? <><Check className="h-3.5 w-3.5" /> Saved!</> : <><Save className="h-3.5 w-3.5" /> Save</>}
            </button>
          </div>
        </div>

        {/* Hint bar */}
        {mode === 'addEdge' && (
          <div className="text-xs text-center py-1.5 bg-violet-900/30 text-violet-300 shrink-0 border-b border-violet-700/40">
            {pendingFrom ? `From: "${nodes.find(n => n.id === pendingFrom)?.label}" — click the target node` : 'Click the source node to start drawing an arrow'}
            <button className="ml-3 underline opacity-70 hover:opacity-100" onClick={() => { setMode('select'); setPendingFrom(null); }}>Cancel</button>
          </div>
        )}

        {/* SVG */}
        <div className="flex-1 overflow-auto bg-[#0d1117]" style={{ cursor: mode === 'addEdge' ? 'crosshair' : dragging ? 'grabbing' : 'default' }}>
          <svg ref={svgRef} viewBox="0 0 980 580" width="980" height="580" className="min-w-full"
            onMouseMove={handleMouseMove} onMouseUp={() => { setDragging(null); setDraggingControl(null); }}
            onClick={() => { if (mode !== 'addEdge') setSelected(null); }}>
            <defs>
              {[['g','#22c55e'],['b','#3b82f6'],['v','#a855f7'],['y','#f59e0b']].map(([id, fill]) => (
                <marker key={id} id={`a-${id}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={fill} />
                </marker>
              ))}
            </defs>
            {/* grid */}
            <pattern id="dotgrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="#1a2332" />
            </pattern>
            <rect width="980" height="580" fill="url(#dotgrid)" />

            {/* Edges */}
            {edges.map(edge => {
              const a = nodes.find(n => n.id === edge.from);
              const b = nodes.find(n => n.id === edge.to);
              if (!a || !b) return null;
              const off = parallelOffset(edge.id, edge.from, edge.to);
              const { d, lx, ly, c1x, c1y } = buildPath(a, b, off, edge.control);
              const isSel = selected === edge.id;
              const color = isSel ? '#f59e0b' : edgeColor(edge.roles);
              const mk = isSel ? 'y' : edge.roles.includes('employee') ? 'g' : 'b';
              return (
                <g key={edge.id} onClick={e => { e.stopPropagation(); if (!editing) setSelected(edge.id); }} style={{ cursor: 'pointer' }}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
                  <path d={d} fill="none" stroke={color} strokeWidth={isSel ? 2.5 : 1.8}
                    strokeDasharray={edge.label.toLowerCase().includes('reopen') ? '7 3' : undefined}
                    markerEnd={`url(#a-${mk})`} />
                  <rect x={lx - 28} y={ly - 18} width={56} height={14} rx={3} fill="#0d1117cc" />
                  <text x={lx} y={ly - 8} textAnchor="middle" fontSize="9.5"
                    fontWeight={isSel ? '700' : '500'} fill={isSel ? '#f59e0b' : '#94a3b8'}>
                    {edge.label}
                  </text>
                  {/* draggable control handle shown when edge selected */}
                  {isSel && (
                    <g onMouseDown={e => { e.stopPropagation(); setDraggingControl(edge.id); }}>
                      <circle cx={c1x} cy={c1y} r={6} fill="#fff" stroke="#111827" strokeWidth={1.5} opacity={0.95} />
                      <circle cx={c1x} cy={c1y} r={3} fill="#6366f1" />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(n => {
              const isSel = selected === n.id;
              const isPendingSrc = pendingFrom === n.id;
              return (
                <g key={n.id}
                  onClick={e => handleNodeClick(e, n.id)}
                  onDoubleClick={e => handleNodeDblClick(e, n.id)}
                  onMouseDown={e => handleNodeMouseDown(e, n.id)}
                  style={{ cursor: mode === 'addEdge' ? 'crosshair' : dragging?.id === n.id ? 'grabbing' : 'grab' }}>
                  {(isSel || isPendingSrc) && (
                    <rect x={n.x - 5} y={n.y - 5} width={n.w + 10} height={n.h + 10} rx={12}
                      fill="none" stroke={isPendingSrc ? '#a855f7' : '#f59e0b'} strokeWidth={2} strokeDasharray="5 3" />
                  )}
                  <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8}
                    fill={n.bg} stroke={n.color} strokeWidth={isSel ? 2.5 : 1.5}
                    style={{ filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.6))' }} />
                  {editing === n.id ? (
                    <InlineInput value={n.label} x={n.x + 6} y={n.y + 9} w={n.w - 12}
                      onDone={v => { onUpdateNode(n.id, { label: v }); setEditing(null); }}
                      onCancel={() => setEditing(null)} />
                  ) : (
                    <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 5} textAnchor="middle"
                      fontSize="13" fontWeight="600" fill={n.color}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}>
                      {n.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Legend */}
            <g transform="translate(12,548)">
              <line x1="0" y1="7" x2="22" y2="7" stroke="#22c55e" strokeWidth="2" markerEnd="url(#a-g)" />
              <text x="26" y="11" fontSize="9" fill="#64748b">All roles</text>
              <line x1="74" y1="7" x2="96" y2="7" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#a-b)" />
              <text x="100" y="11" fontSize="9" fill="#64748b">HR / Admin</text>
              <line x1="158" y1="7" x2="180" y2="7" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#a-b)" />
              <text x="184" y="11" fontSize="9" fill="#64748b">Reopen</text>
              <text x="235" y="11" fontSize="9" fill="#334155" fontStyle="italic">Double-click node to rename • Drag to move • Del key to delete</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Properties panel */}
      <div className="w-52 shrink-0 border-l border-border/60 bg-card/80 flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-border/60 shrink-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Properties</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PropsPanel selected={selected} nodes={nodes} edges={edges}
            onUpdateNode={onUpdateNode} onUpdateEdge={onUpdateEdge} onDelete={handleDelete} />
        </div>
      </div>
      {/* Edge creation dialog */}
      {edgeDialog && (
        <EdgeDialog openData={edgeDialog} onClose={() => setEdgeDialog(null)} onConfirm={({ label, roles }) => {
          const eid = `e-${++_ec}`;
          const next = { ...data, edges: [...edges, { id: eid, from: edgeDialog.from, to: edgeDialog.to, label, roles }] };
          update(next);
          saveData(next);
          setSelected(eid);
          setEdgeDialog(null);
        }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Text view
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_PILL_COLORS: Record<string, string> = {
  'draft':             'bg-slate-700/50 text-slate-300 border border-slate-600',
  'pending-approval':  'bg-amber-900/40 text-amber-300 border border-amber-700',
  'assigned':          'bg-blue-900/40 text-blue-300 border border-blue-700',
  'in-progress':       'bg-violet-900/40 text-violet-300 border border-violet-700',
  'under-review':      'bg-pink-900/40 text-pink-300 border border-pink-700',
  'completed':         'bg-emerald-900/40 text-emerald-300 border border-emerald-700',
  'closed':            'bg-slate-800/60 text-slate-400 border border-slate-600',
  'rejected':          'bg-red-900/40 text-red-300 border border-red-700',
};
function Pill({ label }: { label: string }) {
  const key = label.toLowerCase().replace(/\s+/g, '-');
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_PILL_COLORS[key] || 'bg-secondary text-foreground border border-border'}`}>{label}</span>;
}
function RoleBadge({ role }: { role: string }) {
  const cls = role === 'admin' ? 'bg-red-900/40 text-red-300' : role === 'hr' ? 'bg-blue-900/40 text-blue-300' : 'bg-green-900/40 text-green-300';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize font-medium ${cls}`}>{role}</span>;
}

function TextView({ data }: { data: WorkflowData }) {
  const { nodes, edges } = data;
  const nm = Object.fromEntries(nodes.map(n => [n.id, n]));
  return (
    <div className="space-y-3 overflow-y-auto max-h-[65vh] pr-1">
      <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Statuses ({nodes.length})</p>
        <div className="flex flex-wrap gap-2">{nodes.map(n => <Pill key={n.id} label={n.label} />)}</div>
      </div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transitions ({edges.length})</p>
      <div className="space-y-1.5">
        {edges.map(e => (
          <div key={e.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border/60">
            <div className="min-w-[120px]">{nm[e.from] ? <Pill label={nm[e.from].label} /> : <span className="text-xs text-muted-foreground">{e.from}</span>}</div>
            <div className="flex flex-col items-center gap-0.5 min-w-[100px]">
              <span className="text-[9px] font-mono text-muted-foreground">{e.label}</span>
              <div className="flex items-center gap-1">
                <div className="h-px w-6 bg-border" />
                <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px]" style={{ borderLeftColor: edgeColor(e.roles) }} />
              </div>
            </div>
            <div className="min-w-[100px]">{nm[e.to] ? <Pill label={nm[e.to].label} /> : <span className="text-xs text-muted-foreground">{e.to}</span>}</div>
            <div className="flex flex-wrap gap-1 ml-auto">{e.roles.map(r => <RoleBadge key={r} role={r} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface WorkflowDiagramProps {
  open: boolean;
  onClose: () => void;
}

export function WorkflowDiagramDialog({ open, onClose }: WorkflowDiagramProps) {
  const [view, setView] = useState<'diagram' | 'text'>('diagram');
  const [textData] = useState<WorkflowData>(loadData);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[96vw] w-[1100px] max-h-[92vh] h-[90vh] overflow-hidden flex flex-col bg-background p-0">
        <DialogHeader className="px-5 pt-4 pb-2 shrink-0 border-b border-border/60">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-5 w-5 text-primary" />
              Task Workflow
              <Badge variant="secondary" className="text-xs font-normal ml-1">People Operations</Badge>
            </DialogTitle>
            <div className="flex items-center border border-border rounded-md overflow-hidden mr-8">
              <button onClick={() => setView('diagram')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${view === 'diagram' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'}`}>
                <LayoutDashboard className="h-3.5 w-3.5" />Diagram
              </button>
              <button onClick={() => setView('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${view === 'text' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'}`}>
                <List className="h-3.5 w-3.5" />Text
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1"><User className="h-3 w-3 text-green-500" />Employee — submit, start, review</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3 text-blue-500" />HR — approve, reject, close</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-red-500" />Admin — full override</span>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden p-3">
          {view === 'diagram' ? <EditorCanvas /> : <TextView data={textData} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Button trigger
// ─────────────────────────────────────────────────────────────────────────────

export function WorkflowDiagramButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <>
      <Button variant="outline" size="sm" className={`gap-2 ${className ?? ''}`} onClick={() => navigate('/workflow')}>
        <GitBranch className="h-4 w-4" />Workflow
      </Button>
    </>
  );
}

// Full page export used by the /workflow route
export function WorkflowDiagramPage() {
  const [view, setView] = useState<'diagram' | 'text'>('diagram');
  const navigate = useNavigate();
  const { userRole } = useAuth();
  return (
    <div className="p-6">
      <div className="max-w-[96vw] w-full max-h-[92vh] h-[90vh] overflow-hidden flex flex-col bg-background rounded-lg border border-border">
        <div className="px-5 pt-4 pb-2 shrink-0 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-base">
              <GitBranch className="h-5 w-5 text-primary" />
              <span>Task Workflow</span>
              <Badge variant="secondary" className="text-xs font-normal ml-1">People Operations</Badge>
            </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-border rounded-md overflow-hidden mr-2">
              <button onClick={() => setView('diagram')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${view === 'diagram' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'}`}>
                <LayoutDashboard className="h-3.5 w-3.5" />Diagram
              </button>
              <button onClick={() => setView('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${view === 'text' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'}`}>
                <List className="h-3.5 w-3.5" />Text
              </button>
                      </div>
                      <button onClick={() => { if (userRole) navigate(`/${userRole}`); else navigate(-1); }}
                        className="ml-2 p-2 rounded hover:bg-secondary text-muted-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-3">{view === 'diagram' ? <EditorCanvas /> : <TextView data={loadData()} />}</div>
      </div>
    </div>
  );
}
