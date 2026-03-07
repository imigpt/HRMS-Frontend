import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Eye, Download, Trash2, Star, Send, Paperclip, Clock,
  Calendar, Image, Video, FileText, Code, Loader2, Tag,
  MessageSquare, Activity, Timer, Play, Square, Upload, ArrowRight,
  GitBranch, Plus, CheckCircle2, Circle, AlertTriangle, User,
  FileUp, Edit3, ArrowRightLeft, UserPlus, Network,
} from 'lucide-react';
import { getPriorityColor, getStatusColor, statusLabels, formatDate, formatDuration, getInitials, getUserName, isOverdue } from './task-helpers';
import { taskAPI, workflowAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import WorkflowTemplateManager from './WorkflowTemplateManager';
import { TaskWorkflowCanvas } from './TaskWorkflowCanvas';

interface TaskDetailDialogProps {
  task: any;
  open: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  canReview?: boolean;
  canUpload?: boolean;
  canComment?: boolean;
  canTrackTime?: boolean;
  showAssignee?: boolean;
  userRole?: string;
  employees?: any[];
}

const getAttachmentIcon = (type: string) => {
  switch (type) {
    case 'image': return <Image className="h-4 w-4 text-blue-400" />;
    case 'video': return <Video className="h-4 w-4 text-purple-400" />;
    case 'document': return <FileText className="h-4 w-4 text-orange-400" />;
    case 'api': return <Code className="h-4 w-4 text-green-400" />;
    default: return <FileText className="h-4 w-4 text-primary" />;
  }
};

const getActivityIcon = (action: string) => {
  if (action?.includes('created')) return <Plus className="h-3.5 w-3.5 text-green-400" />;
  if (action?.includes('status') || action?.includes('workflow') || action?.includes('transition'))
    return <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400" />;
  if (action?.includes('assign') || action?.includes('reassign'))
    return <UserPlus className="h-3.5 w-3.5 text-purple-400" />;
  if (action?.includes('comment')) return <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />;
  if (action?.includes('attachment') || action?.includes('file'))
    return <FileUp className="h-3.5 w-3.5 text-orange-400" />;
  if (action?.includes('progress')) return <Activity className="h-3.5 w-3.5 text-primary" />;
  if (action?.includes('review')) return <Star className="h-3.5 w-3.5 text-yellow-400" />;
  if (action?.includes('priority')) return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
  if (action?.includes('completed')) return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  if (action?.includes('time')) return <Timer className="h-3.5 w-3.5 text-teal-400" />;
  return <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />;
};

const TaskDetailDialog = ({
  task,
  open,
  onClose,
  onTaskUpdated,
  canReview = false,
  canUpload = false,
  canComment = true,
  canTrackTime = false,
  showAssignee = true,
  userRole = 'employee',
  employees = [],
}: TaskDetailDialogProps) => {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState('');
  const [reviewComment, setReviewComment] = useState(task?.review?.comment || '');
  const [reviewRating, setReviewRating] = useState(task?.review?.rating || 0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [transitionComment, setTransitionComment] = useState('');
  const [availableTransitions, setAvailableTransitions] = useState<any[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subtask state
  const [childTasks, setChildTasks]           = useState<any[]>([]);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subtaskSubmitting, setSubtaskSubmitting] = useState(false);
  const [subtaskForm, setSubtaskForm] = useState({
    title: '', description: '', assignedTo: '', startDate: '', dueDate: '', priority: 'medium',
  });

  // Progress editing state (manual update when no subtasks)
  const [localProgress, setLocalProgress] = useState<number>(task?.progress ?? 0);
  const [progressUpdating, setProgressUpdating] = useState(false);

  // Keep localProgress in sync when task prop changes
  useEffect(() => { setLocalProgress(task?.progress ?? 0); }, [task?._id, task?.progress]);

  // User-defined workflow state
  const [workflowManagerOpen, setWorkflowManagerOpen] = useState(false);
  const [stepComment, setStepComment]     = useState('');
  const [advancingStep, setAdvancingStep] = useState<number | null>(null);
  const [taskWorkflow, setTaskWorkflow]   = useState<any>(task?.taskWorkflow || null);

  // Keep local taskWorkflow in sync when parent task prop refreshes
  useEffect(() => { setTaskWorkflow(task?.taskWorkflow || null); }, [task?.taskWorkflow]);

  // Fetch available transitions + child tasks when task changes
  useEffect(() => {
    if (task?._id && open) {
      taskAPI.getAvailableTransitions(task._id).then(res => {
        setAvailableTransitions(res.data?.data?.transitions || []);
      }).catch(() => setAvailableTransitions([]));

      // Fetch child tasks (subtasks)
      taskAPI.getTasks({ parentTask: task._id }).then(res => {
        setChildTasks(res.data?.data || []);
      }).catch(() => setChildTasks([]));
    }
  }, [task?._id, task?.status, open]);

  useEffect(() => {
    if (task) {
      setReviewComment(task.review?.comment || '');
      setReviewRating(task.review?.rating || 0);
    }
  }, [task?._id]);

  if (!task) return null;

  const overdue = isOverdue(task.dueDate, task.status);

  // Compute dynamic progress from subtasks
  const subtaskProgress = childTasks.length > 0
    ? Math.round(childTasks.reduce((sum: number, c: any) => sum + (c.progress || 0), 0) / childTasks.length)
    : task.progress;

  const handleUpdateProgress = async (value: number) => {
    setProgressUpdating(true);
    try {
      await taskAPI.updateProgress(task._id, value);
      toast({ title: 'Progress updated', description: `Task progress set to ${value}%` });
      onTaskUpdated();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update progress', variant: 'destructive' });
    } finally {
      setProgressUpdating(false);
    }
  };

  const handleTransition = async (action: string) => {
    setTransitioning(true);
    try {
      await taskAPI.transitionTask(task._id, { action, comment: transitionComment || undefined });
      toast({ title: 'Success', description: `Task transitioned successfully` });
      setTransitionComment('');
      onTaskUpdated();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Transition failed', variant: 'destructive' });
    } finally {
      setTransitioning(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await taskAPI.addComment(task._id, { content: commentText });
      toast({ title: 'Success', description: 'Comment added' });
      setCommentText('');
      onTaskUpdated();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to add comment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) return;
    setSubmitting(true);
    try {
      await taskAPI.addReview(task._id, { comment: reviewComment, rating: reviewRating || undefined });
      toast({ title: 'Success', description: 'Review submitted' });
      onTaskUpdated();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to submit review', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let fileType = 'document';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';
      await taskAPI.addAttachment(task._id, file, fileType);
      toast({ title: 'Success', description: 'Attachment uploaded' });
      onTaskUpdated();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to upload', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await taskAPI.deleteAttachment(task._id, attachmentId);
      toast({ title: 'Success', description: 'Attachment deleted' });
      onTaskUpdated();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateSubtask = async () => {
    if (!subtaskForm.title.trim()) return;
    setSubtaskSubmitting(true);
    try {
      await taskAPI.createTask({
        title: subtaskForm.title,
        description: subtaskForm.description,
        assignedTo: subtaskForm.assignedTo || task.assignedTo?._id || task.assignedTo,
        priority: subtaskForm.priority,
        startDate: subtaskForm.startDate || undefined,
        dueDate: subtaskForm.dueDate || task.dueDate,
        parentTask: task._id,
      });
      toast({ title: 'Success', description: 'Subtask created' });
      setSubtaskForm({ title: '', description: '', assignedTo: '', startDate: '', dueDate: '', priority: 'medium' });
      setShowSubtaskForm(false);
      onTaskUpdated();
      // Refresh child tasks
      const res = await taskAPI.getTasks({ parentTask: task._id });
      setChildTasks(res.data?.data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create subtask', variant: 'destructive' });
    } finally {
      setSubtaskSubmitting(false);
    }
  };

  // Build unified activity timeline
  const buildTimeline = () => {
    const items: any[] = [];

    // Workflow history entries
    (task.workflowHistory || []).forEach((entry: any) => {
      items.push({
        type: 'workflow',
        icon: <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400" />,
        user: getUserName(entry.performedBy),
        action: `${statusLabels[entry.fromStatus] || entry.fromStatus} → ${statusLabels[entry.toStatus] || entry.toStatus}`,
        detail: entry.comment,
        time: entry.timestamp,
        badge: entry.toStatus,
      });
    });

    // Activity log entries
    (task.activityLog || []).forEach((entry: any) => {
      items.push({
        type: 'activity',
        icon: getActivityIcon(entry.action),
        user: getUserName(entry.user),
        action: entry.action?.replace(/_/g, ' '),
        detail: entry.details,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        time: entry.createdAt,
      });
    });

    // Comments
    (task.comments || []).forEach((c: any) => {
      items.push({
        type: 'comment',
        icon: <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />,
        user: getUserName(c.user),
        action: 'commented',
        detail: c.content,
        time: c.createdAt,
      });
    });

    // Attachments
    (task.attachments || []).forEach((a: any) => {
      items.push({
        type: 'attachment',
        icon: <FileUp className="h-3.5 w-3.5 text-orange-400" />,
        user: getUserName(a.uploadedBy),
        action: `uploaded "${a.name}"`,
        time: a.uploadedAt,
      });
    });

    // Sort by time descending
    items.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
    return items;
  };

  // ── Complete a user-defined workflow step ──
  const handleCompleteStep = async (stepIndex: number, comment?: string) => {
    if (!task._id) return;
    setAdvancingStep(stepIndex);
    try {
      const res = await workflowAPI.completeStep(task._id, stepIndex, comment || stepComment || undefined);
      setTaskWorkflow(res.data.data);
      setStepComment('');
      toast({ title: 'Step completed', description: 'Workflow advanced to next step' });
      onTaskUpdated();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to advance step', variant: 'destructive' });
    } finally {
      setAdvancingStep(null);
    }
  };

  // ── Apply template to task from Workflow tab ──
  const handleAssignWorkflow = async (tpl: any) => {
    if (!task._id) return;
    try {
      const res = await workflowAPI.assignToTask(task._id, {
        templateId:   tpl._id,
        workflowName: tpl.name,
      });
      setTaskWorkflow(res.data.data);
      toast({ title: 'Workflow assigned', description: `"${tpl.name}" applied to this task` });
      onTaskUpdated();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to assign workflow', variant: 'destructive' });
    }
  };

  // ── Remove workflow from task ──
  const handleRemoveWorkflow = async () => {
    if (!task._id || !confirm('Remove the current workflow from this task?')) return;
    try {
      await workflowAPI.removeFromTask(task._id);
      setTaskWorkflow(null);
      toast({ title: 'Removed', description: 'Workflow removed from task' });
      onTaskUpdated();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to remove workflow', variant: 'destructive' });
    }
  };

  // ── Workflow PDF Download ──
  const WORKFLOW_ACTION_LABELS: Record<string, string> = {
    created: 'Task Created',
    submit: 'Submitted for Approval',
    approve: 'Approved & Assigned',
    start: 'Work Started',
    'submit-review': 'Submitted for Review',
    'approve-review': 'Review Approved — Completed',
    reject: 'Rejected',
    close: 'Closed',
    reopen: 'Reopened',
    'send-back': 'Sent Back to In Progress',
    override: 'Status Override',
  };
  const getWorkflowActionLabel = (action: string) =>
    WORKFLOW_ACTION_LABELS[action] || action?.replace(/-/g, ' ') || 'Unknown';

  const downloadWorkflowPDF = () => {
    const win = window.open('', '_blank');
    if (!win) {
      toast({ title: 'Popup blocked', description: 'Please allow popups for this site.', variant: 'destructive' });
      return;
    }
    const taskId = task.taskId || task._id || 'unknown';
    const entries = [...(task.workflowHistory || [])].reverse();
    const sl = (s: string) => statusLabels[s] || s || '—';
    const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8" />
<title>Task Workflow — ${taskId}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 32px; color: #1a1a1a; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #555; margin-bottom: 28px; font-size: 12px; }
  .timeline { position: relative; padding-left: 28px; border-left: 2px solid #d1d5db; }
  .entry { margin-bottom: 22px; position: relative; }
  .dot { position: absolute; left: -37px; top: 2px; width: 16px; height: 16px; border-radius: 50%; background: #6366f1; border: 3px solid #fff; box-shadow: 0 0 0 2px #6366f1; }
  .dot.current { background: #10b981; box-shadow: 0 0 0 2px #10b981; }
  .action { font-weight: 700; font-size: 14px; margin-bottom: 3px; }
  .badges { display: flex; gap: 6px; margin: 4px 0; flex-wrap: wrap; align-items: center; }
  .badge { padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; background: #e5e7eb; color: #374151; }
  .badge.current { background: #d1fae5; color: #065f46; }
  .by { color: #444; font-size: 12px; margin-top: 2px; }
  .comment { font-style: italic; color: #666; margin-top: 5px; padding: 5px 10px; background: #f3f4f6; border-radius: 6px; font-size: 12px; }
  .ts { color: #999; font-size: 11px; margin-top: 3px; }
  @media print { body { margin: 16px; } }
</style>
</head><body>
<h1>Task Workflow — ${(task.title || taskId).replace(/</g, '&lt;')}</h1>
<div class="meta">
  Task ID: ${taskId} &nbsp;|&nbsp;
  Assigned To: ${getUserName(task.assignedTo)} &nbsp;|&nbsp;
  Current Status: <strong>${sl(task.status)}</strong> &nbsp;|&nbsp;
  Generated: ${new Date().toLocaleString()}
</div>
<div class="timeline">
${entries.map((e: any, i: number) => `
  <div class="entry">
    <div class="dot${i === 0 ? ' current' : ''}"></div>
    <div class="action">${getWorkflowActionLabel(e.action)}</div>
    <div class="badges">
      ${e.fromStatus && e.fromStatus !== e.toStatus ? `<span class="badge">${sl(e.fromStatus)}</span><span style="margin:0 3px">→</span>` : ''}
      <span class="badge${i === 0 ? ' current' : ''}">${sl(e.toStatus)}</span>
    </div>
    <div class="by">By: <strong>${getUserName(e.performedBy)}</strong>${e.performedByRole ? ` (${e.performedByRole})` : ''}</div>
    <div class="ts">${e.timestamp ? new Date(e.timestamp).toLocaleString() : ''}</div>
    ${e.comment ? `<div class="comment">"${e.comment}"</div>` : ''}
  </div>`).join('')}
</div>
</body></html>`;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background max-w-5xl max-h-[92vh] p-0">
        <ScrollArea className="max-h-[92vh]">
          <div className="p-6 space-y-5">
            {/* ── Header ── */}
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {overdue && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                    <DialogTitle className="text-2xl font-bold truncate">{task.title}</DialogTitle>
                  </div>
                  {task.description && (
                    <DialogDescription className="text-muted-foreground mt-1 line-clamp-2">{task.description}</DialogDescription>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Badge className={`text-sm px-3 py-1 ${getStatusColor(task.status)}`}>
                    {statusLabels[task.status] || task.status}
                  </Badge>
                  <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                    {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)} Priority
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            {/* ── Workflow Transition Buttons ── */}
            {availableTransitions.length > 0 && (
              <div className="space-y-3 p-4 rounded-xl bg-gradient-to-r from-secondary/50 to-secondary/30 border border-border">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />Workflow Actions
                </Label>
                <div className="flex flex-wrap gap-2">
                  {availableTransitions.filter(t => t.action !== 'override').map((transition: any) => (
                    <Button
                      key={transition.action}
                      size="sm"
                      variant={transition.action === 'reject' || transition.action === 'send-back' ? 'destructive' : transition.action === 'approve' || transition.action === 'approve-review' ? 'default' : 'outline'}
                      onClick={() => handleTransition(transition.action)}
                      disabled={transitioning}
                      className="gap-1.5"
                    >
                      {transitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                      {transition.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Add a comment for this transition (optional)..."
                  rows={2}
                  value={transitionComment}
                  onChange={(e) => setTransitionComment(e.target.value)}
                  className="text-sm bg-background/50"
                />
              </div>
            )}

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <p className="text-2xl font-bold text-primary">{subtaskProgress}%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Progress</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-2xl font-bold text-blue-400">{childTasks.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Subtasks</p>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                <p className="text-2xl font-bold text-cyan-400">{task.comments?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Comments</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                <p className="text-2xl font-bold text-orange-400">{task.attachments?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Files</p>
              </div>
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center">
                <p className="text-2xl font-bold text-teal-400">{formatDuration(task.actualTime || 0)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Time Logged</p>
              </div>
            </div>

            {/* ── Progress Bar ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-medium">Overall Progress</Label>
                <span className={`text-sm font-bold ${subtaskProgress === 100 ? 'text-green-500' : 'text-primary'}`}>
                  {childTasks.length > 0 ? subtaskProgress : localProgress}%
                </span>
              </div>
              <Progress value={childTasks.length > 0 ? subtaskProgress : localProgress} className="h-3 rounded-full" />
              {childTasks.length > 0 ? (
                <p className="text-[10px] text-muted-foreground">
                  Auto-calculated from {childTasks.filter((c: any) => c.status === 'completed').length}/{childTasks.length} completed subtasks
                </p>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={localProgress}
                      onChange={(e) => setLocalProgress(Number(e.target.value))}
                      className="flex-1 h-2 accent-primary cursor-pointer"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={localProgress}
                        onChange={(e) => {
                          const v = Math.min(100, Math.max(0, Number(e.target.value)));
                          setLocalProgress(v);
                        }}
                        className="w-14 h-6 text-xs text-center rounded border border-border bg-secondary text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <Button
                        size="sm"
                        className="h-6 px-2 text-xs glow-button"
                        disabled={progressUpdating || localProgress === (task.progress ?? 0)}
                        onClick={() => handleUpdateProgress(localProgress)}
                      >
                        {progressUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Drag the slider or type a value (0–100%) and click Save</p>
                </div>
              )}
            </div>

            {/* ── Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-6 bg-secondary/40">
                <TabsTrigger value="details" className="text-xs gap-1"><Eye className="h-3 w-3" />Details</TabsTrigger>
                <TabsTrigger value="subtasks" className="text-xs gap-1">
                  <GitBranch className="h-3 w-3" />Subtasks {childTasks.length > 0 && `(${childTasks.length})`}
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-xs gap-1">
                  <MessageSquare className="h-3 w-3" />Comments {task.comments?.length > 0 && `(${task.comments.length})`}
                </TabsTrigger>
                <TabsTrigger value="attachments" className="text-xs gap-1">
                  <Paperclip className="h-3 w-3" />Files {task.attachments?.length > 0 && `(${task.attachments.length})`}
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs gap-1">
                  <Activity className="h-3 w-3" />History
                </TabsTrigger>
                <TabsTrigger value="workflow" className="text-xs gap-1">
                  <Network className="h-3 w-3" />Workflow {task.workflowHistory?.length > 0 && `(${task.workflowHistory.length})`}
                </TabsTrigger>
              </TabsList>

              {/* ── Details Tab ── */}
              <TabsContent value="details" className="space-y-6 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {showAssignee && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Assigned To</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-8 w-8 border-2 border-primary/20">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                            {getInitials(getUserName(task.assignedTo))}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-sm font-medium">{getUserName(task.assignedTo)}</span>
                          {task.assignedTo?.department && (
                            <p className="text-[10px] text-muted-foreground">{task.assignedTo.department}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Priority</Label>
                    <div className="mt-1">
                      <Badge className={`${getPriorityColor(task.priority)}`}>
                        {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Due Date</Label>
                    <p className={`text-sm mt-1 flex items-center gap-1 ${overdue ? 'text-destructive font-bold' : ''}`}>
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(task.dueDate)}
                      {overdue && ' (Overdue)'}
                    </p>
                  </div>
                  {task.startDate && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Start Date</Label>
                      <p className="text-sm mt-1">{formatDate(task.startDate)}</p>
                    </div>
                  )}
                  {task.project && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Project</Label>
                      <p className="text-sm mt-1 font-medium">
                        {typeof task.project === 'string' ? task.project : task.project.name}
                      </p>
                    </div>
                  )}
                  {task.milestone && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Milestone</Label>
                      <p className="text-sm mt-1">
                        {typeof task.milestone === 'string' ? task.milestone : task.milestone.title}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Tags</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {task.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs gap-1 bg-secondary/50">
                          <Tag className="h-3 w-3" />{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review */}
                {task.review?.comment && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Review</Label>
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      {task.review.rating && (
                        <div className="flex items-center gap-1 mb-2">
                          {[1,2,3,4,5].map((i: number) => (
                            <Star key={i} className={`h-4 w-4 ${i <= task.review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                          ))}
                          <span className="text-xs ml-1 text-muted-foreground">{task.review.rating}/5</span>
                        </div>
                      )}
                      <p className="text-sm">{task.review.comment}</p>
                      {task.review.reviewedBy && (
                        <p className="text-xs text-muted-foreground mt-2">
                          by {getUserName(task.review.reviewedBy)}
                          {task.review.reviewedAt && ` on ${formatDate(task.review.reviewedAt)}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Review Form */}
                {canReview && (
                  <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
                    <Label className="text-sm font-semibold">{task.review?.comment ? 'Edit Review' : 'Add Review'}</Label>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <button key={i} type="button" onClick={() => setReviewRating(i)} className="p-0.5 hover:scale-125 transition-transform">
                          <Star className={`h-5 w-5 ${i <= reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                        </button>
                      ))}
                      {reviewRating > 0 && (
                        <button type="button" onClick={() => setReviewRating(0)} className="ml-2 text-xs text-muted-foreground hover:text-foreground">Clear</button>
                      )}
                    </div>
                    <Textarea placeholder="Write your review..." rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                    <Button size="sm" onClick={handleSubmitReview} disabled={!reviewComment.trim() || submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                      Submit Review
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* ── Subtasks Tab ── */}
              <TabsContent value="subtasks" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary" />
                      Subtasks ({childTasks.length})
                    </h3>
                    {childTasks.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {childTasks.filter((c: any) => c.status === 'completed').length} completed
                      </p>
                    )}
                  </div>
                  {(userRole === 'admin' || userRole === 'hr' || userRole === 'employee') && (
                    <Button size="sm" variant="outline" onClick={() => setShowSubtaskForm(!showSubtaskForm)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />Add Subtask
                    </Button>
                  )}
                </div>

                {/* Subtask Creation Form */}
                {showSubtaskForm && (
                  <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs">Title *</Label>
                        <Input placeholder="Subtask title" value={subtaskForm.title} onChange={e => setSubtaskForm(p => ({ ...p, title: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Textarea placeholder="Optional description" rows={2} value={subtaskForm.description} onChange={e => setSubtaskForm(p => ({ ...p, description: e.target.value }))} />
                      </div>
                      {employees.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Assign To</Label>
                          <Select value={subtaskForm.assignedTo} onValueChange={v => setSubtaskForm(p => ({ ...p, assignedTo: v }))}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Same as parent" /></SelectTrigger>
                            <SelectContent>
                              {employees.map((emp: any) => (
                                <SelectItem key={emp._id} value={emp._id} className="text-xs">{emp.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Priority</Label>
                        <Select value={subtaskForm.priority} onValueChange={v => setSubtaskForm(p => ({ ...p, priority: v }))}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Start Date & Time</Label>
                        <Input type="datetime-local" className="h-9 text-xs" value={subtaskForm.startDate} onChange={e => setSubtaskForm(p => ({ ...p, startDate: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Due Date & Time</Label>
                        <Input type="datetime-local" className="h-9 text-xs" value={subtaskForm.dueDate} onChange={e => setSubtaskForm(p => ({ ...p, dueDate: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setShowSubtaskForm(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleCreateSubtask} disabled={!subtaskForm.title.trim() || subtaskSubmitting}>
                        {subtaskSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                        Create
                      </Button>
                    </div>
                  </div>
                )}

                {/* Subtask List */}
                {childTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <GitBranch className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No subtasks yet</p>
                    <p className="text-xs text-muted-foreground">Break this task into smaller pieces for better tracking</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {childTasks.map((child: any) => (
                      <div key={child._id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border hover:bg-secondary/40 transition-colors">
                        {child.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${child.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{child.title}</p>
                            <Badge className={`text-[10px] ${getPriorityColor(child.priority)}`}>
                              {child.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className={`text-[10px] ${getStatusColor(child.status)}`}>
                              {statusLabels[child.status] || child.status}
                            </Badge>
                            {child.assignedTo && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <User className="h-2.5 w-2.5" />{getUserName(child.assignedTo)}
                              </span>
                            )}
                            {child.dueDate && (
                              <span className={`text-[10px] flex items-center gap-1 ${isOverdue(child.dueDate, child.status) ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                <Calendar className="h-2.5 w-2.5" />{formatDate(child.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-16">
                            <Progress value={child.progress} className="h-1.5" />
                          </div>
                          <span className="text-xs font-semibold w-8 text-right">{child.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Comments Tab ── */}
              <TabsContent value="comments" className="space-y-4 mt-4">
                {canComment && (
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      rows={2}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" className="self-end h-9" onClick={handleAddComment} disabled={!commentText.trim() || submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
                <div className="space-y-3">
                  {(!task.comments || task.comments.length === 0) ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    </div>
                  ) : (
                    [...task.comments].reverse().map((comment: any, idx: number) => (
                      <div key={comment._id || idx} className="flex gap-3 p-3 rounded-xl bg-secondary/20 border border-border/50">
                        <Avatar className="h-8 w-8 flex-shrink-0 border-2 border-primary/20">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                            {getInitials(getUserName(comment.user))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{getUserName(comment.user)}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap text-muted-foreground">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* ── Attachments Tab ── */}
              <TabsContent value="attachments" className="space-y-4 mt-4">
                {canUpload && (
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload File
                  </Button>
                )}
                <div className="space-y-2">
                  {(!task.attachments || task.attachments.length === 0) ? (
                    <div className="text-center py-8">
                      <Paperclip className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No attachments</p>
                    </div>
                  ) : (
                    task.attachments.map((att: any) => (
                      <div key={att._id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border hover:bg-secondary/30 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {getAttachmentIcon(att.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{att.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">{att.type?.toUpperCase()}</Badge>
                            <span className="text-[10px] text-muted-foreground">{formatDate(att.uploadedAt)}</span>
                            {att.size && <span className="text-[10px] text-muted-foreground">{(att.size / 1024).toFixed(1)}KB</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {att.url && (
                            <>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(att.url, '_blank')}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDownload(att.url, att.name)}><Download className="h-4 w-4" /></Button>
                            </>
                          )}
                          {canUpload && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteAttachment(att._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* ── History Tab (unified activity timeline) ── */}
              <TabsContent value="history" className="space-y-4 mt-4">
                {(() => {
                  const timeline = buildTimeline();
                  if (timeline.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <Activity className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No activity recorded</p>
                      </div>
                    );
                  }
                  return (
                    <div className="relative">
                      {/* Vertical timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-0">
                        {timeline.map((item, idx) => (
                          <div key={idx} className="relative flex gap-4 pb-4">
                            {/* Timeline dot */}
                            <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-background border-2 border-border flex-shrink-0">
                              {item.icon}
                            </div>
                            {/* Content */}
                            <div className="flex-1 pt-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <span className="font-medium text-sm">{item.user || 'System'}</span>
                                <span className="text-sm text-muted-foreground">{item.action}</span>
                                {item.badge && (
                                  <Badge className={`text-[10px] ${getStatusColor(item.badge)}`}>
                                    {statusLabels[item.badge] || item.badge}
                                  </Badge>
                                )}
                              </div>
                              {item.detail && (
                                <p className="text-xs text-muted-foreground mt-0.5 italic">"{item.detail}"</p>
                              )}
                              {(item.oldValue || item.newValue) && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  {item.oldValue && <Badge variant="outline" className="text-[10px]">{statusLabels[item.oldValue] || item.oldValue}</Badge>}
                                  {item.oldValue && item.newValue && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                                  {item.newValue && <Badge className={`text-[10px] ${getStatusColor(item.newValue)}`}>{statusLabels[item.newValue] || item.newValue}</Badge>}
                                </div>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-1">{item.time ? formatDate(item.time) : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </TabsContent>

              {/* ── Workflow Tab ── */}
              <TabsContent value="workflow" className="mt-4 space-y-6">

                {/* ── WorkflowTemplateManager picker dialog ── */}
                <WorkflowTemplateManager
                  open={workflowManagerOpen}
                  onClose={() => setWorkflowManagerOpen(false)}
                  onSelect={handleAssignWorkflow}
                  selectLabel="Apply to Task"
                />

                {/* ═══════════════════════════════════════════════════════
                    SECTION 1 — User-defined Workflow Steps
                ═══════════════════════════════════════════════════════ */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Network className="h-4 w-4 text-primary" />
                      Task Workflow
                      {taskWorkflow && (
                        <Badge variant="outline" className="text-[10px]">
                          {taskWorkflow.workflowName}
                        </Badge>
                      )}
                    </h3>
                    <div className="flex gap-1.5">
                      {taskWorkflow && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                          onClick={handleRemoveWorkflow}
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </Button>
                      )}
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => setWorkflowManagerOpen(true)}
                      >
                        <Network className="h-3 w-3" />
                        {taskWorkflow ? 'Change Workflow' : 'Assign Workflow'}
                      </Button>
                    </div>
                  </div>

                  {!taskWorkflow || !taskWorkflow.steps?.length ? (
                    <div className="text-center py-8 rounded-xl border border-dashed border-border/60 bg-secondary/10">
                      <Network className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">No workflow assigned</p>
                      <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Assign a workflow template to standardise this task's process</p>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setWorkflowManagerOpen(true)}>
                        <Plus className="h-3.5 w-3.5" /> Assign Workflow
                      </Button>
                    </div>
                  ) : (
                    <TaskWorkflowCanvas
                      workflowName={taskWorkflow.workflowName}
                      steps={taskWorkflow.steps}
                      currentStepIndex={taskWorkflow.currentStepIndex ?? 0}
                      completing={advancingStep !== null}
                      onCompleteStep={handleCompleteStep}
                    />
                  )}
                </div>

                <Separator />

                {/* ═══════════════════════════════════════════════════════
                    SECTION 2 — Status History (audit trail)
                ═══════════════════════════════════════════════════════ */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      Status History
                      <Badge variant="outline" className="text-[10px]">
                        {task.workflowHistory?.length || 0} events
                      </Badge>
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadWorkflowPDF}
                      className="gap-1.5 text-xs h-7"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export PDF
                    </Button>
                  </div>

                  {(!task.workflowHistory || task.workflowHistory.length === 0) ? (
                    <div className="text-center py-6">
                      <Activity className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="text-xs text-muted-foreground">No status history recorded yet</p>
                    </div>
                  ) : (
                    <div className="relative pl-8">
                      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
                      <div className="space-y-3">
                        {[...task.workflowHistory].reverse().map((entry: any, idx: number) => {
                          const isCurrent = idx === 0;
                          return (
                            <div key={entry._id || idx} className="relative flex gap-3">
                              <div className={cn(
                                'absolute -left-8 top-3 z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 flex-shrink-0',
                                isCurrent ? 'bg-primary/20 border-primary' : 'bg-background border-border'
                              )}>
                                {isCurrent
                                  ? <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
                                  : <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                              <div className={cn(
                                'flex-1 rounded-xl border p-3 space-y-2',
                                isCurrent ? 'bg-primary/5 border-primary/25' : 'bg-secondary/20 border-border/50'
                              )}>
                                <div className="flex items-center flex-wrap gap-2">
                                  {isCurrent && (
                                    <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20">Current</Badge>
                                  )}
                                  <span className="text-xs font-semibold">{getWorkflowActionLabel(entry.action)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {entry.fromStatus && entry.fromStatus !== entry.toStatus && (
                                    <>
                                      <Badge variant="outline" className={`text-[10px] ${getStatusColor(entry.fromStatus)}`}>
                                        {statusLabels[entry.fromStatus] || entry.fromStatus}
                                      </Badge>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    </>
                                  )}
                                  <Badge className={`text-[10px] ${getStatusColor(entry.toStatus)}`}>
                                    {statusLabels[entry.toStatus] || entry.toStatus}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Avatar className="h-5 w-5 flex-shrink-0">
                                    <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                                      {getInitials(getUserName(entry.performedBy))}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-foreground">{getUserName(entry.performedBy)}</span>
                                  {entry.performedByRole && (
                                    <Badge variant="outline" className="text-[9px] capitalize px-1.5 py-0">
                                      {entry.performedByRole}
                                    </Badge>
                                  )}
                                  <span className="text-[10px] text-muted-foreground ml-auto">
                                    {entry.timestamp ? formatDate(entry.timestamp) : ''}
                                  </span>
                                </div>
                                {entry.comment && (
                                  <p className="text-xs text-muted-foreground italic bg-background/60 rounded-lg px-2.5 py-1.5 border border-border/40">
                                    "{entry.comment}"
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
