import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  ClipboardList,
  Plus,
  Calendar,
  Upload,
  Clock,
  CheckCircle,
  Circle,
  Timer,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/useApi';
import { taskAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface Task {
  _id: string;
  title: string;
  description: string;
  assignedTo?: { _id: string; name: string };
  assignee?: string;
  dueDate: string;
  deadline?: string;
  progress: number;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  attachments?: number;
}

interface TasksModuleProps {
  role: 'admin' | 'hr' | 'employee';
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'in-progress':
      return <Timer className="h-4 w-4 text-primary" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'high':
      return <Badge className="status-rejected">High</Badge>;
    case 'medium':
      return <Badge className="status-pending">Medium</Badge>;
    case 'low':
      return <Badge className="status-approved">Low</Badge>;
    default:
      return <Badge>{priority}</Badge>;
  }
};

const TasksModule = ({ role }: TasksModuleProps) => {
  const [filter, setFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
  });
  const { loading, execute } = useApi();
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const result = await execute(() => taskAPI.getTasks());
      if (result?.data) {
        setTasks(result.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch tasks',
        variant: 'destructive',
      });
    }
  };

  const handleCreateTask = async () => {
    if (!formData.title || !formData.description || !formData.dueDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    try {
      await execute(() => taskAPI.createTask(formData));
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      setIsDialogOpen(false);
      setFormData({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProgress = async (taskId: string, newProgress: number) => {
    try {
      await execute(() => taskAPI.updateProgress(taskId, newProgress));
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update progress',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await execute(() => taskAPI.deleteTask(taskId));
      toast({
        title: 'Success',
        description: 'Task deleted',
      });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const canCreate = role === 'hr';

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Circle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Timer className="h-5 w-5 text-primary" />
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
        </div>

        {/* Tasks List */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Tasks
                </CardTitle>
                <CardDescription>Manage and track all tasks</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[140px] bg-secondary border-border">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                {canCreate && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="glow-button">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card">
                      <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>Assign a new task to an employee</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Task Title</Label>
                          <Input 
                            placeholder="Enter task title" 
                            className="bg-secondary border-border"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea 
                            placeholder="Enter task description" 
                            className="bg-secondary border-border"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Assign To (User ID)</Label>
                            <Input 
                              placeholder="Employee ID" 
                              className="bg-secondary border-border"
                              value={formData.assignedTo}
                              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' })}>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="Priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Due Date</Label>
                          <Input 
                            type="date" 
                            className="bg-secondary border-border"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          />
                        </div>
                        <Button className="w-full glow-button" onClick={handleCreateTask} disabled={loading}>
                          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : 'Create Task'}
                        </Button>
                      </div>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="john">John Doe</SelectItem>
                                <SelectItem value="jane">Jane Smith</SelectItem>
                                <SelectItem value="mike">Mike Johnson</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' })}>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Due Date</Label>
                          <Input 
                            type="date" 
                            className="bg-secondary border-border"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          />
                        </div>
                        <Button className="w-full glow-button" onClick={handleCreateTask} disabled={loading}>
                          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : 'Create Task'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && tasks.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tasks found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => {
                  const assigneeName = task.assignedTo?.name || task.assignee || 'Unassigned';
                  const deadline = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : (task.deadline || 'No deadline');
                  
                  return (
                    <div
                      key={task._id}
                      className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedTask(task)}
                    >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">{task.title}</p>
                          {getPriorityBadge(task.priority)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                                {assigneeName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            {assigneeName}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {deadline}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full md:w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-foreground">{task.progress}%</span>
                      </div>
                      <Progress value={task.progress} className="h-2" />
                    </div>
                  </div>

                  {/* Task Actions for Employee */}
                  {role === 'employee' && task.status !== 'completed' && (
                    <div className="mt-4 pt-4 border-t border-border flex gap-3">
                      <Button size="sm" variant="secondary" className="flex-1">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Proof
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        Update Progress
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TasksModule;
