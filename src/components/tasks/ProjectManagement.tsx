import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FolderKanban, Plus, Pencil, Trash2, Calendar, Flag,
  Users, Milestone as MilestoneIcon, Loader2,
} from 'lucide-react';
import { getProjectStatusColor, formatDate } from './task-helpers';
import { taskAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface ProjectManagementProps {
  showCreateButton?: boolean;
}

const ProjectManagement = ({ showCreateButton = true }: ProjectManagementProps) => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    startDate: '',
    endDate: '',
    color: '#3b82f6',
  });
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  });

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await taskAPI.getProjects();
      setProjects(res.data.data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to load projects', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const fetchMilestones = async (projectId: string) => {
    try {
      const res = await taskAPI.getMilestones(projectId);
      setMilestones(res.data.data || []);
    } catch {
      setMilestones([]);
    }
  };

  const handleCreateProject = async () => {
    if (!formData.name) return;
    try {
      await taskAPI.createProject(formData);
      toast({ title: 'Success', description: 'Project created' });
      setFormData({ name: '', description: '', priority: 'medium', startDate: '', endDate: '', color: '#3b82f6' });
      setIsCreateOpen(false);
      fetchProjects();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create project', variant: 'destructive' });
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this project and all its milestones?')) return;
    try {
      await taskAPI.deleteProject(id);
      toast({ title: 'Success', description: 'Project deleted' });
      fetchProjects();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleCreateMilestone = async () => {
    if (!milestoneForm.title || !selectedProject) return;
    try {
      await taskAPI.createMilestone({
        title: milestoneForm.title,
        description: milestoneForm.description,
        project: selectedProject._id,
        dueDate: milestoneForm.dueDate || undefined,
      });
      toast({ title: 'Success', description: 'Milestone created' });
      setMilestoneForm({ title: '', description: '', dueDate: '' });
      setIsMilestoneOpen(false);
      fetchMilestones(selectedProject._id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create milestone', variant: 'destructive' });
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Delete this milestone?')) return;
    try {
      await taskAPI.deleteMilestone(id);
      toast({ title: 'Success', description: 'Milestone deleted' });
      if (selectedProject) fetchMilestones(selectedProject._id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showCreateButton && (
        <div className="flex justify-end">
          <Button className="glow-button" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Project
          </Button>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No projects yet. Create your first project to organize tasks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Card key={project._id} className="glass-card card-hover" style={{ borderLeftColor: project.color || '#3b82f6', borderLeftWidth: '4px' }}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{project.description}</p>
                    )}
                  </div>
                  <Badge className={getProjectStatusColor(project.status)}>
                    {project.status?.charAt(0).toUpperCase() + project.status?.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{project.priority}</span>
                  {project.startDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(project.startDate)}</span>}
                  {project.members && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{project.members.length}</span>}
                </div>
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.tags.slice(0, 3).map((tag: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                    setSelectedProject(project);
                    fetchMilestones(project._id);
                  }}>
                    <MilestoneIcon className="h-3 w-3 mr-1" />Milestones
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteProject(project._id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Milestones Panel */}
      {selectedProject && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Milestones — {selectedProject.name}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsMilestoneOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />Add Milestone
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedProject(null)}>Close</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">No milestones for this project</p>
            ) : (
              <div className="space-y-3">
                {milestones.map(ms => (
                  <div key={ms._id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ms.title}</p>
                      {ms.description && <p className="text-xs text-muted-foreground mt-0.5">{ms.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{ms.status}</Badge>
                        {ms.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(ms.dueDate)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <Progress value={ms.progress || 0} className="h-1.5" />
                        <p className="text-[10px] text-center mt-0.5">{ms.progress || 0}%</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive h-7 w-7 p-0" onClick={() => handleDeleteMilestone(ms._id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-background max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Organize tasks under a project</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input placeholder="Enter project name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Project description" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
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
                <Label>Color</Label>
                <Input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={!formData.name}>Create Project</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Milestone Dialog */}
      <Dialog open={isMilestoneOpen} onOpenChange={setIsMilestoneOpen}>
        <DialogContent className="bg-background max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Milestone</DialogTitle>
            <DialogDescription>Add a milestone to {selectedProject?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="Milestone title" value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Milestone description" rows={3} value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsMilestoneOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateMilestone} disabled={!milestoneForm.title}>Create Milestone</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectManagement;
