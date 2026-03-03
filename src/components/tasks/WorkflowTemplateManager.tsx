/**
 * WorkflowTemplateManager
 * Full CRUD management dialog for user-defined workflow templates.
 * Each template has a name + ordered list of steps.
 */

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Pencil, Trash2, Copy, ChevronUp, ChevronDown,
  Network, Save, X, Users, GripVertical, CheckCircle2,
  Loader2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { workflowAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─── types ────────────────────────────────────────────────────────────────

interface Step {
  _id?: string;
  title: string;
  description: string;
  responsibleRole: string;
  order: number;
}

interface Template {
  _id: string;
  name: string;
  description: string;
  steps: Step[];
  isShared: boolean;
  createdBy: { name: string; employeeId?: string };
  createdAt: string;
}

interface WorkflowTemplateManagerProps {
  open: boolean;
  onClose: () => void;
  /** When provided the manager opens in "pick" mode – selecting a template calls this */
  onSelect?: (template: Template) => void;
  /** Label for the select button in pick mode */
  selectLabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

const ROLES = ['any', 'admin', 'hr', 'employee'] as const;
const roleColors: Record<string, string> = {
  any: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  admin: 'bg-red-500/15 text-red-400 border-red-500/20',
  hr: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  employee: 'bg-green-500/15 text-green-400 border-green-500/20',
};

const emptyStep = (): Step => ({
  title: '',
  description: '',
  responsibleRole: 'any',
  order: 1,
});

// ─────────────────────────────────────────────────────────────────────────────

const WorkflowTemplateManager = ({
  open,
  onClose,
  onSelect,
  selectLabel = 'Use Template',
}: WorkflowTemplateManagerProps) => {
  const { toast } = useToast();

  // ── list state
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [loading, setLoading]       = useState(false);

  // ── panel mode: 'list' | 'create' | 'edit'
  const [panel, setPanel]           = useState<'list' | 'create' | 'edit'>('list');
  const [editing, setEditing]       = useState<Template | null>(null);

  // ── form state (shared for create/edit)
  const [formName, setFormName]     = useState('');
  const [formDesc, setFormDesc]     = useState('');
  const [formShared, setFormShared] = useState(false);
  const [formSteps, setFormSteps]   = useState<Step[]>([emptyStep()]);
  const [saving, setSaving]         = useState(false);

  // ─── load templates
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workflowAPI.getTemplates();
      setTemplates(res.data.data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load workflow templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      loadTemplates();
      setPanel('list');
    }
  }, [open, loadTemplates]);

  // ─── open create form
  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDesc('');
    setFormShared(false);
    setFormSteps([{ ...emptyStep() }]);
    setPanel('create');
  };

  // ─── open edit form
  const openEdit = (tpl: Template) => {
    setEditing(tpl);
    setFormName(tpl.name);
    setFormDesc(tpl.description);
    setFormShared(tpl.isShared);
    setFormSteps(tpl.steps.length ? [...tpl.steps] : [{ ...emptyStep() }]);
    setPanel('edit');
  };

  // ─── step helpers
  const addStep = () => {
    const maxOrder = formSteps.reduce((mx, s) => Math.max(mx, s.order), 0);
    setFormSteps(prev => [...prev, { ...emptyStep(), order: maxOrder + 1 }]);
  };

  const removeStep = (idx: number) =>
    setFormSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));

  const moveStep = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= formSteps.length) return;
    const updated = [...formSteps];
    [updated[idx], updated[next]] = [updated[next], updated[idx]];
    setFormSteps(updated.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const updateStep = (idx: number, field: keyof Step, value: string) =>
    setFormSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  // ─── save (create or edit)
  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Validation', description: 'Workflow name is required', variant: 'destructive' });
      return;
    }
    const validSteps = formSteps.filter(s => s.title.trim());
    if (validSteps.length === 0) {
      toast({ title: 'Validation', description: 'Add at least one step with a title', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name:        formName.trim(),
        description: formDesc,
        isShared:    formShared,
        steps:       validSteps.map((s, i) => ({ ...s, order: i + 1 })),
      };
      if (panel === 'create') {
        await workflowAPI.createTemplate(payload);
        toast({ title: 'Created', description: `"${formName.trim()}" workflow template created` });
      } else if (editing) {
        await workflowAPI.updateTemplate(editing._id, payload);
        toast({ title: 'Saved', description: `"${formName.trim()}" updated` });
      }
      await loadTemplates();
      setPanel('list');
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─── delete
  const handleDelete = async (tpl: Template) => {
    if (!confirm(`Delete template "${tpl.name}"? Tasks that already use it will keep their copy.`)) return;
    try {
      await workflowAPI.deleteTemplate(tpl._id);
      toast({ title: 'Deleted', description: `"${tpl.name}" removed` });
      setTemplates(prev => prev.filter(t => t._id !== tpl._id));
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Delete failed', variant: 'destructive' });
    }
  };

  // ─── duplicate
  const handleDuplicate = async (tpl: Template) => {
    try {
      await workflowAPI.duplicateTemplate(tpl._id);
      toast({ title: 'Duplicated', description: `Copy of "${tpl.name}" created` });
      loadTemplates();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Duplicate failed', variant: 'destructive' });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: step editor
  // ─────────────────────────────────────────────────────────────────────────
  const renderStepEditor = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Steps</Label>
        <Button size="sm" variant="outline" onClick={addStep} className="gap-1 text-xs h-7">
          <Plus className="h-3 w-3" /> Add Step
        </Button>
      </div>

      {formSteps.map((step, idx) => (
        <div key={idx} className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
            <Badge variant="outline" className="text-[10px] w-6 h-5 flex items-center justify-center flex-shrink-0">
              {idx + 1}
            </Badge>

            <Input
              value={step.title}
              onChange={e => updateStep(idx, 'title', e.target.value)}
              placeholder="Step title *"
              className="flex-1 h-7 text-xs bg-background"
            />

            <Select value={step.responsibleRole} onValueChange={v => updateStep(idx, 'responsibleRole', v)}>
              <SelectTrigger className={cn('w-24 h-7 text-[10px]', roleColors[step.responsibleRole])}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-0.5">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(idx, -1)} disabled={idx === 0}>
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(idx, 1)} disabled={idx === formSteps.length - 1}>
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeStep(idx)} disabled={formSteps.length === 1}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Textarea
            value={step.description}
            onChange={e => updateStep(idx, 'description', e.target.value)}
            placeholder="Step description (optional)"
            rows={1}
            className="text-xs bg-background resize-none ml-10"
          />
        </div>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: create / edit form panel
  // ─────────────────────────────────────────────────────────────────────────
  const renderForm = () => (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          {panel === 'create' ? 'Create Workflow Template' : `Edit "${editing?.name}"`}
        </h3>
        <Button size="sm" variant="ghost" onClick={() => setPanel('list')} className="h-7 px-2 text-xs gap-1">
          <X className="h-3 w-3" /> Cancel
        </Button>
      </div>

      <ScrollArea className="flex-1 pr-1">
        <div className="space-y-4 pb-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Workflow Name *</Label>
            <Input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder='e.g. "Website Development Flow"'
              className="bg-secondary/30"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description (optional)</Label>
            <Textarea
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Describe when to use this workflow"
              rows={2}
              className="bg-secondary/30 resize-none text-sm"
            />
          </div>

          {/* Shared toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border/50 p-3 bg-secondary/20">
            <div>
              <p className="text-xs font-medium">Share with team</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Allow all company members to use this template</p>
            </div>
            <button
              onClick={() => setFormShared(s => !s)}
              className={cn('flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border transition-colors',
                formShared
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-secondary text-muted-foreground border-border'
              )}
            >
              {formShared ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
              {formShared ? 'Shared' : 'Private'}
            </button>
          </div>

          <Separator />

          {/* Steps */}
          {renderStepEditor()}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border/50">
        <Button className="flex-1 gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Template'}
        </Button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: template list
  // ─────────────────────────────────────────────────────────────────────────
  const renderList = () => (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            Workflow Templates
          </h3>
          {onSelect && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Select a template to apply to the task
            </p>
          )}
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Create Workflow
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <Network className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No workflow templates yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create your first workflow to standardise task processes</p>
            <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Create Workflow
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pb-4 pr-1">
            {templates.map(tpl => (
              <div
                key={tpl._id}
                className="rounded-xl border border-border/60 bg-secondary/15 p-4 space-y-3 hover:border-primary/30 transition-colors"
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{tpl.name}</span>
                      {tpl.isShared && (
                        <Badge variant="outline" className="text-[9px] gap-1 px-1.5 py-0">
                          <Users className="h-2.5 w-2.5" /> Shared
                        </Badge>
                      )}
                    </div>
                    {tpl.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tpl.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      By {tpl.createdBy?.name || 'Unknown'} · {tpl.steps.length} step{tpl.steps.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1 flex-shrink-0">
                    {onSelect && (
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 bg-primary/90 hover:bg-primary"
                        onClick={() => { onSelect(tpl); onClose(); }}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {selectLabel}
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => openEdit(tpl)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Duplicate" onClick={() => handleDuplicate(tpl)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(tpl)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Steps preview */}
                {tpl.steps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tpl.steps.slice(0, 6).map((step, i) => (
                      <div key={step._id || i} className="flex items-center gap-1 text-[10px] rounded-full border border-border/50 bg-background px-2 py-0.5">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span>{step.title}</span>
                        {step.responsibleRole !== 'any' && (
                          <Badge className={cn('text-[9px] px-1 py-0 ml-0.5', roleColors[step.responsibleRole])}>
                            {step.responsibleRole}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {tpl.steps.length > 6 && (
                      <span className="text-[10px] text-muted-foreground/60 self-center">+{tpl.steps.length - 6} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background max-w-2xl h-[90vh] flex flex-col p-6 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Workflow Templates</DialogTitle>
          <DialogDescription>Create and manage user-defined workflow templates</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-0">
          {panel === 'list' ? renderList() : renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowTemplateManager;
