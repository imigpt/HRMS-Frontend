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
  UserCircle,
  Phone,
  Mail,
  Home,
  CalendarDays,
  Award,
  AlertTriangle,
  MessageSquare,
  IndianRupee,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { employeeAPI, attendanceAPI, leaveAPI, authAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const EmployeeDashboard = () => {
  // Simple rupee icon component for cards
  const RupeeIcon = (props: any) => <span {...props} className={(props.className || '') + ' text-primary text-lg'}>₹</span>;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchTime, setPunchTime] = useState<string | null>(null);
  const { toast } = useToast();

  // ── New state for the extra sections ────────────────────────────────────────
  const [profileData, setProfileData] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0, present: 0, leaves: 0, halfDay: 0, late: 0,
  });
  const [leaveStats, setLeaveStats] = useState({
    total: 0, approved: 0, rejected: 0, pending: 0, paidLeaves: 0, unpaidLeaves: 0,
  });
  const [workHours, setWorkHours] = useState({
    totalOfficeHrs: 8,
    workedHrs: 0,
    workedMins: 0,
    lateHrs: 0,
    lateMins: 0,
    workedProgress: 0,
  });

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);

      // ── Core dashboard ──────────────────────────────────────────────────────
      const response = await employeeAPI.getDashboard();
      const data = response.data.data;
      setDashboardData(data);
      setMyTasks(Array.isArray(data?.tasks) ? data.tasks : []);
      setAnnouncements(Array.isArray(data?.announcements) ? data.announcements : []);
      setIsPunchedIn(data?.attendance?.isPunchedIn || false);
      setPunchTime(data?.attendance?.punchTime || null);

      // Working hours from dashboard data
      const wh = data?.attendance?.workingHours || '0h 0m';
      const whMatch = wh.match(/(\d+)h\s*(\d+)m/);
      const workedHrs  = whMatch ? parseInt(whMatch[1]) : 0;
      const workedMins = whMatch ? parseInt(whMatch[2]) : 0;
      const workedProgress = data?.attendance?.workProgress || 0;
      setWorkHours({ totalOfficeHrs: 8, workedHrs, workedMins, lateHrs: 0, lateMins: 0, workedProgress });

      // ── Profile ─────────────────────────────────────────────────────────────
      try {
        const profileRes = await authAPI.getMe();
        setProfileData(profileRes.data?.user || null);
      } catch { /* silent */ }

      // ── Attendance stats for current month ──────────────────────────────────
      try {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        const attRes = await attendanceAPI.getMyAttendance({ startDate: firstDay, endDate: lastDay, limit: 200 });
        const records: any[] = attRes?.data?.data || attRes?.data || [];
        const total    = records.length;
        const late     = records.filter((r: any) => r.status === 'late').length;
        const leaves   = records.filter((r: any) => r.status === 'on-leave' || r.status === 'absent').length;
        const halfDay  = records.filter((r: any) => r.status === 'half-day').length;
        const present  = records.filter((r: any) => r.status === 'present').length;

        // Compute late minutes from today's record if available
        const todayRec = records.find((r: any) => {
          const d = new Date(r.date);
          const t = new Date();
          return d.getDate() === t.getDate() && d.getMonth() === t.getMonth();
        });
        if (todayRec?.checkIn?.time) {
          const expected = new Date(todayRec.date);
          expected.setHours(9, 0, 0, 0);
          const actual = new Date(todayRec.checkIn.time);
          const lateDiff = Math.max(0, actual.getTime() - expected.getTime());
          const lateHrs  = Math.floor(lateDiff / 3600000);
          const lateMins = Math.floor((lateDiff % 3600000) / 60000);
          setWorkHours(prev => ({ ...prev, lateHrs, lateMins }));
        }

        setAttendanceStats({ total, present, leaves, halfDay, late });
      } catch { /* silent */ }

      // ── Leave stats ─────────────────────────────────────────────────────────
      try {
        const leaveRes = await leaveAPI.getLeaves({ limit: 200 });
        const leavesData: any[] = leaveRes?.data?.data || leaveRes?.data || [];
        const approved    = leavesData.filter((l: any) => l.status === 'approved').length;
        const rejected    = leavesData.filter((l: any) => l.status === 'rejected').length;
        const pending     = leavesData.filter((l: any) => l.status === 'pending').length;
        const paidLeaves  = leavesData.filter((l: any) =>
          ['annual', 'sick', 'casual'].includes(l.leaveType) && l.status === 'approved'
        ).length;
        const unpaidLeaves = leavesData.filter((l: any) =>
          l.leaveType === 'unpaid' && l.status === 'approved'
        ).length;
        setLeaveStats({ total: leavesData.length, approved, rejected, pending, paidLeaves, unpaidLeaves });
      } catch { /* silent */ }

    } catch (error: any) {
      console.error('Failed to fetch dashboard:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load dashboard',
        variant: 'destructive',
      });
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

        {/* ── Row 2: Welcome & Check In | Today's Status (moved to top) ── */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="glass-card">
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
                    onClick={async () => {
                      try {
                        const res = await attendanceAPI.getToday();
                        const myToday = res.data?.data;
                        if (myToday && myToday.status === 'on-leave') {
                          toast({
                            title: 'Cannot Check In',
                            description: `You are on leave today (${myToday.leaveType || 'Leave'}). You cannot check in.`,
                            variant: 'destructive',
                          });
                          return;
                        }
                        navigate('/employee/attendance');
                      } catch (err: any) {
                        if (err.response?.status === 404) {
                          navigate('/employee/attendance');
                          return;
                        }
                        console.error('Failed to verify today attendance:', err);
                        toast({
                          title: 'Error',
                          description: err.response?.data?.message || 'Unable to verify attendance status',
                          variant: 'destructive',
                        });
                      }
                    }}
                    size="lg"
                    className={`glow-button h-20 w-40 text-lg font-semibold ${isPunchedIn ? 'bg-success hover:bg-success/90' : ''}`}
                  >
                    {isPunchedIn ? (
                      <><Timer className="h-5 w-5 mr-2" />Check Out</>
                    ) : (
                      <><Clock className="h-5 w-5 mr-2" />Check In</>
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
        </div>

        {/* ── Row 1: Employee Profile | Attendance Details | Leave Details ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Employee Profile */}
          <Card className="glass-card min-h-[260px]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  {profileData?.profilePhoto?.url ? (
                    <img src={profileData.profilePhoto.url} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <UserCircle className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate text-2xl">{profileData?.name || dashboardData?.user?.name || 'Employee'}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {profileData?.position || '—'} &bull; {profileData?.department || '—'}
                  </p>
                  <Badge variant="outline" className="text-sm mt-0.5 status-approved capitalize">
                    {profileData?.status || 'active'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3 text-lg">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0 text-primary/70" />
                  <span className="truncate">{profileData?.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0 text-primary/70" />
                  <span className="truncate">{profileData?.email || '—'}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Home className="h-4 w-4 flex-shrink-0 text-primary/70" />
                  <span className="truncate">{profileData?.address || '—'}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <CalendarDays className="h-4 w-4 flex-shrink-0 text-primary/70" />
                  <span className="truncate">
                    {profileData?.joinDate
                      ? new Date(profileData.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Details */}
          <Card className="glass-card min-h-[260px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Attendance Details
              </CardTitle>
              <CardDescription>Current month breakdown</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  {[
                    { label: 'Total Attendance', value: attendanceStats.total,   color: '#a855f7' },
                    { label: 'Present',           value: attendanceStats.present, color: '#22c55e' },
                    { label: 'Leaves',            value: attendanceStats.leaves,  color: '#ef4444' },
                    { label: 'Half Day',          value: attendanceStats.halfDay, color: '#3b82f6' },
                    { label: 'Late Attendance',   value: attendanceStats.late,    color: '#f97316' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-base text-muted-foreground flex-1">{item.label}</span>
                      <span className="text-lg font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="w-36 h-36 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Present',   value: Math.max(attendanceStats.present, 0) },
                          { name: 'Leaves',    value: Math.max(attendanceStats.leaves, 0) },
                          { name: 'Half Day',  value: Math.max(attendanceStats.halfDay, 0) },
                          { name: 'Late',      value: Math.max(attendanceStats.late, 0) },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        innerRadius={34} outerRadius={56}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {['#22c55e', '#ef4444', '#3b82f6', '#f97316'].map((color, i) => (
                          <Cell key={i} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 6,
                          fontSize: 11,
                          color: '#fff',
                        }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave Details */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                Leave Details
              </CardTitle>
              <CardDescription>Your leave summary</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: 'Total Leaves',  value: leaveStats.total,        color: 'text-foreground' },
                  { label: 'Approved',      value: leaveStats.approved,     color: 'text-green-400' },
                  { label: 'Rejected',      value: leaveStats.rejected,     color: 'text-red-400' },
                  { label: 'Pending',       value: leaveStats.pending,      color: 'text-yellow-400' },
                  // { label: 'Paid Leaves',   value: leaveStats.paidLeaves,   color: 'text-blue-400' },
                  // { label: 'Unpaid Leaves', value: leaveStats.unpaidLeaves, color: 'text-orange-400' },
                ].map(item => (
                  <div key={item.label} className="bg-secondary/40 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <Button className="w-full glow-button" onClick={() => navigate('/employee/leave')}>
                <CalendarCheck className="h-4 w-4 mr-2" />
                Apply New Leave
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview removed as requested */}

        {/* ── Row 4: Metric tiles ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Appreciations', icon: Award,         bg: 'bg-purple-500/20', iconColor: 'text-purple-400', value: 0 },
            { label: 'Warnings',      icon: AlertTriangle,  bg: 'bg-yellow-500/20', iconColor: 'text-yellow-400', value: 0 },
            { label: 'Expenses',      icon: IndianRupee,       bg: 'bg-blue-500/20',   iconColor: 'text-blue-400',   value: dashboardData?.stats?.pendingExpenses || 0 },
            { label: 'Complaints',    icon: MessageSquare,  bg: 'bg-red-500/20',    iconColor: 'text-red-400',    value: 0 },
          ].map(({ label, icon: Icon, bg, iconColor, value }) => (
            <Card key={label} className="glass-card">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Row 5: Working Hour Details ── */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Working Hour Details
              </CardTitle>
              <Badge variant="outline" className="text-xs">Today</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { dot: 'bg-foreground',  label: 'Total office time',  value: `${workHours.totalOfficeHrs} hrs` },
                { dot: 'bg-green-400',   label: 'Total worked time',  value: workHours.workedHrs > 0 || workHours.workedMins > 0 ? `${workHours.workedHrs} hrs ${workHours.workedMins} mins` : (dashboardData?.attendance?.workingHours || '0 mins') },
                { dot: 'bg-red-400',     label: 'Total Late time',    value: workHours.lateHrs > 0 || workHours.lateMins > 0 ? `${workHours.lateHrs} hrs ${workHours.lateMins} mins` : '0 mins' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${item.dot}`} />
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                  </div>
                  <p className="text-lg font-bold text-foreground whitespace-nowrap">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Progress value={Math.min(workHours.workedProgress, 100)} className="h-3 [&>div]:bg-green-400" />
            </div>
          </CardContent>
        </Card>

        {/* ── Row 6: My Tasks + Announcements ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <div key={task.id || task._id} className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          <p className="text-xs text-muted-foreground">Due: {task.deadline}</p>
                        </div>
                        <Badge variant="outline" className={task.status === 'completed' ? 'status-approved' : task.status === 'in-progress' ? 'status-in-progress' : 'status-pending'}>
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
                    <div key={announcement.id || announcement._id} className="p-4 rounded-lg bg-secondary/50 border-l-4 border-primary">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{announcement.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(announcement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
