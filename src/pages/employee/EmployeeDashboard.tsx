import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  CalendarCheck,
  ClipboardList,
  Receipt,
  MapPin,
  CheckCircle,
  Timer,
  Megaphone,
  Loader2,
} from 'lucide-react';
import { employeeAPI, attendanceAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchTime, setPunchTime] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getDashboard();
      const data = response.data.data;
      setDashboardData(data);
      
      // Ensure tasks is always an array
      const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
      setMyTasks(tasks);
      
      // Ensure announcements is always an array
      const announcementsData = Array.isArray(data?.announcements) ? data.announcements : [];
      setAnnouncements(announcementsData);
      
      setIsPunchedIn(data?.attendance?.isPunchedIn || false);
      setPunchTime(data?.attendance?.punchTime || null);
    } catch (error: any) {
      console.error('Failed to fetch dashboard:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load dashboard',
        variant: 'destructive',
      });
      // Set empty arrays on error to prevent map errors
      setMyTasks([]);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handlePunch = async () => {
    try {
      if (!isPunchedIn) {
        const response = await attendanceAPI.checkIn();
        setIsPunchedIn(true);
        setPunchTime(response.data.data?.checkIn || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        toast({
          title: 'Success',
          description: 'Checked in successfully',
        });
      } else {
        await attendanceAPI.checkOut();
        setIsPunchedIn(false);
        toast({
          title: 'Success',
          description: 'Checked out successfully',
        });
      }
      fetchDashboard();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to check in/out',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Welcome & Check In Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Check In/Out Card */}
          <Card className="lg:col-span-2 glass-card">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Good Morning, {dashboardData?.user?.name || 'Employee'}!
                  </h2>
                  <p className="text-muted-foreground">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  {isPunchedIn && punchTime && (
                    <div className="flex items-center gap-2 mt-3 text-success">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Checked in at {punchTime}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-3">
                  <Button
                    onClick={() => navigate('/employee/attendance')}
                    size="lg"
                    className={`glow-button h-20 w-40 text-lg font-semibold ${
                      isPunchedIn ? 'bg-success hover:bg-success/90' : ''
                    }`}
                  >
                    {isPunchedIn ? (
                      <>
                        <Timer className="h-5 w-5 mr-2" />
                        Check Out
                      </>
                    ) : (
                      <>
                        <Clock className="h-5 w-5 mr-2" />
                        Check In
                      </>
                    )}
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>Location: Office - Main Building</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
/* Today's Status */
          {/* Today's Status */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Today's Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Working Hours</span>
                  <span className="text-sm font-medium text-foreground">
                    {dashboardData?.attendance?.workingHours || '0h 0m'}
                  </span>
                </div>
                <Progress value={dashboardData?.attendance?.workProgress || 0} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0h</span>
                  <span>{dashboardData?.attendance?.workTarget || 8}h target</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Leave Balance"
            value={dashboardData?.stats?.leaveBalance || 0}
            icon={CalendarCheck}
            suffix=" days"
            className="stagger-1"
          />
          <StatsCard
            title="Active Tasks"
            value={dashboardData?.stats?.activeTasks || 0}
            icon={ClipboardList}
            className="stagger-2"
          />
          <StatsCard
            title="Pending Expenses"
            value={dashboardData?.stats?.pendingExpenses || 0}
            icon={Receipt}
            prefix="₹"
            className="stagger-3"
          />
          <StatsCard
            title="This Month Attendance"
            value={dashboardData?.stats?.attendancePercentage || 0}
            icon={Clock}
            suffix="%"
            className="stagger-4"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Tasks */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                My Tasks
              </CardTitle>
              <CardDescription>Your assigned tasks and progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(myTasks) && myTasks.length > 0 ? (
                  myTasks.map((task) => (
                    <div
                      key={task.id || task._id}
                      className="p-4 rounded-lg bg-secondary/50"
                    >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                        <p className="text-xs text-muted-foreground">Due: {task.deadline}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          task.status === 'completed' ? 'status-approved' :
                          task.status === 'in-progress' ? 'status-in-progress' : 'status-pending'
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-foreground">{task.progress}%</span>
                      </div>
                      <Progress value={task.progress} className="h-2" />
                    </div>
                  </div>
                ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No tasks assigned yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Announcements
              </CardTitle>
              <CardDescription>Latest company updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(announcements) && announcements.length > 0 ? (
                  announcements.map((announcement) => (
                    <div
                      key={announcement.id || announcement._id}
                      className="p-4 rounded-lg bg-secondary/50 border-l-4 border-primary"
                    >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{announcement.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(announcement.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Megaphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No announcements yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
