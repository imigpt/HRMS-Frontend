import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ClipboardList, Plus, CheckCircle, Clock, AlertCircle, AlertTriangle,
  Filter, Loader2,
} from 'lucide-react';
import { taskAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import TaskListView from '@/components/tasks/TaskListView';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';
import TaskCreateDialog from '@/components/tasks/TaskCreateDialog';

interface EmployeeTasksContentProps {
  employeeId?: string;
  employeeName?: string;
}

const EmployeeTasksContent = ({ employeeId, employeeName }: EmployeeTasksContentProps) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, projectsRes] = await Promise.all([
        employeeId ? taskAPI.getAllTasks({ assignedTo: employeeId }) : taskAPI.getMyTasks(),
        taskAPI.getProjects(),
      ]);
      setTasks(tasksRes.data.data || []);
      setProjects(projectsRes.data.data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load tasks', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [employeeId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredTasks = tasks.filter(t =>
    statusFilter === 'all' || t.status === statusFilter,
  );

  const stats = {
    total: tasks.length,
    assigned: tasks.filter(t => t.status === 'assigned').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'closed' && t.status !== 'rejected').length,
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await taskAPI.deleteTask(taskId);
      toast({ title: 'Success', description: 'Task deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleViewTask = (task: any) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {employeeName ? `${employeeName}'s Tasks` : 'Tasks'}
          </h2>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Create Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="glass-card"><CardContent className="p-3"><div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /><div><p className="text-lg font-bold">{stats.total}</p><p className="text-[10px] text-muted-foreground">Total</p></div></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-warning" /><div><p className="text-lg font-bold">{stats.assigned}</p><p className="text-[10px] text-muted-foreground">Assigned</p></div></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><div><p className="text-lg font-bold">{stats.inProgress}</p><p className="text-[10px] text-muted-foreground">In Progress</p></div></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3"><div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /><div><p className="text-lg font-bold">{stats.completed}</p><p className="text-[10px] text-muted-foreground">Completed</p></div></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /><div><p className="text-lg font-bold">{stats.overdue}</p><p className="text-[10px] text-muted-foreground">Overdue</p></div></div></CardContent></Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending-approval">Pending Approval</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="under-review">Under Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline">{filteredTasks.length} tasks</Badge>
      </div>

      {/* Task List */}
      <Card className="glass-card">
        <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
        <CardContent>
          <TaskListView
            tasks={filteredTasks}
            loading={loading}
            onViewTask={handleViewTask}
            onDeleteTask={handleDeleteTask}
            showAssignee={false}
            showProject={true}
          />
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <TaskCreateDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={fetchData}
        employees={[]}
        projects={projects}
        showAssignee={false}
        defaultAssignee={employeeId}
      />

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onTaskUpdated={fetchData}
        canReview={true}
        canUpload={false}
        canComment={true}
        showAssignee={false}
        userRole="admin"
      />
    </div>
  );
};

export default EmployeeTasksContent;

