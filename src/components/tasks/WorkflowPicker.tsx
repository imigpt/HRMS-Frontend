/**
 * WorkflowPicker
 * Compact inline widget used inside Task Create / Edit dialogs.
 * Lets users select a template or skip workflow assignment.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Network, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { workflowAPI } from '@/lib/apiClient';
import WorkflowTemplateManager from './WorkflowTemplateManager';
import { cn } from '@/lib/utils';

const roleColors: Record<string, string> = {
  any: 'bg-blue-500/15 text-blue-400',
  admin: 'bg-red-500/15 text-red-400',
  hr: 'bg-purple-500/15 text-purple-400',
  employee: 'bg-green-500/15 text-green-400',
};

interface WorkflowPickerProps {
  /** Controlled value — the selected template object (or null for none) */
  value: { templateId: string; workflowName: string; steps: any[] } | null;
  onChange: (value: { templateId: string; workflowName: string; steps: any[] } | null) => void;
}

const WorkflowPicker = ({ value, onChange }: WorkflowPickerProps) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [expanded, setExpanded]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await workflowAPI.getTemplates();
      setTemplates(res.data.data || []);
    } catch {/* ignore */}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSelect = (templateId: string) => {
    if (templateId === '__none__') {
      onChange(null);
      return;
    }
    const tpl = templates.find(t => t._id === templateId);
    if (!tpl) return;
    onChange({ templateId: tpl._id, workflowName: tpl.name, steps: tpl.steps });
  };

  const handleManagerSelect = (tpl: any) => {
    onChange({ templateId: tpl._id, workflowName: tpl.name, steps: tpl.steps });
    setExpanded(true);
  };

  const handleManagerCreated = () => {
    load(); // re-fetch after create
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1.5">
          <Network className="h-3.5 w-3.5 text-primary" />
          Workflow Template
          <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 text-[10px] gap-1 px-2"
          onClick={() => setManagerOpen(true)}
        >
          <Plus className="h-3 w-3" /> Manage
        </Button>
      </div>

      {/* Selector */}
      <div className="flex gap-2">
        <Select
          value={value?.templateId || '__none__'}
          onValueChange={handleSelect}
          disabled={loading}
        >
          <SelectTrigger className="flex-1 h-8 text-xs bg-secondary/30">
            <SelectValue placeholder="No workflow" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-xs text-muted-foreground">
              — No workflow —
            </SelectItem>
            {templates.map(tpl => (
              <SelectItem key={tpl._id} value={tpl._id} className="text-xs">
                <span className="font-medium">{tpl.name}</span>
                <span className="text-muted-foreground ml-1.5">({tpl.steps.length} steps)</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {value && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
            onClick={() => onChange(null)}
            title="Remove workflow"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Preview of selected template steps */}
      {value && value.steps.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-secondary/10 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary/30 transition-colors"
            onClick={() => setExpanded(e => !e)}
          >
            <span className="font-medium flex items-center gap-1.5">
              <Network className="h-3 w-3 text-primary" />
              {value.workflowName}
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">{value.steps.length} steps</Badge>
            </span>
            {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          </button>

          {expanded && (
            <div className="px-3 pb-3 space-y-1.5 border-t border-border/30">
              {value.steps.map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className={cn(
                    'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold',
                    'bg-primary/15 text-primary'
                  )}>{i + 1}</span>
                  <span className="flex-1">{step.title}</span>
                  {step.responsibleRole && step.responsibleRole !== 'any' && (
                    <Badge className={cn('text-[9px] px-1.5 py-0 capitalize', roleColors[step.responsibleRole])}>
                      {step.responsibleRole}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template Manager dialog (for creating new templates) */}
      <WorkflowTemplateManager
        open={managerOpen}
        onClose={() => { setManagerOpen(false); handleManagerCreated(); }}
        onSelect={handleManagerSelect}
        selectLabel="Use Template"
      />
    </div>
  );
};

export default WorkflowPicker;
