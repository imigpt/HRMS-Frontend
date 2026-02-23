import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ClipboardList, Plus, Eye, CheckCircle, Clock, AlertCircle, Trash2,
  Calendar, Building2, Filter, Image, Video, FileText, Code, Loader2,
  Download, Star, MessageSquare,
} from 'lucide-react';
import { adminAPI, taskAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

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
  reviewedBy?: { _id?: string; name: string; employeeId?: string };
  reviewedAt?: string;
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
  status: 'todo' | 'in-progress' | 'completed' | 'cancelled';
  progress: number;
  dueDate: string;
  createdDate: string;
  createdBy: 'admin' | 'hr' | 'employee';
  subTasks: SubTask[];
  attachments: TaskAttachment[];
  notes: string;
  review?: TaskReview;
}

const AdminTasks = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
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
  const [reviewData, setReviewData] = useState({ comment: '', rating: 0 });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksResponse, employeesResponse] = await Promise.all([
        taskAPI.getTasks(),
        adminAPI.getEmployees(),
      ]);
      setTasks(tasksResponse.data.data || []);
      setEmployees(employeesResponse.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load tasks', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.employeeId || !newTask.dueDate) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    try {
      await taskAPI.createTask({
        title: newTask.title,
        description: newTask.description,
        assignedTo: newTask.employeeId,
        priority: newTask.priority,
        dueDate: newTask.dueDate,
      });
      toast({ title: 'Success', description: 'Task created successfully' });
      setIsCreateDialogOpen(false);
      setNewTask({ title: '', description: '', employeeId: '', priority: 'medium', dueDate: '' });
      fetchTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create task', variant: 'destructive' });
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedTask || !reviewData.comment) {
      toast({ title: 'Validation Error', description: 'Please enter a review comment', variant: 'destructive' });
      return;
    }
    try {
      await taskAPI.addReview(selectedTask._id, {
        comment: reviewData.comment,
        rating: reviewData.rating || undefined,
      });
      toast({ title: 'Success', description: 'Review submitted successfully' });
      setIsReviewDialogOpen(false);
      setReviewData({ comment: '', rating: 0 });
      fetchTasks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to submit review', variant: 'destructive' });
    }
  };

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
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

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <Button className="glow-button"><Plus className="h-4 w-4 mr-2" />Create Task</Button>
            </DialogTrigger>
            <DialogContent className="bg-background max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>Assign a new task to an employee</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select value={newTask.employeeId} onValueChange={(val) => setNewTask({ ...newTask, employeeId: val })}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp._id || emp.id} value={emp._id || emp.id}>
                          {emp.name} - {emp.department || 'N/A'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input placeholder="Enter task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Enter task description" rows={4} value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newTask.priority} onValueChange={(val: 'low' | 'medium' | 'high') => setNewTask({ ...newTask, priority: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTask} disabled={!newTask.title || !newTask.employeeId || !newTask.dueDate}>Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total Tasks</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold text-foreground">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Clock className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{stats.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold text-foreground">{stats.todo}</p><p className="text-xs text-muted-foreground">To Do</p></div></div></CardContent></Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="All Priorities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                <SelectTrigger><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="All Tasks" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="admin">Admin Created</SelectItem>
                  <SelectItem value="hr">HR Created</SelectItem>
                  <SelectItem value="employee">Employee Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card className="glass-card">
          <CardHeader><CardTitle>All Tasks</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredTasks.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tasks found.</TableCell></TableRow>
                ) : (
                  filteredTasks.map((task) => (
                  <TableRow key={task._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">{task.createdBy} Created</Badge>
                          {task.review?.comment && <Badge variant="outline" className="text-xs gap-1"><Star className="h-3 w-3 text-yellow-500" />Reviewed</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/20 text-primary text-xs">{task.assignedTo?.name?.split(' ').map(n => n[0]).join('') || '?'}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium text-sm">{task.assignedTo?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{task.assignedTo?.department || ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={getPriorityColor(task.priority)}>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</Badge></TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Progress</span><span className="font-semibold">{task.progress}%</span></div>
                        <Progress value={task.progress} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell><div className="flex items-center gap-2 text-sm"><Calendar className="h-3 w-3 text-muted-foreground" />{new Date(task.dueDate).toLocaleDateString()}</div></TableCell>
                    <TableCell><Badge className={getStatusColor(task.status)}>{task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedTask(task); setIsViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedTask(task); setReviewData({ comment: task.review?.comment || '', rating: task.review?.rating || 0 }); setIsReviewDialogOpen(true); }}><MessageSquare className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTask(task._id)}><Trash2 className="h-4 w-4" /></Button>
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
                        <Label className="text-muted-foreground">Assigned To</Label>
                        <div className="flex items-center gap-3 mt-2">
                          <Avatar><AvatarFallback className="bg-primary/20 text-primary">{selectedTask.assignedTo?.name?.split(' ').map(n => n[0]).join('') || '?'}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-medium">{selectedTask.assignedTo?.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedTask.assignedTo?.department}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Company</Label>
                        <p className="mt-2">{selectedTask.assignedTo?.company?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Priority</Label>
                        <Badge className={`${getPriorityColor(selectedTask.priority)} mt-2`}>{selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}</Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <Badge className={`${getStatusColor(selectedTask.status)} mt-2`}>{selectedTask.status.charAt(0).toUpperCase() + selectedTask.status.slice(1).replace('-', ' ')}</Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Due Date</Label>
                        <p className="mt-2">{new Date(selectedTask.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Created By</Label>
                        <Badge variant="outline" className="mt-2 capitalize">{selectedTask.createdBy}</Badge>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <Label className="text-muted-foreground">Progress</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-primary">{selectedTask.progress}%</span>
                          <Badge className={getStatusColor(selectedTask.status)}>{selectedTask.status.replace('-', ' ').toUpperCase()}</Badge>
                        </div>
                        <Progress value={selectedTask.progress} className="h-3" />
                      </div>
                    </div>

                    {/* Subtasks */}
                    {selectedTask.subTasks && selectedTask.subTasks.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-muted-foreground">Subtasks ({selectedTask.subTasks.filter(st => st.completed).length}/{selectedTask.subTasks.length} completed)</Label>
                        <div className="space-y-2">
                          {selectedTask.subTasks.map((subTask) => (
                            <div key={subTask._id || subTask.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                              <input type="checkbox" checked={subTask.completed} readOnly className="h-4 w-4 rounded border-border" />
                              <span className={subTask.completed ? 'line-through text-muted-foreground' : ''}>{subTask.title}</span>
                              {subTask.completed && <Badge className="ml-auto status-approved text-xs">Done</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attachments with Download/View */}
                    {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-muted-foreground">Files Uploaded ({selectedTask.attachments.length})</Label>
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
                                    <Button variant="ghost" size="sm" onClick={() => window.open(attachment.url, '_blank')}><Eye className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDownload(attachment.url, attachment.name)}><Download className="h-4 w-4" /></Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedTask.notes && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Progress Notes</Label>
                        <div className="p-4 rounded-lg bg-secondary/30 border border-border"><p className="text-sm whitespace-pre-wrap">{selectedTask.notes}</p></div>
                      </div>
                    )}

                    {/* Existing Review */}
                    {selectedTask.review?.comment && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Your Review</Label>
                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          {selectedTask.review.rating && (
                            <div className="flex items-center gap-1 mb-2">
                              {[1,2,3,4,5].map(i => (
                                <Star key={i} className={`h-4 w-4 ${i <= selectedTask.review!.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                              ))}
                            </div>
                          )}
                          <p className="text-sm">{selectedTask.review.comment}</p>
                        </div>
                      </div>
                    )}

                    {/* Quick Review Button */}
                    <Button className="w-full" variant="outline" onClick={() => { setReviewData({ comment: selectedTask.review?.comment || '', rating: selectedTask.review?.rating || 0 }); setIsViewDialogOpen(false); setIsReviewDialogOpen(true); }}>
                      <MessageSquare className="h-4 w-4 mr-2" />{selectedTask.review?.comment ? 'Edit Review' : 'Add Review'}
                    </Button>

                    {/* Summary */}
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div><p className="text-2xl font-bold text-primary">{selectedTask.progress}%</p><p className="text-xs text-muted-foreground mt-1">Progress</p></div>
                        <div><p className="text-2xl font-bold text-primary">{selectedTask.attachments?.length || 0}</p><p className="text-xs text-muted-foreground mt-1">Files</p></div>
                        <div><p className="text-2xl font-bold text-primary">{selectedTask.subTasks?.length || 0}</p><p className="text-xs text-muted-foreground mt-1">Subtasks</p></div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="bg-background max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Task: {selectedTask?.title}</DialogTitle>
              <DialogDescription>Provide feedback on the employee's work</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Star Rating */}
              <div className="space-y-2">
                <Label>Rating (optional)</Label>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => (
                    <button key={i} type="button" onClick={() => setReviewData({ ...reviewData, rating: i })} className="p-1 hover:scale-110 transition-transform">
                      <Star className={`h-6 w-6 ${i <= reviewData.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                  {reviewData.rating > 0 && (
                    <button type="button" onClick={() => setReviewData({ ...reviewData, rating: 0 })} className="ml-2 text-xs text-muted-foreground hover:text-foreground">Clear</button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Review Comment *</Label>
                <Textarea placeholder="Enter your feedback about this task..." rows={4} value={reviewData.comment} onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitReview} disabled={!reviewData.comment.trim()}>Submit Review</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminTasks;
