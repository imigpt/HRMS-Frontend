import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useApi } from '@/hooks/useApi';
import { announcementAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import {
  Megaphone,
  Plus,
  Calendar,
  Bell,
  AlertTriangle,
  Info,
  Clock,
  Loader2,
} from 'lucide-react';

interface Announcement {
  _id: string;
  title: string;
  content: string;
  author?: { name: string } | string;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

interface AnnouncementsModuleProps {
  role: 'admin' | 'hr' | 'employee';
}

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'medium':
      return <Bell className="h-4 w-4 text-warning" />;
    default:
      return <Info className="h-4 w-4 text-primary" />;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'high':
      return <Badge className="status-rejected">Urgent</Badge>;
    case 'medium':
      return <Badge className="status-pending">Important</Badge>;
    case 'low':
      return <Badge className="status-approved">Info</Badge>;
    default:
      return <Badge>{priority}</Badge>;
  }
};

const AnnouncementsModule = ({ role }: AnnouncementsModuleProps) => {
  const [filter, setFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    priority: 'low',
  });
  
  const { data, loading, execute } = useApi();
  const { toast } = useToast();

  // Fetch announcements on mount
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const result = await execute(() => announcementAPI.getAnnouncements());
      if (result?.data) {
        setAnnouncements(result.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch announcements',
        variant: 'destructive',
      });
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!formData.title || !formData.content || !formData.category) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await execute(() => announcementAPI.createAnnouncement(formData));
      toast({
        title: 'Success',
        description: 'Announcement published successfully',
      });
      setIsDialogOpen(false);
      setFormData({ title: '', content: '', category: '', priority: 'low' });
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create announcement',
        variant: 'destructive',
      });
    }
  };

  const filteredAnnouncements = announcements.filter(ann => {
    if (filter === 'all') return true;
    return ann.priority === filter;
  });

  // Both Admin and HR can create announcements
  const canCreate = role === 'hr' || role === 'admin';

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {announcements.filter(a => a.priority === 'high').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Urgent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {announcements.filter(a => a.priority === 'medium').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Important</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{announcements.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Announcements */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  Announcements
                </CardTitle>
                <CardDescription>Company-wide announcements and updates</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[130px] bg-secondary border-border">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">Urgent</SelectItem>
                    <SelectItem value="medium">Important</SelectItem>
                    <SelectItem value="low">Info</SelectItem>
                  </SelectContent>
                </Select>
                {canCreate && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="glow-button">
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card">
                      <DialogHeader>
                        <DialogTitle>Create Announcement</DialogTitle>
                        <DialogDescription>Broadcast a message to all employees</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input 
                            placeholder="Enter announcement title" 
                            className="bg-secondary border-border" 
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="policy">Policy</SelectItem>
                                <SelectItem value="events">Events</SelectItem>
                                <SelectItem value="benefits">Benefits</SelectItem>
                                <SelectItem value="it">IT</SelectItem>
                                <SelectItem value="facility">Facility</SelectItem>
                                <SelectItem value="general">General</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Info</SelectItem>
                                <SelectItem value="medium">Important</SelectItem>
                                <SelectItem value="high">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Content</Label>
                          <Textarea 
                            placeholder="Enter announcement content" 
                            className="bg-secondary border-border min-h-[120px]" 
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          />
                        </div>
                        <Button 
                          className="w-full glow-button" 
                          onClick={handleCreateAnnouncement}
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Publishing...
                            </>
                          ) : (
                            'Publish Announcement'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && !announcements.length ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No announcements found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((announcement) => (
                  <div
                    key={announcement._id}
                    className={`p-5 rounded-lg bg-secondary/50 border-l-4 ${
                      announcement.priority === 'high' ? 'border-l-destructive' :
                      announcement.priority === 'medium' ? 'border-l-warning' : 'border-l-primary'
                    } hover:bg-secondary transition-colors`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {getPriorityIcon(announcement.priority)}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                            {getPriorityBadge(announcement.priority)}
                            <Badge variant="outline" className="text-xs capitalize">{announcement.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{announcement.content}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{typeof announcement.author === 'string' ? announcement.author : announcement.author?.name || 'System'}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(announcement.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AnnouncementsModule;
