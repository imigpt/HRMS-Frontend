import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList, Plus, CheckCircle, Clock, AlertCircle, AlertTriangle,
  Filter, Loader2, LayoutList, Columns3, Timer,
} from 'lucide-react';
import { taskAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import TaskListView from '@/components/tasks/TaskListView';
import TaskKanbanBoard from '@/components/tasks/TaskKanbanBoard';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';
import TaskCreateDialog from '@/components/tasks/TaskCreateDialog';
import TaskEditDialog from '@/components/tasks/TaskEditDialog';
import TimeTracker from '@/components/tasks/TimeTracker';
import { WorkflowDiagramButton } from '@/components/tasks/WorkflowDiagram';

const EmployeeTasks = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('list');
  const [editTask, setEditTask] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, projectsRes] = await Promise.all([
        taskAPI.getMyTasks(),
        taskAPI.getProjects(),
      ]);
      setTasks(tasksRes.data.data || []);
      setProjects(projectsRes.data.data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load tasks', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const stats = {
    total: tasks.length,
    draft: tasks.filter(t => t.status === 'draft').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'closed' && t.status !== 'rejected').length,
  };

  const handleViewTask = (task: any) => { setSelectedTask(task); setIsDetailOpen(true); };
  const handleEditTask = (task: any) => { setEditTask(task); setIsEditOpen(true); };
  const handleEditSave = () => { fetchData(); setIsEditOpen(false); setEditTask(null); };

  return (
    <DashboardLayout>
      {loading && tasks.length === 0 ? (
        <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
            <p className="text-muted-foreground">Manage your tasks and track progress</p>
          </div>
          <div className="flex items-center gap-2">
            <WorkflowDiagramButton />
            <Button className="glow-button" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Task</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold text-foreground">{stats.draft}</p><p className="text-xs text-muted-foreground">Draft</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Clock className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{stats.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold text-foreground">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold text-foreground">{stats.overdue}</p><p className="text-xs text-muted-foreground">Overdue</p></div></div></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5"><LayoutList className="h-3.5 w-3.5" />List</TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5"><Columns3 className="h-3.5 w-3.5" />Kanban</TabsTrigger>
            <TabsTrigger value="time" className="gap-1.5"><Timer className="h-3.5 w-3.5" />Time Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4 mt-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem><SelectItem value="pending-approval">Pending Approval</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem><SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="under-review">Under Review</SelectItem><SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem><SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="All Priorities" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Badge variant="outline">{filteredTasks.length} tasks</Badge></div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle>My Tasks</CardTitle></CardHeader>
              <CardContent>
                <TaskListView tasks={filteredTasks} loading={loading} onViewTask={handleViewTask} onEditTask={handleEditTask} showAssignee={false} showProject={true} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kanban" className="mt-4">
            <TaskKanbanBoard tasks={filteredTasks} onViewTask={handleViewTask} showAssignee={false} />
          </TabsContent>

          <TabsContent value="time" className="mt-4"><TimeTracker tasks={tasks} /></TabsContent>
        </Tabs>

        <TaskCreateDialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={fetchData} employees={[]} projects={projects} showAssignee={false} defaultAssignee={user?._id} />
        {editTask && <TaskEditDialog task={editTask} open={isEditOpen} onClose={() => { setIsEditOpen(false); setEditTask(null); }} onSaved={handleEditSave} employees={[]} projects={projects} showAssignee={false} />}
        <TaskDetailDialog task={selectedTask} open={isDetailOpen} onClose={() => setIsDetailOpen(false)} onTaskUpdated={fetchData} canReview={false} canUpload={true} canComment={true} canTrackTime={true} showAssignee={false} userRole="employee" />
      </div>
      )}
    </DashboardLayout>
  );
};

export default EmployeeTasks;
