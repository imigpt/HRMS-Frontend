import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Sun, ClipboardList } from 'lucide-react';
import { taskAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

type EstimatedTimeType = 'custom' | 'before-lunch' | 'end';

interface BODTask {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  estimatedTimeType: EstimatedTimeType;
}

interface BODDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

const BODDialog = ({ open, onClose, onSubmit }: BODDialogProps) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<BODTask[]>([
    { id: crypto.randomUUID(), title: '', description: '', estimatedTime: '', estimatedTimeType: 'custom' },
  ]);

  const addTaskRow = () => {
    if (tasks.length >= 10) return;
    setTasks(prev => [...prev, { id: crypto.randomUUID(), title: '', description: '', estimatedTime: '', estimatedTimeType: 'custom' }]);
  };

  const removeTaskRow = (id: string) => {
    if (tasks.length === 1) return;
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTask = (id: string, field: keyof BODTask, value: string) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const isTaskValid = (t: BODTask) =>
    t.title.trim() !== '' && t.description.trim() !== '' && getEstimatedMinutes(t) > 0;

  const getEstimatedMinutes = (t: BODTask): number => {
    switch (t.estimatedTimeType) {
      case 'before-lunch':
        return 240; // 4 hours
      case 'end':
        return 480; // 8 hours
      case 'custom':
      default:
        return t.estimatedTime ? Math.round(parseFloat(t.estimatedTime) * 60) : 0;
    }
  };

  const handleSubmit = async () => {
    const valid = tasks.filter(t => t.title.trim());
    if (valid.length === 0) {
      toast({ title: 'Validation', description: 'Add at least one task with all required fields', variant: 'destructive' });
      return;
    }
    const incomplete = valid.filter(t => !isTaskValid(t));
    if (incomplete.length > 0) {
      toast({ title: 'Validation', description: 'Description and Estimated Time are required for each task', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date();
      const bodDate = today.toISOString();
      // Deadline: end of today
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 0, 0);
      const dueDate = endOfDay.toISOString();

      await Promise.all(
        valid.map(t =>
          taskAPI.createTask({
            title: t.title.trim(),
            description: t.description.trim() || undefined,
            estimatedTime: getEstimatedMinutes(t) || undefined,
            dueDate,
            isBODTask: true,
            bodDate,
          })
        )
      );

      toast({ title: 'Day planned!', description: `${valid.length} task(s) added for today` });
      setTasks([{ id: crypto.randomUUID(), title: '', description: '', estimatedTime: '', estimatedTimeType: 'custom' }]);
      onSubmit();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to create tasks',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
              <Sun className="h-5 w-5 text-warning" />
            </div>
            <div>
              <DialogTitle className="text-lg">Beginning of Day — Plan Your Tasks</DialogTitle>
              <DialogDescription>
                Add the tasks you plan to work on today. These will appear as your daily goals.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {tasks.map((task, idx) => (
            <div key={task.id} className="space-y-2 p-4 rounded-xl bg-secondary/30 border border-border">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="text-xs">Task {idx + 1}</Badge>
                {tasks.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTaskRow(task.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Task Title *</Label>
                <Input
                  placeholder="What will you work on?"
                  value={task.title}
                  onChange={e => updateTask(task.id, 'title', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Description *</Label>
                  <Textarea
                    placeholder="Brief notes..."
                    rows={2}
                    value={task.description}
                    onChange={e => updateTask(task.id, 'description', e.target.value)}
                    className="resize-none text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estimated Time *</Label>
                  <Select
                    value={task.estimatedTimeType}
                    onValueChange={(val: EstimatedTimeType) => {
                      setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, estimatedTimeType: val, estimatedTime: '' } : t)));
                    }}
                  >
                    <SelectTrigger className="h-9 bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Hours</SelectItem>
                      <SelectItem value="before-lunch">Before Lunch (4h)</SelectItem>
                      <SelectItem value="end">End of the Day (8h)</SelectItem>
                    </SelectContent>
                  </Select>
                  {task.estimatedTimeType === 'custom' && (
                    <Input
                      type="number"
                      placeholder="e.g. 2"
                      min="0.5"
                      step="0.5"
                      value={task.estimatedTime}
                      onChange={e => updateTask(task.id, 'estimatedTime', e.target.value)}
                      className="h-9 mt-1.5"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {tasks.length < 10 && (
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={addTaskRow}>
              <Plus className="h-4 w-4" />
              Add Another Task
            </Button>
          )}
        </div>

        <div className="flex justify-between gap-3 pt-2 border-t">
          {/* <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Skip for now
          </Button> */}
          <Button
            className="glow-button gap-2"
            onClick={handleSubmit}
            disabled={submitting || !tasks.some(isTaskValid)}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ClipboardList className="h-4 w-4" />
            )}
            Start My Day ({tasks.filter(t => t.title.trim()).length} task{tasks.filter(t => t.title.trim()).length !== 1 ? 's' : ''})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BODDialog;
