import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardList,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Calendar,
  Building2,
  Filter,
  Image,
  Video,
  FileText,
  Code,
  Loader2,
} from 'lucide-react';
import { adminAPI } from '@/lib/apiClient';
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
  _id: string;
  title: string;
  description: string;
  assignedTo: {
    _id: string;
    name: string;
    email: string;
    company?: { name: string };
    department?: string;
  };
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  progress: number;
  dueDate: string;
  createdDate: string;
  createdBy: 'admin' | 'employee';
  subTasks: SubTask[];
  attachments: TaskAttachment[];
  notes: string;
}

const AdminTasks = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    employeeId: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
  });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: Add getTasks API when backend endpoint is ready
      // const [tasksResponse, employeesResponse] = await Promise.all([
      //   adminAPI.getTasks(),
      //   adminAPI.getEmployees(),
      // ]);
      const employeesResponse = await adminAPI.getEmployees();
      // setTasks(tasksResponse.data.data || []);
      setEmployees(employeesResponse.data.data || []);
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

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.employeeId || !newTask.dueDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      // TODO: Add createTask API when backend endpoint is ready
      // await adminAPI.createTask(newTask);
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      setIsCreateDialogOpen(false);
      setNewTask({ title: '', description: '', employeeId: '', priority: 'medium', dueDate: '' });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter(t => t._id !== taskId));
      // TODO: Call backend API to delete task
    }
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

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Task Management</h1>
            <p className="text-muted-foreground">Create and track tasks assigned to employees</p>
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
                <DialogDescription>Assign a new task to an employee</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Assign To</Label>
                  <Select
                    value={newTask.employeeId}
                    onValueChange={(val) => setNewTask({ ...newTask, employeeId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp._id || emp.id} value={emp._id || emp.id}>
                          {emp.name} ({emp._id || emp.id}) - {emp.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <Button
                  onClick={handleCreateTask}
                  disabled={!newTask.title || !newTask.employeeId || !newTask.dueDate}
                >
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

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  <SelectItem value="Aselea Technologies">Aselea Technologies</SelectItem>
                  <SelectItem value="Innovation Corp">Innovation Corp</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="admin">Admin Created</SelectItem>
                  <SelectItem value="employee">Employee Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>All Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No tasks found matching the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task) => (
                  <TableRow key={task._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {task.createdBy === 'admin' ? '👨‍💼 Admin Created' : '👤 Employee Created'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {task.assignedTo.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{task.assignedTo.name}</p>
                          <p className="text-xs text-muted-foreground">{task.assignedTo._id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {task.assignedTo.company?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold">{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTask(task._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Task Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="bg-background max-w-3xl max-h-[80vh] overflow-y-auto">
            {selectedTask && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedTask.title}</DialogTitle>
                  <DialogDescription>{selectedTask.description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Assigned To</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Avatar>
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {selectedTask.assignedTo.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{selectedTask.assignedTo.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedTask.assignedTo.department}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Company</Label>
                      <p className="mt-2">{selectedTask.assignedTo.company?.name || 'N/A'}</p>
                    </div>
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
                      <Badge variant="outline" className="mt-2">
                        {selectedTask.createdBy === 'admin' ? '👨‍💼 Admin' : '👤 Employee'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Progress Section */}
                  <div>
                    <Label className="text-muted-foreground">Progress (Updated by Employee)</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">{selectedTask.progress}%</span>
                        <Badge className={getStatusColor(selectedTask.status)}>
                          {selectedTask.status.replace('-', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <Progress value={selectedTask.progress} className="h-3" />
                    </div>
                  </div>

                  {/* Subtasks Section */}
                  {selectedTask.subTasks.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-muted-foreground">
                        Subtasks Added by Employee ({selectedTask.subTasks.filter(st => st.completed).length}/{selectedTask.subTasks.length} completed)
                      </Label>
                      <div className="space-y-2">
                        {selectedTask.subTasks.map((subTask) => (
                          <div
                            key={subTask.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                          >
                            <input
                              type="checkbox"
                              checked={subTask.completed}
                              readOnly
                              className="h-4 w-4 rounded border-border"
                            />
                            <span className={subTask.completed ? 'line-through text-muted-foreground' : ''}>
                              {subTask.title}
                            </span>
                            {subTask.completed && (
                              <Badge className="ml-auto status-approved text-xs">✓ Done</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachments Section */}
                  {selectedTask.attachments.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-muted-foreground">
                        Files Uploaded by Employee ({selectedTask.attachments.length} files)
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedTask.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/50 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                              {attachment.type === 'image' && <Image className="h-5 w-5 text-primary" />}
                              {attachment.type === 'video' && <Video className="h-5 w-5 text-primary" />}
                              {attachment.type === 'document' && <FileText className="h-5 w-5 text-primary" />}
                              {attachment.type === 'api' && <Code className="h-5 w-5 text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{attachment.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {attachment.type.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(attachment.uploadedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes Section */}
                  {selectedTask.notes && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Progress Notes from Employee</Label>
                      <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                        <p className="text-sm whitespace-pre-wrap">{selectedTask.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Summary Card */}
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">{selectedTask.progress}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Progress</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">{selectedTask.attachments.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Files Uploaded</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">{selectedTask.subTasks.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Subtasks</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminTasks;
