/**
 * WorkflowBuilderPage — Full-screen interactive workflow template builder
 *
 * Jira/Miro-style drag canvas:
 *   - Drag nodes to position them
 *   - "Add Transition" mode: click source → click target → label dialog
 *   - Double-click node to inline-rename
 *   - Properties panel on the right (rename, role color, description, delete)
 *   - Header: template name input + Save to API
 *
 * Routes:
 *   /<role>/workflow/builder          (create)
 *   /<role>/workflow/builder/:id      (edit)
 */

import {
  useState, useEffect, useCallback, useRef,
  type MouseEvent as RMouseEvent,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft, Save, Plus, Trash2, MousePointer2,
  ArrowRightLeft, RotateCcw, Network, Loader2, X,
} from 'lucide-react';
import { workflowAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

// ─── Canvas types ─────────────────────────────────────────────────────────────

interface CNode {
  id: string;
  label: string;
  description: string;
  responsibleRole: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  bg: string;
}

interface CEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  control?: { x: number; y: number };
}

// ─── Role palette ─────────────────────────────────────────────────────────────

const ROLES = ['any', 'admin', 'hr', 'employee'] as const;
type Role = typeof ROLES[number];

const ROLE_PALETTE: Record<Role, { color: string; bg: string }> = {
  any:      { color: '#2563eb', bg: '#10182a' },
  admin:    { color: '#dc2626', bg: '#2a1010' },
  hr:       { color: '#7c3aed', bg: '#1a1028' },
  employee: { color: '#059669', bg: '#0f2318' },
};

// ─── Geometry ────────────────────────────────────────────────────────────────

function buildPath(a: CNode, b: CNode, ctrl?: { x: number; y: number }) {
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
  if (ctrl) { c1x = ctrl.x; c1y = ctrl.y; }
  else {
    const mx = (ex + fx) / 2, my = (ey + fy) / 2;
    c1x = mx - uy * 30; c1y = my + ux * 30;
  }
  const d = `M ${ex.toFixed(1)} ${ey.toFixed(1)} Q ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${fx.toFixed(1)} ${fy.toFixed(1)}`;
  const lx = 0.25 * ex + 0.5 * c1x + 0.25 * fx;
  const ly = 0.25 * ey + 0.5 * c1y + 0.25 * fy;
  return { d, lx, ly, c1x, c1y };
}

// ─── Inline rename ───────────────────────────────────────────────────────────

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

// ─── Edge label dialog ───────────────────────────────────────────────────────

function EdgeLabelDialog({ open, onClose, onConfirm }: {
  open: boolean; onClose: () => void;
  onConfirm: (label: string) => void;
}) {
  const [label, setLabel] = useState('');
  useEffect(() => { if (open) setLabel(''); }, [open]);
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[360px]">
        <DialogHeader><DialogTitle>Transition Label</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <input
            autoFocus
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder='e.g. "Submit", "Approve", "Next"'
            className="w-full bg-secondary border border-border rounded px-2 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            onKeyDown={e => { if (e.key === 'Enter') onConfirm(label || 'Next'); }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onConfirm(label || 'Next')}>Add Arrow</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Properties panel ────────────────────────────────────────────────────────

function PropsPanel({ selected, nodes, edges, onUpdateNode, onUpdateEdge, onDelete }: {
  selected: string | null;
  nodes: CNode[]; edges: CEdge[];
  onUpdateNode: (id: string, c: Partial<CNode>) => void;
  onUpdateEdge: (id: string, c: Partial<CEdge>) => void;
  onDelete: () => void;
}) {
  const nd = nodes.find(n => n.id === selected);
  const ed = edges.find(e => e.id === selected);

  if (!selected || (!nd && !ed)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs text-center px-4 gap-3 select-none">
        <MousePointer2 className="h-7 w-7 opacity-20" />
        <p>Click a node or arrow to see its properties</p>
      </div>
    );
  }

  if (nd) return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Step Node</p>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Step Title</label>
        <input
          className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
          value={nd.label}
          onChange={e => onUpdateNode(nd.id, { label: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Description</label>
        <textarea
          rows={2}
          className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-xs text-foreground resize-none focus:outline-none focus:border-primary"
          value={nd.description}
          onChange={e => onUpdateNode(nd.id, { description: e.target.value })}
          placeholder="What happens in this step?"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Responsible Role</label>
        <div className="grid grid-cols-2 gap-1.5">
          {ROLES.map(r => {
            const p = ROLE_PALETTE[r];
            const active = nd.responsibleRole === r;
            return (
              <button
                key={r}
                onClick={() => onUpdateNode(nd.id, { responsibleRole: r, color: p.color, bg: p.bg })}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs capitalize transition-all"
                style={active
                  ? { borderColor: p.color, background: p.bg, color: p.color, fontWeight: 600 }
                  : { borderColor: '#334155', color: '#64748b' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="destructive" size="sm" className="w-full gap-1.5" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" /> Delete Step
      </Button>
    </div>
  );

  if (ed) return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Transition Arrow</p>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Label</label>
        <input
          className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
          value={ed.label}
          onChange={e => onUpdateEdge(ed.id, { label: e.target.value })}
        />
      </div>
      <Button variant="destructive" size="sm" className="w-full gap-1.5" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" /> Delete Arrow
      </Button>
    </div>
  );

  return null;
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

let _nc = 0, _ec = 0;

interface CanvasProps {
  initialNodes: CNode[];
  initialEdges: CEdge[];
  onChange: (nodes: CNode[], edges: CEdge[]) => void;
}

function BuilderCanvas({ initialNodes, initialEdges, onChange }: CanvasProps) {
  const [nodes, setNodes] = useState<CNode[]>(initialNodes);
  const [edges, setEdges] = useState<CEdge[]>(initialEdges);
  const [mode, setMode]   = useState<'select' | 'addEdge'>('select');
  const [selected, setSelected]       = useState<string | null>(null);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [edgeDlg, setEdgeDlg]         = useState<{ from: string; to: string } | null>(null);
  const [dragging, setDragging]       = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [editing, setEditing]         = useState<string | null>(null);
  const [draggingCtrl, setDraggingCtrl] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // keep parent in sync whenever nodes/edges change
  useEffect(() => { onChange(nodes, edges); }, [nodes, edges]);

  // re-init when parent passes new initialNodes (after template load)
  const prevInitKey = useRef('');
  useEffect(() => {
    const key = JSON.stringify(initialNodes.map(n => n.id));
    if (key !== prevInitKey.current) {
      prevInitKey.current = key;
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges]);

  const svgPt = (e: RMouseEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM()!.inverse());
  };

  const addNode = () => {
    const idx = ++_nc;
    const roleKey = ROLES[idx % ROLES.length];
    const palette = ROLE_PALETTE[roleKey];
    const nd: CNode = {
      id: `n-${idx}`,
      label: 'New Step',
      description: '',
      responsibleRole: roleKey,
      x: 80 + ((idx * 220) % 900),
      y: 80 + Math.floor(idx / 5) * 180,
      w: 162,
      h: 52,
      color: palette.color,
      bg: palette.bg,
    };
    setNodes(prev => [...prev, nd]);
    setSelected(nd.id);
    setMode('select');
    setTimeout(() => setEditing(nd.id), 30);
  };

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    if (nodes.some(n => n.id === selected)) {
      setNodes(prev => prev.filter(n => n.id !== selected));
      setEdges(prev => prev.filter(e => e.from !== selected && e.to !== selected));
    } else {
      setEdges(prev => prev.filter(e => e.id !== selected));
    }
    setSelected(null);
  }, [selected, nodes]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !editing) deleteSelected();
      if (e.key === 'Escape') { setMode('select'); setPendingFrom(null); setSelected(null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selected, editing, deleteSelected]);

  const handleNodeClick = (e: RMouseEvent, id: string) => {
    e.stopPropagation();
    if (editing) return;
    if (mode === 'addEdge') {
      if (!pendingFrom) { setPendingFrom(id); return; }
      if (pendingFrom !== id) setEdgeDlg({ from: pendingFrom, to: id });
      setPendingFrom(null); setMode('select'); return;
    }
    setSelected(id);
  };

  const handleNodeDblClick = (e: RMouseEvent, id: string) => { e.stopPropagation(); setEditing(id); };

  const handleNodeMouseDown = (e: RMouseEvent, id: string) => {
    if (mode !== 'select') return;
    e.stopPropagation();
    const p = svgPt(e);
    const n = nodes.find(x => x.id === id)!;
    setDragging({ id, ox: p.x - n.x, oy: p.y - n.y });
  };

  const handleMouseMove = (e: RMouseEvent) => {
    if (draggingCtrl) {
      const p = svgPt(e);
      setEdges(prev => prev.map(ed => ed.id === draggingCtrl ? { ...ed, control: { x: p.x, y: p.y } } : ed));
      return;
    }
    if (!dragging) return;
    const p = svgPt(e);
    setNodes(prev => prev.map(n => n.id === dragging.id
      ? { ...n, x: Math.max(4, p.x - dragging.ox), y: Math.max(4, p.y - dragging.oy) } : n));
  };

  const onUpdateNode = (id: string, c: Partial<CNode>) =>
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...c } : n));
  const onUpdateEdge = (id: string, c: Partial<CEdge>) =>
    setEdges(prev => prev.map(e => e.id === id ? { ...e, ...c } : e));

  const handleClear = () => {
    if (!confirm('Clear all steps and arrows from the canvas?')) return;
    setNodes([]); setEdges([]); setSelected(null);
  };

  return (
    <div className="flex gap-0 h-full overflow-hidden">
      {/* ─── Canvas ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border/60 bg-card/60 shrink-0 flex-wrap">
          <button
            onClick={() => { setMode('select'); setPendingFrom(null); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${mode === 'select' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'}`}
          >
            <MousePointer2 className="h-3.5 w-3.5" /> Select
          </button>

          <button
            onClick={addNode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-secondary text-muted-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Step
          </button>

          <button
            onClick={() => { setMode(m => m === 'addEdge' ? 'select' : 'addEdge'); setPendingFrom(null); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${mode === 'addEdge' ? 'bg-violet-600 text-white' : 'hover:bg-secondary text-muted-foreground'}`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {mode === 'addEdge'
              ? (pendingFrom ? 'Click target…' : 'Click source…')
              : 'Add Transition'}
          </button>

          <div className="h-4 w-px bg-border/60 mx-0.5" />

          <button
            onClick={deleteSelected} disabled={!selected}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-destructive/20 text-muted-foreground disabled:opacity-30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-secondary text-muted-foreground transition-colors ml-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear
          </button>
        </div>

        {/* Hint bar */}
        {mode === 'addEdge' && (
          <div className="text-xs text-center py-1.5 bg-violet-900/30 text-violet-300 shrink-0 border-b border-violet-700/40">
            {pendingFrom
              ? `From: "${nodes.find(n => n.id === pendingFrom)?.label}" — click the target step`
              : 'Click the source step to start drawing an arrow'}
            <button
              className="ml-3 underline opacity-70 hover:opacity-100"
              onClick={() => { setMode('select'); setPendingFrom(null); }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* SVG canvas */}
        <div
          className="flex-1 overflow-auto bg-[#0d1117]"
          style={{ cursor: mode === 'addEdge' ? 'crosshair' : dragging ? 'grabbing' : 'default' }}
        >
          <svg
            ref={svgRef}
            viewBox="0 0 1200 720"
            width="1200"
            height="720"
            className="min-w-full"
            onMouseMove={handleMouseMove}
            onMouseUp={() => { setDragging(null); setDraggingCtrl(null); }}
            onClick={() => { if (mode !== 'addEdge') setSelected(null); }}
          >
            <defs>
              {[['p', '#a855f7'], ['b', '#3b82f6'], ['g', '#22c55e'], ['r', '#ef4444'], ['y', '#f59e0b']].map(([rid, fill]) => (
                <marker key={rid} id={`arr-${rid}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={fill} />
                </marker>
              ))}
            </defs>

            {/* dot grid background */}
            <pattern id="dotgrid-wb" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="#1a2332" />
            </pattern>
            <rect width="1200" height="720" fill="url(#dotgrid-wb)" />

            {/* Empty state hint */}
            {nodes.length === 0 && (
              <g>
                <text x="600" y="308" textAnchor="middle" fontSize="17" fontWeight="500" fill="#1e2d3d">
                  Your canvas is empty
                </text>
                <text x="600" y="340" textAnchor="middle" fontSize="13" fill="#1e2d3d">
                  Click "+ Add Step" in the toolbar to get started
                </text>
              </g>
            )}

            {/* Edges */}
            {edges.map(edge => {
              const a = nodes.find(n => n.id === edge.from);
              const b = nodes.find(n => n.id === edge.to);
              if (!a || !b) return null;
              const { d, lx, ly, c1x, c1y } = buildPath(a, b, edge.control);
              const isSel = selected === edge.id;
              const arrowColor = isSel ? '#f59e0b' : '#a855f7';
              const mk = isSel ? 'y' : 'p';
              return (
                <g
                  key={edge.id}
                  onClick={ev => { ev.stopPropagation(); if (!editing) setSelected(edge.id); }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* wide invisible hit target */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
                  <path d={d} fill="none" stroke={arrowColor} strokeWidth={isSel ? 2.5 : 1.8} markerEnd={`url(#arr-${mk})`} />
                  <rect x={lx - 32} y={ly - 11} width={64} height={17} rx={4} fill="#0d1117cc" />
                  <text x={lx} y={ly + 2} textAnchor="middle" fontSize="10" fontWeight={isSel ? '700' : '500'} fill={isSel ? '#f59e0b' : '#94a3b8'}>
                    {edge.label}
                  </text>
                  {/* curve handle (drag to bend) */}
                  {isSel && (
                    <g onMouseDown={ev => { ev.stopPropagation(); setDraggingCtrl(edge.id); }}>
                      <circle cx={c1x} cy={c1y} r={6} fill="#fff" stroke="#111827" strokeWidth={1.5} opacity={0.95} />
                      <circle cx={c1x} cy={c1y} r={3} fill="#6366f1" />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((n, ni) => {
              const isSel = selected === n.id;
              const isPending = pendingFrom === n.id;
              return (
                <g
                  key={n.id}
                  onClick={e => handleNodeClick(e, n.id)}
                  onDoubleClick={e => handleNodeDblClick(e, n.id)}
                  onMouseDown={e => handleNodeMouseDown(e, n.id)}
                  style={{ cursor: mode === 'addEdge' ? 'crosshair' : dragging?.id === n.id ? 'grabbing' : 'grab' }}
                >
                  {/* selection halo */}
                  {(isSel || isPending) && (
                    <rect
                      x={n.x - 5} y={n.y - 5} width={n.w + 10} height={n.h + 10} rx={13}
                      fill="none"
                      stroke={isPending ? '#a855f7' : '#f59e0b'}
                      strokeWidth={2} strokeDasharray="5 3"
                    />
                  )}
                  {/* drop shadow */}
                  <rect x={n.x + 3} y={n.y + 4} width={n.w} height={n.h} rx={10} fill="rgba(0,0,0,0.5)" />
                  {/* body */}
                  <rect
                    x={n.x} y={n.y} width={n.w} height={n.h} rx={10}
                    fill={n.bg} stroke={n.color} strokeWidth={isSel ? 2.5 : 1.8}
                  />
                  {/* step number circle */}
                  <circle cx={n.x + 22} cy={n.y + n.h / 2} r={13} fill={n.color} opacity={0.9} />
                  <text x={n.x + 22} y={n.y + n.h / 2 + 4.5} textAnchor="middle"
                    fontSize="11" fontWeight="700" fill="#fff"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {ni + 1}
                  </text>
                  {/* inline rename OR label */}
                  {editing === n.id ? (
                    <InlineInput
                      value={n.label}
                      x={n.x + 42} y={n.y + n.h / 2 - 9} w={n.w - 52}
                      onDone={v => { onUpdateNode(n.id, { label: v }); setEditing(null); }}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <text
                      x={n.x + 44} y={n.y + n.h / 2 + 5}
                      fontSize="13" fontWeight="600" fill={n.color}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                      {n.label.length > 13 ? n.label.slice(0, 13) + '…' : n.label}
                    </text>
                  )}
                  {/* role label */}
                  <text
                    x={n.x + 44} y={n.y + n.h - 7}
                    fontSize="9" fill={n.color} opacity={0.55}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {n.responsibleRole}
                  </text>
                </g>
              );
            })}

            {/* Instructions legend */}
            <g transform="translate(12,700)">
              <text fontSize="9" fill="#2d3d50">
                <tspan>Double-click to rename</tspan>
                <tspan dx="12">•</tspan>
                <tspan dx="4">Drag to move</tspan>
                <tspan dx="12">•</tspan>
                <tspan dx="4">Del key removes selected</tspan>
                <tspan dx="12">•</tspan>
                <tspan dx="4">Drag ● handle to curve arrow</tspan>
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* ─── Properties panel ─── */}
      <div className="w-56 shrink-0 border-l border-border/60 bg-card/80 flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-border/60 shrink-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Properties</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PropsPanel
            selected={selected} nodes={nodes} edges={edges}
            onUpdateNode={onUpdateNode} onUpdateEdge={onUpdateEdge}
            onDelete={deleteSelected}
          />
        </div>
      </div>

      {/* Edge label dialog */}
      <EdgeLabelDialog
        open={!!edgeDlg}
        onClose={() => setEdgeDlg(null)}
        onConfirm={label => {
          if (!edgeDlg) return;
          const eid = `e-${++_ec}`;
          setEdges(prev => [...prev, { id: eid, from: edgeDlg.from, to: edgeDlg.to, label }]);
          setSelected(eid);
          setEdgeDlg(null);
        }}
      />
    </div>
  );
}

// ─── Helpers to convert between API template steps ↔ canvas nodes/edges ──────

function stepsToCanvas(steps: any[]): { nodes: CNode[]; edges: CEdge[] } {
  const nodes: CNode[] = steps.map((s, i) => {
    const role = (s.responsibleRole || 'any') as Role;
    const palette = ROLE_PALETTE[role] ?? ROLE_PALETTE.any;
    return {
      id: s._id || `n-loaded-${i}`,
      label: s.title || `Step ${i + 1}`,
      description: s.description || '',
      responsibleRole: role,
      // restore saved canvas position if available, otherwise auto-grid
      x: s._canvasX ?? (80 + (i % 4) * 240),
      y: s._canvasY ?? (80 + Math.floor(i / 4) * 180),
      w: 162, h: 52,
      color: palette.color, bg: palette.bg,
    };
  });
  // auto-chain sequential arrows if none were saved
  const edges: CEdge[] = nodes.slice(0, -1).map((n, i) => ({
    id: `e-auto-${i}`,
    from: n.id,
    to: nodes[i + 1].id,
    label: 'Next',
  }));
  return { nodes, edges };
}

function canvasToSteps(nodes: CNode[]) {
  return nodes.map((n, i) => ({
    title: n.label,
    description: n.description,
    responsibleRole: n.responsibleRole,
    order: i + 1,
    _canvasX: n.x,
    _canvasY: n.y,
  }));
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkflowBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { userRole } = useAuth();
  const { toast } = useToast();

  const isEdit = !!id;
  const [pageLoad, setPageLoad]       = useState(isEdit);
  const [saving, setSaving]           = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateShared, setTemplateShared] = useState(false);
  const [initNodes, setInitNodes]     = useState<CNode[]>([]);
  const [initEdges, setInitEdges]     = useState<CEdge[]>([]);

  // live canvas output (ref so we never need to re-render)
  const canvasData = useRef<{ nodes: CNode[]; edges: CEdge[] }>({ nodes: [], edges: [] });

  const goBack = useCallback(() => {
    // Prefer to go back in history so the builder X just closes the panel
    // Fallback to the role workflow listing if no history is available
    try {
      navigate(-1);
    } catch (e) {
      if (userRole) navigate(`/${userRole}/workflow`);
      else navigate('/');
    }
  }, [userRole, navigate]);

  // load template for edit mode
  useEffect(() => {
    if (!id) return;
    let active = true;
    setPageLoad(true);
    workflowAPI.getTemplateById(id)
      .then(res => {
        if (!active) return;
        const tpl = res.data.data;
        setTemplateName(tpl.name || '');
        setTemplateDesc(tpl.description || '');
        setTemplateShared(!!tpl.isShared);
        if (tpl.steps?.length) {
          const { nodes, edges } = stepsToCanvas(tpl.steps);
          setInitNodes(nodes);
          setInitEdges(edges);
        }
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load template', variant: 'destructive' });
        goBack();
      })
      .finally(() => { if (active) setPageLoad(false); });
    return () => { active = false; };
  }, [id]);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({ title: 'Validation', description: 'Workflow name is required', variant: 'destructive' });
      return;
    }
    const { nodes } = canvasData.current;
    if (nodes.length === 0) {
      toast({ title: 'Validation', description: 'Add at least one step to the canvas', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: templateName.trim(),
        description: templateDesc,
        isShared: templateShared,
        steps: canvasToSteps(nodes),
      };
      if (isEdit && id) {
        await workflowAPI.updateTemplate(id, payload);
        toast({ title: 'Saved', description: `"${templateName.trim()}" updated` });
      } else {
        await workflowAPI.createTemplate(payload);
        toast({ title: 'Created', description: `"${templateName.trim()}" workflow created` });
      }
      goBack();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (pageLoad) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-card/90 backdrop-blur shrink-0">
        <button
          onClick={goBack}
          className="p-1.5 rounded hover:bg-secondary text-muted-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Network className="h-3.5 w-3.5 text-primary" />
        </div>

        {/* Editable template name */}
        <input
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          placeholder="Workflow Template Name…"
          className="flex-1 max-w-[360px] bg-transparent border-b border-border/40 focus:border-primary text-sm font-semibold text-foreground outline-none py-0.5 placeholder:text-muted-foreground/40 transition-colors"
        />

        <Badge variant="secondary" className="text-[10px] font-normal hidden sm:flex">
          {isEdit ? 'Edit Template' : 'New Template'}
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          {/* Shared toggle */}
          <button
            onClick={() => setTemplateShared(s => !s)}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
              templateShared
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-secondary/60 text-muted-foreground border-border'
            }`}
          >
            {templateShared ? 'Shared' : 'Private'}
          </button>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack} disabled={saving}>
            <X className="h-4 w-4" />
          </Button>

          <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Template'}
          </Button>
        </div>
      </header>

      {/* ── Interactive canvas (full remaining height) ── */}
      <div className="flex-1 overflow-hidden">
        <BuilderCanvas
          initialNodes={initNodes}
          initialEdges={initEdges}
          onChange={(nodes, edges) => { canvasData.current = { nodes, edges }; }}
        />
      </div>
    </div>
  );
}
