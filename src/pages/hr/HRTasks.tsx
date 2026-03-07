import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ClipboardList, Plus, CheckCircle, Clock, AlertCircle, AlertTriangle,
  Filter, Loader2, LayoutList, Columns3, FolderKanban, Timer, Users, Search,
} from 'lucide-react';
import { hrAPI, taskAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import TaskListView from '@/components/tasks/TaskListView';
import TaskKanbanBoard from '@/components/tasks/TaskKanbanBoard';
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog';
import TaskCreateDialog from '@/components/tasks/TaskCreateDialog';
import TaskEditDialog from '@/components/tasks/TaskEditDialog';
import ProjectManagement from '@/components/tasks/ProjectManagement';
import TimeTracker from '@/components/tasks/TimeTracker';
import { getInitials } from '@/components/tasks/task-helpers';

const HRTasks = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('list');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [editTask, setEditTask] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, employeesRes, projectsRes] = await Promise.all([
        taskAPI.getTeamTasks(),
        hrAPI.getEmployees(),
        taskAPI.getProjects(),
      ]);
      setTasks(tasksRes.data.data || []);
      setEmployees(employeesRes.data.data || []);
      setProjects(projectsRes.data.data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const assigneeId = typeof task.assignedTo === 'object' ? task.assignedTo?._id : task.assignedTo;
    const matchesEmployee = employeeFilter === 'all' || assigneeId === employeeFilter;
    return matchesStatus && matchesPriority && matchesEmployee;
  });

  const stats = {
    total: tasks.length,
    pendingApproval: tasks.filter(t => t.status === 'pending-approval').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'closed' && t.status !== 'rejected').length,
  };

  const handleViewTask = (task: any) => { setSelectedTask(task); setIsDetailOpen(true); };
  const handleEditTask = (task: any) => { setEditTask(task); setIsEditOpen(true); };
  const handleEditSave = () => { fetchData(); setIsEditOpen(false); setEditTask(null); };

  const filteredEmployees = employees.filter(emp =>
    !employeeSearch || emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) || emp.employeeId?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  return (
    <DashboardLayout>
      {loading && tasks.length === 0 ? (
        <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Task Management</h1>
            <p className="text-muted-foreground">Manage and track team tasks</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="glow-button" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Task</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold text-foreground">{stats.pendingApproval}</p><p className="text-xs text-muted-foreground">Pending</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Clock className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{stats.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold text-foreground">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold text-foreground">{stats.overdue}</p><p className="text-xs text-muted-foreground">Overdue</p></div></div></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5"><LayoutList className="h-3.5 w-3.5" />List</TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5"><Columns3 className="h-3.5 w-3.5" />Kanban</TabsTrigger>
            <TabsTrigger value="employees" className="gap-1.5"><Users className="h-3.5 w-3.5" />By Employee</TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5"><FolderKanban className="h-3.5 w-3.5" />Projects</TabsTrigger>
            <TabsTrigger value="time" className="gap-1.5"><Timer className="h-3.5 w-3.5" />Time Tracking</TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list" className="space-y-4 mt-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                    <SelectTrigger><Users className="h-4 w-4 mr-2" /><SelectValue placeholder="All Employees" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {employees.map(emp => (<SelectItem key={emp._id} value={emp._id}>{emp.name} ({emp.employeeId || ''})</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Badge variant="outline">{filteredTasks.length} tasks</Badge></div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle>Team Tasks</CardTitle></CardHeader>
              <CardContent>
                <TaskListView tasks={filteredTasks} loading={loading} onViewTask={handleViewTask} onEditTask={handleEditTask} showAssignee={true} showProject={true} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Kanban */}
          <TabsContent value="kanban" className="mt-4">
            <TaskKanbanBoard tasks={filteredTasks} onViewTask={handleViewTask} showAssignee={true} />
          </TabsContent>

          {/* By Employee */}
          <TabsContent value="employees" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="glass-card lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Employees</CardTitle>
                  <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search..." value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="px-3 pb-3 space-y-1">
                      <button onClick={() => setEmployeeFilter('all')}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${employeeFilter === 'all' ? 'bg-primary/20 text-primary font-semibold' : 'hover:bg-secondary/50'}`}>
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">All</div>
                        <span>All Employees</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">{tasks.length}</Badge>
                      </button>
                      {filteredEmployees.map(emp => {
                        const empTasks = tasks.filter(t => { const id = typeof t.assignedTo === 'object' ? t.assignedTo?._id : t.assignedTo; return id === emp._id; });
                        return (
                          <button key={emp._id} onClick={() => setEmployeeFilter(emp._id)}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${employeeFilter === emp._id ? 'bg-primary/20 text-primary font-semibold' : 'hover:bg-secondary/50'}`}>
                            <Avatar className="h-7 w-7"><AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-[9px] font-bold">{getInitials(emp.name)}</AvatarFallback></Avatar>
                            <div className="text-left min-w-0 flex-1">
                              <p className="truncate">{emp.name}</p>
                              <p className="text-[10px] text-muted-foreground">{emp.employeeId || emp.department || ''}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] flex-shrink-0">{empTasks.length}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card className="glass-card lg:col-span-3">
                <CardHeader><CardTitle className="text-sm">{employeeFilter === 'all' ? 'All Tasks' : `Tasks for ${employees.find(e => e._id === employeeFilter)?.name || 'Employee'}`}</CardTitle></CardHeader>
                <CardContent>
                  <TaskListView tasks={filteredTasks} loading={loading} onViewTask={handleViewTask} onEditTask={handleEditTask} showAssignee={employeeFilter === 'all'} showProject={true} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-4"><ProjectManagement showCreateButton={true} /></TabsContent>
          <TabsContent value="time" className="mt-4"><TimeTracker tasks={tasks} /></TabsContent>
        </Tabs>

        <TaskCreateDialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={fetchData} employees={employees} projects={projects} showAssignee={true} />
        {editTask && <TaskEditDialog task={editTask} open={isEditOpen} onClose={() => { setIsEditOpen(false); setEditTask(null); }} onSaved={handleEditSave} employees={employees} projects={projects} />}
        <TaskDetailDialog task={selectedTask} open={isDetailOpen} onClose={() => setIsDetailOpen(false)} onTaskUpdated={fetchData} canReview={true} canUpload={false} canComment={true} showAssignee={true} userRole="hr" employees={employees} />
      </div>
      )}
    </DashboardLayout>
  );
};

export default HRTasks;
