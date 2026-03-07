import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { taskAPI, workflowAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import WorkflowPicker from './WorkflowPicker';
import { Separator } from '@/components/ui/separator';

const toLocalDatetimeStr = (dateStr: string) => {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface TaskEditDialogProps {
  task: any;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  employees?: any[];
  projects?: any[];
  showAssignee?: boolean;
}

const TaskEditDialog = ({ task, open, onClose, onSaved, employees = [], projects = [], showAssignee = true }: TaskEditDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<{ templateId: string; workflowName: string; steps: any[] } | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
    startDate: '',
    estimatedTime: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        assignedTo: typeof task.assignedTo === 'object' ? task.assignedTo?._id : task.assignedTo || '',
        dueDate: task.dueDate ? toLocalDatetimeStr(task.dueDate) : '',
        startDate: task.startDate ? toLocalDatetimeStr(task.startDate) : '',
        estimatedTime: task.estimatedTime ? ([240, 480].includes(task.estimatedTime) ? task.estimatedTime.toString() : (task.estimatedTime / 60).toString()) : '',
        tags: task.tags || [],
      });
      // Pre-populate workflow from task
      if (task.taskWorkflow?.workflowName) {
        setSelectedWorkflow({
          templateId:   task.taskWorkflow.templateId || '',
          workflowName: task.taskWorkflow.workflowName,
          steps:        task.taskWorkflow.steps || [],
        });
      } else {
        setSelectedWorkflow(null);
      }
    }
  }, [task]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        tags: form.tags,
      };
      if (form.assignedTo) payload.assignedTo = form.assignedTo;
      if (form.dueDate) payload.dueDate = form.dueDate;
      if (form.startDate) payload.startDate = form.startDate;
      if (form.estimatedTime) {
        const et = parseFloat(form.estimatedTime);
        payload.estimatedTime = ['240', '480'].includes(form.estimatedTime) ? et : Math.round(et * 60);
      }
      await taskAPI.updateTask(task._id, payload);
      // Sync workflow changes
      try {
        if (selectedWorkflow) {
          await workflowAPI.assignToTask(task._id, {
            templateId:   selectedWorkflow.templateId || undefined,
            workflowName: selectedWorkflow.workflowName,
            steps:        selectedWorkflow.steps,
          });
        } else if (task.taskWorkflow?.workflowName && !selectedWorkflow) {
          await workflowAPI.removeFromTask(task._id);
        }
      } catch {/* workflow update is non-critical */}
      toast({ title: 'Success', description: 'Task updated successfully' });
      onSaved();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to update task', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update task details and assignment</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {showAssignee && employees.length > 0 && (
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={form.assignedTo} onValueChange={v => setForm(p => ({ ...p, assignedTo: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp._id} value={emp._id}>{emp.name} - {emp.department || 'N/A'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Task title" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Task description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estimated Time</Label>
              <Select
                value={form.estimatedTime === '' ? 'custom' : (['240', '480'].includes(form.estimatedTime) ? form.estimatedTime : 'custom')}
                onValueChange={(val) => {
                  if (val === '240') setForm(p => ({ ...p, estimatedTime: '240' }));
                  else if (val === '480') setForm(p => ({ ...p, estimatedTime: '480' }));
                  else setForm(p => ({ ...p, estimatedTime: '' }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Hours</SelectItem>
                  <SelectItem value="240">Before Lunch (~4h)</SelectItem>
                  <SelectItem value="480">Evening of the Day (~8h)</SelectItem>
                </SelectContent>
              </Select>
              {!['240', '480'].includes(form.estimatedTime) && (
                <Input type="number" value={form.estimatedTime} onChange={e => setForm(p => ({ ...p, estimatedTime: e.target.value }))} placeholder="e.g. 2" min="0.5" step="0.5" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date & Time</Label>
              <Input type="datetime-local" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Due Date & Time</Label>
              <Input type="datetime-local" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (tagInput.trim()) {
                      setForm(p => ({ ...p, tags: [...p.tags, tagInput.trim()] }));
                      setTagInput('');
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (tagInput.trim()) {
                    setForm(p => ({ ...p, tags: [...p.tags, tagInput.trim()] }));
                    setTagInput('');
                  }
                }}
                disabled={!tagInput.trim()}
              >
                Add
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag: string, i: number) => (
                  <Badge key={`${tag}-${i}`} variant="outline" className="gap-1">
                    {tag}
                    <button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter((_: string, idx: number) => idx !== i) }))}>
                      <span className="text-xs">&times;</span>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {/* Workflow */}
          <Separator />
          <WorkflowPicker value={selectedWorkflow} onChange={setSelectedWorkflow} />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.title.trim() || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditDialog;
