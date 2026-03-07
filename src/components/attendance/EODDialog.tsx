import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Moon, CheckCircle2, Circle, AlertCircle, Loader, Plus, Trash2 } from 'lucide-react';
import { taskAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface EODTask {
  _id: string;
  title: string;
  status: string;
  priority: string;
  estimatedTime?: number;
  isBODTask?: boolean;
  eodStatus: 'completed' | 'in-progress' | 'not-done';
  notes: string;
}

interface EODDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const EOD_STATUS_OPTIONS = [
  { value: 'completed', label: '✅ Completed', color: 'text-green-500' },
  { value: 'in-progress', label: '🔄 Still In Progress', color: 'text-blue-500' },
  { value: 'not-done', label: '⏸️ Not Done Today', color: 'text-muted-foreground' },
];

interface NewEODTask {
  id: string;
  title: string;
  description: string;
}

const EODDialog = ({ open, onClose, onConfirm }: EODDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eodTasks, setEodTasks] = useState<EODTask[]>([]);
  const [newTasks, setNewTasks] = useState<NewEODTask[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchTodayBODTasks();
  }, [open]);

  const fetchTodayBODTasks = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await taskAPI.getMyTasks({ isBODTask: true, bodDate: today });
      const tasks: any[] = res.data?.data || [];
      setEodTasks(
        tasks.map(t => ({
          _id: t._id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          estimatedTime: t.estimatedTime,
          isBODTask: t.isBODTask,
          eodStatus: t.status === 'completed' ? 'completed' : 'in-progress',
          notes: '',
        }))
      );
    } catch {
      // Non-blocking: just show empty state
    } finally {
      setLoading(false);
    }
  };

  const updateEodTask = (id: string, field: 'eodStatus' | 'notes', value: string) => {
    setEodTasks(prev => prev.map(t => (t._id === id ? { ...t, [field]: value } : t)));
  };

  const addNewTaskRow = () => {
    setNewTasks(prev => [...prev, { id: crypto.randomUUID(), title: '', description: '' }]);
    setShowAddTask(true);
  };

  const removeNewTask = (id: string) => {
    setNewTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateNewTask = (id: string, field: keyof NewEODTask, value: string) => {
    setNewTasks(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Update task statuses for tasks that changed
      await Promise.allSettled(
        eodTasks
          .filter(t => t.eodStatus === 'completed' && t.status !== 'completed')
          .map(t => taskAPI.updateTask(t._id, { status: 'completed', progress: 100 }))
      );

      // Add EOD notes as comments where provided
      await Promise.allSettled(
        eodTasks
          .filter(t => t.notes.trim())
          .map(t => taskAPI.addComment(t._id, { content: `[EOD Note] ${t.notes.trim()}` }))
      );

      // Create new tasks added during EOD
      const validNewTasks = newTasks.filter(t => t.title.trim());
      if (validNewTasks.length > 0) {
        const today = new Date();
        const bodDate = today.toISOString();
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 0, 0);
        const dueDate = endOfDay.toISOString();

        await Promise.allSettled(
          validNewTasks.map(t =>
            taskAPI.createTask({
              title: t.title.trim(),
              description: t.description.trim() || undefined,
              dueDate,
              isBODTask: true,
              bodDate,
              status: 'completed',
              progress: 100,
            })
          )
        );
      }

      toast({ title: 'Day summary saved', description: 'Have a great evening!' });
      setNewTasks([]);
      setShowAddTask(false);
      onConfirm();
    } catch {
      // Non-blocking — proceed to checkout even if updates fail
      toast({ title: 'Note', description: 'Some updates failed, but checkout will proceed', variant: 'destructive' });
      onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  const eodStatusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === 'in-progress') return <Loader className="h-4 w-4 text-blue-500" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Moon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">End of Day — How did it go?</DialogTitle>
              <DialogDescription>
                Review today's tasks before checking out. Add any notes for your team.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 min-h-[120px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : eodTasks.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              {/* <p className="text-sm text-muted-foreground">No BOD tasks found for today</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Skip & Check Out" to proceed</p> */}
            </div>
          ) : (
            eodTasks.map(task => (
              <div key={task._id} className="space-y-2 p-4 rounded-xl bg-secondary/30 border border-border">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{eodStatusIcon(task.eodStatus)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <Badge variant="outline" className="text-[10px]">{task.priority}</Badge>
                      {task.estimatedTime ? (
                        <span className="text-[10px] text-muted-foreground">~{task.estimatedTime >= 60 ? `${(task.estimatedTime / 60).toFixed(1).replace(/\.0$/, '')}h` : `${task.estimatedTime}m`}</span>
                      ) : null}
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Select
                        value={task.eodStatus}
                        onValueChange={v => updateEodTask(task._id, 'eodStatus', v as any)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EOD_STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="Notes (optional)..."
                        rows={1}
                        value={task.notes}
                        onChange={e => updateEodTask(task._id, 'notes', e.target.value)}
                        className="resize-none text-xs h-8 min-h-[32px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add new tasks section */}
        <div className="space-y-2 py-1">
          {newTasks.map((task, idx) => (
            <div key={task.id} className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">New Task {idx + 1}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeNewTask(task.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Task Title *</Label>
                <Input
                  placeholder="What did you work on?"
                  value={task.title}
                  onChange={e => updateNewTask(task.id, 'title', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  placeholder="Brief notes..."
                  rows={2}
                  value={task.description}
                  onChange={e => updateNewTask(task.id, 'description', e.target.value)}
                  className="resize-none text-xs"
                />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={addNewTaskRow}>
            <Plus className="h-3.5 w-3.5" />
            Add Task Not in BOD
          </Button>
        </div>

        {/* Summary bar */}
        {eodTasks.length > 0 && (
          <div className="flex gap-4 text-xs text-muted-foreground px-1">
            <span className="text-green-500 font-medium">
              ✅ {eodTasks.filter(t => t.eodStatus === 'completed').length} done
            </span>
            <span className="text-blue-500 font-medium">
              🔄 {eodTasks.filter(t => t.eodStatus === 'in-progress').length} in progress
            </span>
            <span>
              ⏸ {eodTasks.filter(t => t.eodStatus === 'not-done').length} not done
            </span>
          </div>
        )}

        <div className="flex justify-between gap-3 pt-2 border-t">
          {/* <Button variant="ghost" onClick={onConfirm} disabled={submitting}>
            Skip &amp; Check Out
          </Button> */}
          <Button
            className="bg-destructive hover:bg-destructive/90 gap-2"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            Submit &amp; Check Out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EODDialog;
