import { useState, useEffect, useCallback } from 'react';
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
import {
  ClipboardList,
  Plus,
  Edit,
  Eye,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  FileText,
  Image,
  Video,
  File,
  Code,
  Calendar,
  Loader2,
} from 'lucide-react';
import { employeeAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface TaskAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'api';
  url: string;
  uploadedAt: string;
}

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  progress: number;
  dueDate: string;
  createdBy: 'admin' | 'employee';
  subTasks: SubTask[];
  attachments: TaskAttachment[];
  notes: string;
}

const EmployeeTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { toast } = useToast();

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
      const response = await employeeAPI.getMyTasks();
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

    try {
      // TODO: Add createTask API when backend endpoint is ready
      // await employeeAPI.createTask(newTask);
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
      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask);
      setNewSubTask('');
    }
  };

  const handleToggleSubTask = (subTaskId: string) => {
    if (selectedTask) {
      const updatedTask = {
        ...selectedTask,
        subTasks: selectedTask.subTasks.map(st =>
          st.id === subTaskId ? { ...st, completed: !st.completed } : st
        ),
      };
      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask);
    }
  };

  const handleUpdateProgress = () => {
    if (selectedTask) {
      // TODO: Add updateTaskProgress API when backend endpoint is ready
      // await employeeAPI.updateTaskProgress(selectedTask._id || '', { progress: progressData.progress, notes: progressData.notes });
      const updatedTask = {
        ...selectedTask,
        progress: progressData.progress,
        notes: progressData.notes,
        status: progressData.progress === 100 ? 'completed' as const : 'in-progress' as const,
      };
      setTasks(tasks.map(t => (t._id || t.id) === (selectedTask._id || selectedTask.id) ? updatedTask : t));
      setIsProgressDialogOpen(false);
      setProgressData({ progress: 0, notes: '' });
    }
  };

  const handleFileUpload = (type: 'image' | 'video' | 'document' | 'api') => {
    // Mock file upload - in real app, this would upload to server
    if (selectedTask) {
      const attachment: TaskAttachment = {
        id: Date.now().toString(),
        name: `${type}-file-${Date.now()}`,
        type,
        url: '#',
        uploadedAt: new Date().toISOString(),
      };
      const updatedTask = {
        ...selectedTask,
        attachments: [...selectedTask.attachments, attachment],
      };
      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'status-rejected';
      case 'medium':
        return 'status-pending';
      case 'low':
        return 'status-approved';
      default:
        return 'bg-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'status-approved';
      case 'in-progress':
        return 'status-in-progress';
      case 'pending':
        return 'status-pending';
      default:
        return 'bg-muted';
    }
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  };

  return (
    <DashboardLayout>
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
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTask} disabled={!newTask.title || !newTask.dueDate}>
                  Create Task
                </Button>
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
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="glass-card card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {task.createdBy === 'admin' ? 'Assigned by Admin' : 'Self-created'}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{task.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-2" />
                </div>

                {/* Metadata */}
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

                {/* Subtasks Count */}
                {task.subTasks.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Subtasks: {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length} completed
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsViewDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedTask(task);
                      setProgressData({ progress: task.progress, notes: task.notes });
                      setIsProgressDialogOpen(true);
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Update Progress
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View Task Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="bg-background max-w-3xl max-h-[80vh] overflow-y-auto">
            {selectedTask && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedTask.title}</DialogTitle>
                  <DialogDescription>{selectedTask.description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Task Info */}
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
                      <p className="mt-2">{selectedTask.createdBy === 'admin' ? 'Admin' : 'You'}</p>
                    </div>
                  </div>

                  {/* Subtasks */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Subtasks ({selectedTask.subTasks.length})</Label>
                    </div>
                    <div className="space-y-2">
                      {selectedTask.subTasks.map((subTask) => (
                        <div
                          key={subTask.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={subTask.completed}
                            onChange={() => handleToggleSubTask(subTask.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                          <span className={subTask.completed ? 'line-through text-muted-foreground' : ''}>
                            {subTask.title}
                          </span>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <Input
                          placeholder="Add new subtask..."
                          value={newSubTask}
                          onChange={(e) => setNewSubTask(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddSubTask()}
                        />
                        <Button onClick={handleAddSubTask} disabled={!newSubTask.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedTask.attachments.length > 0 && (
                    <div className="space-y-3">
                      <Label>Attachments ({selectedTask.attachments.length})</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedTask.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 text-sm"
                          >
                            {attachment.type === 'image' && <Image className="h-4 w-4 text-primary" />}
                            {attachment.type === 'video' && <Video className="h-4 w-4 text-primary" />}
                            {attachment.type === 'document' && <FileText className="h-4 w-4 text-primary" />}
                            {attachment.type === 'api' && <Code className="h-4 w-4 text-primary" />}
                            <span className="truncate">{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedTask.notes && (
                    <div className="space-y-2">
                      <Label>Progress Notes</Label>
                      <div className="p-4 rounded-lg bg-secondary/30 text-sm">
                        {selectedTask.notes}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Update Progress Dialog */}
        <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
          <DialogContent className="bg-background max-w-2xl">
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
                      rows={4}
                      value={progressData.notes}
                      onChange={(e) => setProgressData({ ...progressData, notes: e.target.value })}
                    />
                  </div>

                  {/* File Upload Buttons */}
                  <div className="space-y-3">
                    <Label>Upload Proof</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2"
                        onClick={() => handleFileUpload('image')}
                      >
                        <Image className="h-5 w-5 text-primary" />
                        <span className="text-sm">Upload Photo</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2"
                        onClick={() => handleFileUpload('video')}
                      >
                        <Video className="h-5 w-5 text-primary" />
                        <span className="text-sm">Upload Video</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2"
                        onClick={() => handleFileUpload('document')}
                      >
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-sm">Upload Document</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2"
                        onClick={() => handleFileUpload('api')}
                      >
                        <Code className="h-5 w-5 text-primary" />
                        <span className="text-sm">Upload API Docs</span>
                      </Button>
                    </div>
                  </div>

                  {/* Uploaded Files */}
                  {selectedTask.attachments.length > 0 && (
                    <div className="space-y-2">
                      <Label>Uploaded Files ({selectedTask.attachments.length})</Label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedTask.attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-2 p-2 bg-secondary/30 rounded text-sm">
                            {att.type === 'image' && <Image className="h-4 w-4" />}
                            {att.type === 'video' && <Video className="h-4 w-4" />}
                            {att.type === 'document' && <FileText className="h-4 w-4" />}
                            {att.type === 'api' && <Code className="h-4 w-4" />}
                            <span className="truncate flex-1">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsProgressDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProgress}>
                    Update Progress
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
      )}
    </DashboardLayout>
  );
};

export default EmployeeTasks;
