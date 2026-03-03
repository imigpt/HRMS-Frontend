import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { taskAPI, workflowAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import WorkflowPicker from './WorkflowPicker';

interface TaskCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  employees?: any[];
  projects?: any[];
  showAssignee?: boolean;
  defaultAssignee?: string;
}

const TaskCreateDialog = ({
  open,
  onClose,
  onCreated,
  employees = [],
  projects = [],
  showAssignee = true,
  defaultAssignee,
}: TaskCreateDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tagInput, setTagInput]     = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<{ templateId: string; workflowName: string; steps: any[] } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: defaultAssignee || '',
    priority: 'medium',
    dueDate: '',
    startDate: '',
    project: '',
    milestone: '',
    estimatedTime: '',
    tags: [] as string[],
  });

  useEffect(() => {
    if (formData.project) {
      taskAPI.getMilestones(formData.project).then(res => {
        setMilestones(res.data.data || []);
      }).catch(() => setMilestones([]));
    } else {
      setMilestones([]);
      setFormData(prev => ({ ...prev, milestone: '' }));
    }
  }, [formData.project]);

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.dueDate || (showAssignee && !formData.assignedTo)) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // Resolve assignee: explicit selection → defaultAssignee prop → current user (self-assign)
      const resolvedAssignee = formData.assignedTo || defaultAssignee || user?._id;
      const payload: any = {
        title: formData.title,
        description: formData.description,
        assignedTo: resolvedAssignee,
        priority: formData.priority,
        dueDate: formData.dueDate,
      };
      if (formData.startDate) payload.startDate = formData.startDate;
      if (formData.project) payload.project = formData.project;
      if (formData.milestone) payload.milestone = formData.milestone;
      if (formData.estimatedTime) payload.estimatedTime = parseInt(formData.estimatedTime);
      if (formData.tags.length > 0) payload.tags = formData.tags;

      const createRes = await taskAPI.createTask(payload);
      const newTaskId = createRes.data?.data?._id;
      // Apply selected workflow to the newly created task
      if (selectedWorkflow && newTaskId) {
        try {
          await workflowAPI.assignToTask(newTaskId, {
            templateId:   selectedWorkflow.templateId,
            workflowName: selectedWorkflow.workflowName,
          });
        } catch {/* workflow attachment is non-critical */}
      }
      toast({ title: 'Success', description: 'Task created successfully' });
      setFormData({
        title: '', description: '', assignedTo: defaultAssignee || '', priority: 'medium',
        dueDate: '', startDate: '', project: '', milestone: '', estimatedTime: '', tags: [],
      });
      setSelectedWorkflow(null);
      onCreated();
      onClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create task', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Create and assign a new task</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {showAssignee && (
            <div className="space-y-2">
              <Label>Assign To *</Label>
              <Select value={formData.assignedTo} onValueChange={(val) => setFormData({ ...formData, assignedTo: val })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.name} - {emp.department || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Task Title *</Label>
            <Input placeholder="Enter task title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Enter task description" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority *</Label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
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
              <Label>Estimated Time (minutes)</Label>
              <Input type="number" placeholder="e.g. 120" value={formData.estimatedTime} onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
            </div>
          </div>
          {projects.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={formData.project} onValueChange={(val) => setFormData({ ...formData, project: val === 'none' ? '' : val })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {milestones.length > 0 && (
                <div className="space-y-2">
                  <Label>Milestone</Label>
                  <Select value={formData.milestone} onValueChange={(val) => setFormData({ ...formData, milestone: val === 'none' ? '' : val })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {milestones.map(m => (
                        <SelectItem key={m._id} value={m._id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" variant="outline" onClick={handleAddTag} disabled={!tagInput.trim()}>Add</Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {/* Workflow */}
          <WorkflowPicker value={selectedWorkflow} onChange={setSelectedWorkflow} />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!formData.title || !formData.dueDate || submitting}>
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskCreateDialog;
