import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ClipboardList,
  Plus,
  Eye,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  FileText,
  Image,
  Video,
  Code,
  Calendar,
  Loader2,
  Download,
  X,
  Star,
} from 'lucide-react';
import { taskAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import DocumentViewer from '@/components/ui/DocumentViewer';

interface TaskAttachment {
  _id?: string;
  id?: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'api';
  url: string;
  uploadedAt: string;
}

interface SubTask {
  _id?: string;
  id?: string;
  title: string;
  completed: boolean;
}

interface TaskReview {
  comment: string;
  rating?: number;
  reviewedBy?: { name: string; employeeId?: string };
  reviewedAt?: string;
}

interface Task {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'completed' | 'cancelled';
  progress: number;
  dueDate: string;
  createdBy: 'admin' | 'hr' | 'employee';
  subTasks: SubTask[];
  attachments: TaskAttachment[];
  notes: string;
  review?: TaskReview;
}

const EmployeeTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // File input refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const apiInputRef = useRef<HTMLInputElement>(null);

  // Create Task Form State
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
  });

  // Progress Update State
  const [progressData, setProgressData] = useState({
    progress: 0,
    notes: '',
  });
  const [newSubTask, setNewSubTask] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getTasks();
      setTasks(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.dueDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!user?._id) {
      toast({
        title: 'Error',
        description: 'User session not loaded. Please refresh and try again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await taskAPI.createTask({
        title: newTask.title,
        description: newTask.description,
        assignedTo: user._id,
        priority: newTask.priority,
        dueDate: newTask.dueDate,
      });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
      setIsCreateDialogOpen(false);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const handleAddSubTask = () => {
    if (selectedTask && newSubTask.trim()) {
      const updatedTask = {
        ...selectedTask,
        subTasks: [
          ...selectedTask.subTasks,
          { id: Date.now().toString(), title: newSubTask, completed: false },
        ],
      };
      const taskId = selectedTask._id || selectedTask.id;
      setTasks(tasks.map(t => (t._id || t.id) === taskId ? updatedTask : t));
      setSelectedTask(updatedTask);
      setNewSubTask('');
    }
  };

  const handleToggleSubTask = (subTaskId: string) => {
    if (selectedTask) {
      const updatedTask = {
        ...selectedTask,
        subTasks: selectedTask.subTasks.map(st =>
          (st._id || st.id) === subTaskId ? { ...st, completed: !st.completed } : st
        ),
      };
      const taskId = selectedTask._id || selectedTask.id;
      setTasks(tasks.map(t => (t._id || t.id) === taskId ? updatedTask : t));
      setSelectedTask(updatedTask);
    }
  };

  const handleUpdateProgress = async () => {
    if (selectedTask) {
      const taskId = selectedTask._id || selectedTask.id || '';
      try {
        await taskAPI.updateProgress(taskId, progressData.progress);
        if (progressData.notes) {
          await taskAPI.updateTask(taskId, { notes: progressData.notes });
        }
        toast({ title: 'Success', description: 'Progress updated successfully' });
        setIsProgressDialogOpen(false);
        setProgressData({ progress: 0, notes: '' });
        fetchTasks();
      } catch (error: any) {
        toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update progress', variant: 'destructive' });
      }
    }
  };

  const handleFileUpload = async (file: File, fileType: 'image' | 'video' | 'document' | 'api') => {
    if (!selectedTask) return;
    const taskId = selectedTask._id || selectedTask.id || '';

    setUploading(true);
    try {
      const response = await taskAPI.addAttachment(taskId, file, fileType);
      toast({ title: 'Success', description: `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} uploaded successfully` });
      const updatedTask = response.data.data;
      setSelectedTask(updatedTask);
      setTasks(tasks.map(t => (t._id || t.id) === taskId ? updatedTask : t));
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to upload file', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video' | 'document' | 'api') => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, fileType);
    }
    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedTask) return;
    const taskId = selectedTask._id || selectedTask.id || '';

    try {
      const response = await taskAPI.deleteAttachment(taskId, attachmentId);
      toast({ title: 'Success', description: 'Attachment deleted' });
      const updatedTask = response.data.data;
      setSelectedTask(updatedTask);
      setTasks(tasks.map(t => (t._id || t.id) === taskId ? updatedTask : t));
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete attachment', variant: 'destructive' });
    }
  };

  // Document viewer
  const [viewerDoc, setViewerDoc] = useState<{ url: string; name: string } | null>(null);

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await taskAPI.deleteTask(taskId);
        toast({ title: 'Success', description: 'Task deleted successfully' });
        fetchTasks();
      } catch (error: any) {
        toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete task', variant: 'destructive' });
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'status-rejected';
      case 'medium': return 'status-pending';
      case 'low': return 'status-approved';
      default: return 'bg-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'status-approved';
      case 'in-progress': return 'status-in-progress';
      case 'todo': return 'status-pending';
      default: return 'bg-muted';
    }
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4 text-primary" />;
      case 'video': return <Video className="h-4 w-4 text-primary" />;
      case 'document': return <FileText className="h-4 w-4 text-primary" />;
      case 'api': return <Code className="h-4 w-4 text-primary" />;
      default: return <FileText className="h-4 w-4 text-primary" />;
    }
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
  };

  return (
    <DashboardLayout>
      {/* Hidden file inputs for real device file picker */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileInputChange(e, 'image')} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFileInputChange(e, 'video')} />
      <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" className="hidden" onChange={(e) => handleFileInputChange(e, 'document')} />
      <input ref={apiInputRef} type="file" accept=".json,.yaml,.yml,.md,.txt" className="hidden" onChange={(e) => handleFileInputChange(e, 'api')} />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
            <p className="text-muted-foreground">Manage your daily tasks and track progress</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="glow-button">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>Add a new task to your daily task list</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter task description"
                    rows={4}
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(val: 'low' | 'medium' | 'high') =>
                        setNewTask({ ...newTask, priority: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTask} disabled={!newTask.title || !newTask.dueDate}>Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.todo}</p>
                  <p className="text-xs text-muted-foreground">To Do</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              No tasks yet. Create your first task!
            </div>
          ) : tasks.map((task) => (
            <Card key={task._id || task.id} className="glass-card card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {task.createdBy === 'employee' ? 'Self-created' : `Assigned by ${task.createdBy.charAt(0).toUpperCase() + task.createdBy.slice(1)}`}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{task.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-2" />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </Badge>
                  <Badge className={getStatusColor(task.status)}>
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </Badge>
                </div>

                {task.review?.comment && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Star className="h-3 w-3 text-yellow-500" />
                      Reviewed{task.review.rating ? ` (${task.review.rating}/5)` : ''}
                    </Badge>
                  </div>
                )}

                {task.attachments && task.attachments.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {task.attachments.length} file(s) uploaded
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedTask(task); setIsViewDialogOpen(true); }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedTask(task); setProgressData({ progress: task.progress, notes: task.notes || '' }); setIsProgressDialogOpen(true); }}>
                    <Upload className="h-4 w-4 mr-2" />
                    Update Progress
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTask(task._id || task.id || '')}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View Task Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="bg-background max-w-3xl max-h-[85vh] p-0">
            <ScrollArea className="max-h-[85vh]">
              <div className="p-6">
              {selectedTask && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-2xl">{selectedTask.title}</DialogTitle>
                    <DialogDescription>{selectedTask.description}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Priority</Label>
                        <Badge className={`${getPriorityColor(selectedTask.priority)} mt-2`}>
                          {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <Badge className={`${getStatusColor(selectedTask.status)} mt-2`}>
                          {selectedTask.status.charAt(0).toUpperCase() + selectedTask.status.slice(1).replace('-', ' ')}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Due Date</Label>
                        <p className="mt-2">{new Date(selectedTask.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Created By</Label>
                        <p className="mt-2 capitalize">{selectedTask.createdBy}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Progress</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-primary">{selectedTask.progress}%</span>
                        </div>
                        <Progress value={selectedTask.progress} className="h-3" />
                      </div>
                    </div>

                    {/* Review Section */}
                    {selectedTask.review?.comment && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Review from {selectedTask.review.reviewedBy?.name || 'Manager'}</Label>
                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          {selectedTask.review.rating && (
                            <div className="flex items-center gap-1 mb-2">
                              {[1,2,3,4,5].map(i => (
                                <Star key={i} className={`h-4 w-4 ${i <= selectedTask.review!.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                              ))}
                              <span className="text-sm ml-2 text-muted-foreground">{selectedTask.review.rating}/5</span>
                            </div>
                          )}
                          <p className="text-sm">{selectedTask.review.comment}</p>
                          {selectedTask.review.reviewedAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Reviewed on {new Date(selectedTask.review.reviewedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Subtasks */}
                    <div className="space-y-3">
                      <Label>Subtasks ({selectedTask.subTasks?.length || 0})</Label>
                      <div className="space-y-2">
                        {selectedTask.subTasks?.map((subTask) => (
                          <div key={subTask._id || subTask.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                            <input
                              type="checkbox"
                              checked={subTask.completed}
                              onChange={() => handleToggleSubTask(subTask._id || subTask.id || '')}
                              className="h-4 w-4 rounded border-border"
                            />
                            <span className={subTask.completed ? 'line-through text-muted-foreground' : ''}>{subTask.title}</span>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-3">
                          <Input placeholder="Add new subtask..." value={newSubTask} onChange={(e) => setNewSubTask(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddSubTask()} />
                          <Button onClick={handleAddSubTask} disabled={!newSubTask.trim()}><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>

                    {/* Attachments */}
                    {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                      <div className="space-y-3">
                        <Label>Attachments ({selectedTask.attachments.length})</Label>
                        <div className="space-y-2">
                          {selectedTask.attachments.map((attachment) => (
                            <div key={attachment._id || attachment.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                                {getAttachmentIcon(attachment.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{attachment.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className="text-xs">{attachment.type.toUpperCase()}</Badge>
                                  <span className="text-xs text-muted-foreground">{new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {attachment.url && attachment.url !== '#' && (
                                  <>
                                    <Button variant="ghost" size="sm" title="View" onClick={() => setViewerDoc({ url: attachment.url, name: attachment.name })}><Eye className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="sm" title="Download" onClick={() => handleDownload(attachment.url, attachment.name)}><Download className="h-4 w-4" /></Button>
                                  </>
                                )}
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteAttachment(attachment._id || attachment.id || '')}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedTask.notes && (
                      <div className="space-y-2">
                        <Label>Progress Notes</Label>
                        <div className="p-4 rounded-lg bg-secondary/30 text-sm">{selectedTask.notes}</div>
                      </div>
                    )}
                  </div>
                </>
              )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Update Progress Dialog - SCROLLABLE */}
        <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
          <DialogContent className="bg-background max-w-2xl max-h-[85vh] p-0">
            <ScrollArea className="max-h-[85vh]">
              <div className="p-6">
              {selectedTask && (
                <>
                  <DialogHeader>
                    <DialogTitle>Update Progress: {selectedTask.title}</DialogTitle>
                    <DialogDescription>Upload proof and update task progress</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Progress Slider */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Progress</Label>
                        <span className="text-2xl font-bold text-primary">{progressData.progress}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progressData.progress}
                        onChange={(e) => setProgressData({ ...progressData, progress: parseInt(e.target.value) })}
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label>Progress Notes</Label>
                      <Textarea
                        placeholder="Add notes about your progress..."
                        rows={3}
                        value={progressData.notes}
                        onChange={(e) => setProgressData({ ...progressData, notes: e.target.value })}
                      />
                    </div>

                    {/* File Upload Buttons - opens device file picker */}
                    <div className="space-y-3">
                      <Label>Upload Proof</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Image className="h-5 w-5 text-primary" />}
                          <span className="text-sm">Upload Photo</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => videoInputRef.current?.click()} disabled={uploading}>
                          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5 text-primary" />}
                          <span className="text-sm">Upload Video</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => documentInputRef.current?.click()} disabled={uploading}>
                          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5 text-primary" />}
                          <span className="text-sm">Upload Document</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => apiInputRef.current?.click()} disabled={uploading}>
                          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Code className="h-5 w-5 text-primary" />}
                          <span className="text-sm">Upload API Docs</span>
                        </Button>
                      </div>
                    </div>

                    {/* Uploaded Files with view/download/delete */}
                    {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                      <div className="space-y-2">
                        <Label>Uploaded Files ({selectedTask.attachments.length})</Label>
                        <div className="space-y-2">
                          {selectedTask.attachments.map((att) => (
                            <div key={att._id || att.id} className="flex items-center gap-2 p-2 bg-secondary/30 rounded text-sm">
                              {getAttachmentIcon(att.type)}
                              <span className="truncate flex-1">{att.name}</span>
                              <div className="flex gap-1">
                                {att.url && att.url !== '#' && (
                                  <>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View" onClick={() => setViewerDoc({ url: att.url, name: att.name })}>
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Download" onClick={() => handleDownload(att.url, att.name)}>
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteAttachment(att._id || att.id || '')}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setIsProgressDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateProgress}>Update Progress</Button>
                  </div>
                </>
              )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
      )}

      {/* ── Document Viewer ── */}
      {viewerDoc && (
        <DocumentViewer
          open={!!viewerDoc}
          onClose={() => setViewerDoc(null)}
          url={viewerDoc.url}
          fileName={viewerDoc.name}
        />
      )}
    </DashboardLayout>
  );
};

export default EmployeeTasks;
