/**
 * TaskWorkflowCanvas
 * SVG-based read-only diagram that visualises the user-defined workflow
 * steps attached to a single task. Inspired by WorkflowDiagram.
 *
 * Layout: horizontal snake — up to ROW_STEPS nodes per row, then wraps
 * downward, alternating direction so arrows stay clean.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2, Circle, Clock, LayoutDashboard, List,
  Loader2, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, getUserName } from './task-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const NW = 148;   // node width
const NH = 50;    // node height
const GAP_X = 44; // horizontal gap between nodes
const GAP_Y = 64; // vertical gap between rows
const PAD   = 20; // canvas padding
const ROW_S = 4;  // nodes per row

const STATUS_STYLE = {
  pending:   { stroke: '#475569', bg: '#1e2330', text: '#94a3b8', glow: 'none' },
  active:    { stroke: '#7c3aed', bg: '#1a1028', text: '#c4b5fd', glow: '0 0 14px #7c3aed66' },
  completed: { stroke: '#059669', bg: '#0f2318', text: '#6ee7b7', glow: 'none' },
  skipped:   { stroke: '#374151', bg: '#111827', text: '#6b7280', glow: 'none' },
};

const ROLE_COLORS: Record<string, string> = {
  admin:    '#ef4444',
  hr:       '#a855f7',
  employee: '#22c55e',
  any:      '#3b82f6',
};

// ─────────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

function layoutNodes(count: number) {
  const positions: { x: number; y: number; row: number; col: number }[] = [];
  for (let i = 0; i < count; i++) {
    const row  = Math.floor(i / ROW_S);
    const col  = row % 2 === 0 ? i % ROW_S : ROW_S - 1 - (i % ROW_S);
    const x    = PAD + col * (NW + GAP_X);
    const y    = PAD + row * (NH + GAP_Y);
    positions.push({ x, y, row, col });
  }
  return positions;
}

function svgSize(count: number) {
  const rows = Math.ceil(count / ROW_S);
  const cols = Math.min(count, ROW_S);
  return {
    w: PAD * 2 + cols * NW + (cols - 1) * GAP_X,
    h: PAD * 2 + rows * NH + (rows - 1) * GAP_Y,
  };
}

/** Arrow from centre-right of node A to centre-left of node B (same row) */
function hArrow(ax: number, ay: number, bx: number) {
  const startX = ax + NW;
  const startY = ay + NH / 2;
  const endX   = bx;
  const endY   = startY;
  const midX   = (startX + endX) / 2;
  return `M ${startX} ${startY} C ${midX} ${startY} ${midX} ${endY} ${endX} ${endY}`;
}

/** Arrow from bottom-centre of last node in a row down to top-centre of first node in next row */
function wrapArrow(last: { x: number; y: number }, first: { x: number; y: number }) {
  const startX = last.x + NW / 2;
  const startY = last.y + NH;
  const endX   = first.x + NW / 2;
  const endY   = first.y;
  const midY   = (startY + endY) / 2;
  return `M ${startX} ${startY} C ${startX} ${midY} ${endX} ${midY} ${endX} ${endY}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text list view
// ─────────────────────────────────────────────────────────────────────────────

function ListView({ steps }: { steps: any[] }) {
  return (
    <div className="overflow-y-auto max-h-[340px] pr-1 space-y-2">
      {steps.map((step: any, i: number) => {
        const s = (step.status || 'pending') as keyof typeof STATUS_STYLE;
        const style = STATUS_STYLE[s] || STATUS_STYLE.pending;
        return (
          <div
            key={step._id || i}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3',
              s === 'active'    && 'border-violet-500/40 bg-violet-950/20',
              s === 'completed' && 'border-emerald-600/30 bg-emerald-950/10',
              s === 'pending'   && 'border-border/40 bg-secondary/10 opacity-60',
            )}
          >
            <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: style.bg, border: `2px solid ${style.stroke}` }}>
              {s === 'completed'
                ? <CheckCircle2 className="h-3.5 w-3.5" style={{ color: style.stroke }} />
                : s === 'active'
                ? <Circle className="h-2.5 w-2.5 fill-violet-500 text-violet-500" />
                : <span className="text-[9px] font-bold" style={{ color: style.text }}>{i + 1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-xs font-semibold', s === 'completed' && 'line-through opacity-60')}>
                  {step.title}
                </span>
                {s === 'active' && <Badge className="text-[9px] bg-violet-500/20 text-violet-300 border-violet-500/30">Active</Badge>}
                {step.responsibleRole && step.responsibleRole !== 'any' && (
                  <Badge variant="outline" className="text-[9px] capitalize px-1.5 py-0">
                    {step.responsibleRole}
                  </Badge>
                )}
              </div>
              {step.description && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{step.description}</p>
              )}
              {s === 'completed' && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  <User className="h-2.5 w-2.5 inline mr-1" />
                  {getUserName(step.completedBy)} · {step.completedAt ? formatDate(step.completedAt) : ''}
                </p>
              )}
              {step.comment && (
                <p className="text-[10px] italic text-muted-foreground/60 mt-0.5">"{step.comment}"</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

interface TaskWorkflowCanvasProps {
  workflowName: string;
  steps: any[];
  currentStepIndex: number;
  /** Called when user clicks "Complete Step" inside active step */
  onCompleteStep?: (stepIndex: number, comment: string) => void;
  completing?: boolean;
}

export function TaskWorkflowCanvas({
  workflowName,
  steps,
  currentStepIndex,
  onCompleteStep,
  completing = false,
}: TaskWorkflowCanvasProps) {
  const [view, setView]           = useState<'diagram' | 'text'>('diagram');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(currentStepIndex < steps.length ? currentStepIndex : null);
  const [comment, setComment]     = useState('');

  const positions = layoutNodes(steps.length);
  const { w, h }  = svgSize(steps.length);

  const selectedStep = selectedIdx !== null ? steps[selectedIdx] : null;

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-border/60 overflow-hidden bg-[#0d1117]">
      {/* ── Header bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-card/80 border-b border-border/60 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{workflowName}</span>
          <Badge variant="secondary" className="text-[10px]">
            {steps.filter((s: any) => s.status === 'completed').length}/{steps.length} done
          </Badge>
        </div>
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setView('diagram')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors',
              view === 'diagram' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'
            )}
          >
            <LayoutDashboard className="h-3 w-3" /> Diagram
          </button>
          <button
            onClick={() => setView('text')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors',
              view === 'text' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'
            )}
          >
            <List className="h-3 w-3" /> List
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {view === 'diagram' ? (
        <div className="flex overflow-hidden" style={{ minHeight: Math.max(h + 20, 200) }}>
          {/* SVG canvas */}
          <div className="flex-1 overflow-auto">
            <svg
              viewBox={`0 0 ${w} ${h}`}
              width={w}
              height={h}
              className="min-w-full"
              style={{ minWidth: w, minHeight: h }}
            >
              <defs>
                {[['g','#22c55e'],['v','#7c3aed'],['s','#475569']].map(([id, fill]) => (
                  <marker key={id} id={`tw-${id}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill={fill} />
                  </marker>
                ))}
              </defs>

              {/* dot grid */}
              <pattern id="tw-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.8" fill="#1a2332" />
              </pattern>
              <rect width={w} height={h} fill="url(#tw-dots)" />

              {/* ── Arrows ─────────────────────────────────────────── */}
              {positions.map((pos, i) => {
                if (i === steps.length - 1) return null;
                const next     = positions[i + 1];
                const step     = steps[i];
                const isDone   = step.status === 'completed';
                const isWrap   = pos.row !== next.row;
                const arrowColor = isDone ? '#059669' : (step.status === 'active' ? '#7c3aed' : '#374151');
                const mk = isDone ? 'g' : step.status === 'active' ? 'v' : 's';
                const d  = isWrap ? wrapArrow(pos, next) : hArrow(pos.x, pos.y, next.x);
                return (
                  <path
                    key={`arrow-${i}`}
                    d={d}
                    fill="none"
                    stroke={arrowColor}
                    strokeWidth={isDone ? 2 : 1.5}
                    strokeDasharray={step.status === 'pending' ? '5 3' : undefined}
                    markerEnd={`url(#tw-${mk})`}
                  />
                );
              })}

              {/* ── Nodes ─────────────────────────────────────────── */}
              {positions.map((pos, i) => {
                const step   = steps[i];
                const s      = (step.status || 'pending') as keyof typeof STATUS_STYLE;
                const style  = STATUS_STYLE[s] || STATUS_STYLE.pending;
                const isSel  = selectedIdx === i;
                const roleColor = step.responsibleRole && step.responsibleRole !== 'any'
                  ? ROLE_COLORS[step.responsibleRole] || '#3b82f6'
                  : null;

                return (
                  <g
                    key={`node-${i}`}
                    onClick={() => setSelectedIdx(isSel ? null : i)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Selection ring */}
                    {isSel && (
                      <rect
                        x={pos.x - 5} y={pos.y - 5}
                        width={NW + 10} height={NH + 10}
                        rx={13} fill="none"
                        stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3"
                      />
                    )}

                    {/* Node body */}
                    <rect
                      x={pos.x} y={pos.y}
                      width={NW} height={NH}
                      rx={9}
                      fill={style.bg}
                      stroke={style.stroke}
                      strokeWidth={s === 'active' ? 2.5 : 1.5}
                      style={{ filter: s === 'active' ? 'drop-shadow(0 0 8px #7c3aed88)' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }}
                    />

                    {/* Step number */}
                    <text
                      x={pos.x + 10} y={pos.y + 16}
                      fontSize="9" fontWeight="700"
                      fill={style.stroke} opacity={0.7}
                    >{i + 1}</text>

                    {/* Step title */}
                    <text
                      x={pos.x + NW / 2} y={pos.y + NH / 2 + 4}
                      textAnchor="middle"
                      fontSize="12" fontWeight="600"
                      fill={style.text}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                      {step.title.length > 14 ? step.title.slice(0, 13) + '…' : step.title}
                    </text>

                    {/* Role dot */}
                    {roleColor && (
                      <circle
                        cx={pos.x + NW - 10} cy={pos.y + 10}
                        r={4} fill={roleColor} opacity={0.85}
                      />
                    )}

                    {/* Status icon for completed */}
                    {s === 'completed' && (
                      <text
                        x={pos.x + NW / 2} y={pos.y + NH - 6}
                        textAnchor="middle" fontSize="8"
                        fill="#059669" opacity={0.7}
                      >✓ done</text>
                    )}
                    {s === 'active' && (
                      <text
                        x={pos.x + NW / 2} y={pos.y + NH - 6}
                        textAnchor="middle" fontSize="8"
                        fill="#a78bfa" opacity={0.9}
                      >● active</text>
                    )}
                  </g>
                );
              })}

              {/* Legend */}
              <g transform={`translate(${PAD}, ${h - 14})`}>
                <rect x={0} y={-6} width={8} height={8} rx={2} fill="#0f2318" stroke="#059669" strokeWidth={1.5} />
                <text x={12} y={2} fontSize="9" fill="#64748b">Completed</text>
                <rect x={72} y={-6} width={8} height={8} rx={2} fill="#1a1028" stroke="#7c3aed" strokeWidth={1.5} />
                <text x={84} y={2} fontSize="9" fill="#64748b">Active</text>
                <rect x={132} y={-6} width={8} height={8} rx={2} fill="#1e2330" stroke="#475569" strokeWidth={1.5} />
                <text x={144} y={2} fontSize="9" fill="#64748b">Pending</text>
              </g>
            </svg>
          </div>

          {/* ── Properties side panel ──────────────────────────── */}
          <div className="w-52 shrink-0 border-l border-border/60 bg-card/80 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border/60 shrink-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Properties</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedStep ? (
                <div className="p-3 space-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Step {(selectedIdx ?? 0) + 1}</p>
                    <p className="text-sm font-semibold break-words">{selectedStep.title}</p>
                  </div>
                  {selectedStep.description && (
                    <p className="text-xs text-muted-foreground">{selectedStep.description}</p>
                  )}
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Status</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        'capitalize text-xs',
                        selectedStep.status === 'active'    && 'border-violet-500/50 text-violet-400',
                        selectedStep.status === 'completed' && 'border-emerald-600/50 text-emerald-400',
                      )}
                    >
                      {selectedStep.status || 'pending'}
                    </Badge>
                  </div>
                  {selectedStep.responsibleRole && selectedStep.responsibleRole !== 'any' && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground">Responsible</p>
                      <Badge variant="outline" className="capitalize text-xs">{selectedStep.responsibleRole}</Badge>
                    </div>
                  )}
                  {selectedStep.status === 'completed' && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground">Completed by</p>
                      <p className="text-xs">{getUserName(selectedStep.completedBy)}</p>
                      {selectedStep.completedAt && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {formatDate(selectedStep.completedAt)}
                        </p>
                      )}
                      {selectedStep.comment && (
                        <p className="text-[10px] italic text-muted-foreground/70">"{selectedStep.comment}"</p>
                      )}
                    </div>
                  )}
                  {/* Complete step action — only on the active step */}
                  {selectedStep.status === 'active' && onCompleteStep && (
                    <div className="space-y-2 pt-1 border-t border-border/40">
                      <p className="text-[10px] text-muted-foreground font-semibold">Complete this step</p>
                      <Textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Optional comment…"
                        rows={2}
                        className="text-xs resize-none bg-background/60 text-foreground"
                      />
                      <Button
                        size="sm"
                        className="w-full gap-1.5 text-xs"
                        onClick={() => {
                          onCompleteStep(selectedIdx as number, comment);
                          setComment('');
                        }}
                        disabled={completing}
                      >
                        {completing
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {completing ? 'Completing…' : 'Mark Complete'}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs text-center px-3 gap-2 select-none py-8">
                  <LayoutDashboard className="h-6 w-6 opacity-30" />
                  <p>Click a node to see its details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-background/30">
          <ListView steps={steps} />
        </div>
      )}
    </div>
  );
}
