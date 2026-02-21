import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Clock,
  CalendarCheck,
  ClipboardList,
  Receipt,
  CheckCircle,
  Timer,
  Megaphone,
  Loader2,
  User,
  Star,
  Calendar,
  Edit,
  MapPin,
  HouseIcon,
  IndianRupee,
} from 'lucide-react';
import { employeeAPI, attendanceAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const DONUT_COLORS: Record<string, string> = {
  Present: '#10b981',
  Leaves: '#ef4444',
  'Half Day': '#3b82f6',
  'Late Attendance': '#f59e0b',
};

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const { toast } = useToast();

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getDashboard();
      const data = response.data.data;
      setDashboardData(data);
      setIsPunchedIn(data?.todayAttendance?.isPunchedIn || false);
    } catch (error: any) {
      console.error('Failed to fetch dashboard:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load dashboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handlePunch = async () => {
    try {
      // Navigate to attendance page which will handle photo/location capture
      if (!isPunchedIn) {
        navigate('/employee/attendance?mode=checkin');
      } else {
        navigate('/employee/attendance?mode=checkout');
      }
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

  const profile = dashboardData?.user || {};
  const leaveStats = dashboardData?.leaveStats || {};
  const attStats = dashboardData?.attendanceStats || {};
  const todayAtt = dashboardData?.todayAttendance || {};
  const stats = dashboardData?.stats || {};
  const myTasks = Array.isArray(dashboardData?.tasks) ? dashboardData.tasks : [];
  const announcements = Array.isArray(dashboardData?.announcements) ? dashboardData.announcements : [];

  // Donut chart data
  const donutRaw = [
    { name: 'Present', value: attStats.present || 0 },
    { name: 'Leaves', value: attStats.leaveDays || 0 },
    { name: 'Half Day', value: attStats.halfDay || 0 },
    { name: 'Late Attendance', value: attStats.late || 0 },
  ];
  const donutData = donutRaw.filter(d => d.value > 0);
  const displayDonut = donutData.length > 0 ? donutData : [{ name: 'No Data', value: 1 }];

  const formatDuration = (mins: number) => {
    if (!mins || mins <= 0) return '0 mins';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} mins`;
  };
  const workedDisplay = formatDuration(todayAtt.workedMinutes || 0);
  const lateDisplay = formatDuration(todayAtt.lateMinutes || 0);
  const officeHours = todayAtt.officeHours || 8;
  const workProgress = Math.min(((todayAtt.workedMinutes || 0) / (officeHours * 60)) * 100, 100);

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">

        {/* ── TOP: Welcome & Check In/Out Section ── */}
        <Card className="glass-card bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Left: Greeting */}
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                  Good Morning, {profile.name || 'Employee'}!
                </h1>
                <p className="text-muted-foreground mt-2">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                
                {/* Check In Status */}
                {todayAtt.checkIn && (
                  <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg bg-emerald-500/10 w-fit">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600">
                      Checked in at {todayAtt.checkIn}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Check In/Out Button & Location */}
              <div className="flex flex-col items-start md:items-end gap-4">
                <Button
                  onClick={handlePunch}
                  size="lg"
                  className={cn(
                    "glow-button h-14 px-8 text-base font-semibold rounded-xl",
                    isPunchedIn 
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                      : 'bg-primary hover:bg-primary/90'
                  )}
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
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Location: Office - Main Building</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── ROW 1: Profile | Attendance Details | Leave Details ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Employee Profile */}
          <Card className="glass-card">
            <CardHeader className="pt-4 px-4 pb-2">
              <CardTitle className="text-lg font-bold">Employee Profile</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {profile.profilePhoto ? (
                      <img src={profile.profilePhoto} alt={profile.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-foreground leading-tight">{profile.name || 'Employee'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {profile.position || 'Employee'}
                      {profile.department && (
                        <> &bull; <span className="text-primary">{profile.department}</span></>
                      )}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => navigate('/employee/profile')}>
                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: 'Phone Number', value: profile.phone },
                  { label: 'Email', value: profile.email },
                  { label: 'Address', value: profile.address },
                  {
                    label: 'Joining Date',
                    value: profile.joinDate ? new Date(profile.joinDate).toLocaleDateString() : null,
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[11px] font-bold text-primary uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{value || '-'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Details */}
          <Card className="glass-card">
            <CardHeader className="pt-4 px-4 pb-2">
              <CardTitle className="text-lg font-bold">Attendance Details</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center gap-4">
                {/* Legend */}
                <div className="flex-1 space-y-2.5">
                  {[
                    { label: 'Total Attendance', value: attStats.total || 0, color: '#a855f7' },
                    { label: 'Present', value: attStats.present || 0, color: '#10b981' },
                    { label: 'Leaves', value: attStats.leaveDays || 0, color: '#ef4444' },
                    { label: 'Half Day', value: attStats.halfDay || 0, color: '#3b82f6' },
                    { label: 'Late Attendance', value: attStats.late || 0, color: '#f59e0b' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm font-bold text-foreground w-7 text-right tabular-nums">{value}</span>
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
                {/* Donut */}
                <div className="w-28 h-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={displayDonut}
                        cx="50%"
                        cy="50%"
                        innerRadius={34}
                        outerRadius={52}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={0}
                      >
                        {displayDonut.map((entry, i) => (
                          <Cell key={i} fill={DONUT_COLORS[entry.name] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: 'var(--foreground)'
                        }}
                        itemStyle={{
                          color: 'var(--foreground)'
                        }}
                        labelStyle={{
                          color: 'var(--muted-foreground)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave Details */}
          <Card className="glass-card">
            <CardHeader className="pt-4 px-4 pb-2">
              <CardTitle className="text-lg font-bold">Leave Details</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
                {[
                  // { label: 'Paid Leave', value: `${leaveStats.paidBalance ?? 0} days`, color: 'text-primary' },
                  // { label: 'Sick Leave', value: `${leaveStats.sickBalance ?? 0} days`, color: 'text-purple-400' },
                  // { label: 'Unpaid Leave', value: `${leaveStats.unpaidBalance ?? 0} days`, color: 'text-foreground' },
                  { label: 'Approved', value: leaveStats.approved ?? 0, color: 'text-emerald-500' },
                  { label: 'Rejected', value: leaveStats.rejected ?? 0, color: 'text-destructive' },
                  { label: 'Pending', value: leaveStats.pending ?? 0, color: 'text-amber-500' },
                  { label: 'Total Applied', value: leaveStats.total ?? 0, color: 'text-foreground' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className={cn('text-2xl font-bold mt-0.5 tabular-nums', color)}>{value}</p>
                  </div>
                ))}
              </div>
              <Button className="w-full glow-button" onClick={() => navigate('/employee/leave')}>
                Apply New Leave
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── ROW 2: 4 Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Appreciations', value: stats.appreciationCount ?? stats.appreciations ?? 0, icon: Star, color: 'bg-amber-500/20 text-amber-400' },
            { label: 'Active Tasks', value: stats.activeTasks ?? 0, icon: ClipboardList, color: 'bg-purple-500/20 text-purple-400' },
            { label: 'Expenses', value: stats.expenseCount ?? 0, icon: IndianRupee, color: 'bg-orange-500/20 text-orange-400' },
            { label: 'Complaints', value: stats.complaintsCount ?? stats.complaints ?? 0, icon: HouseIcon, color: 'bg-rose-500/20 text-rose-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="glass-card">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Working Hour Details ── */}
        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-foreground">Working Hour Details</h3>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Today
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { dot: 'bg-foreground/80', label: 'Total office time', value: `${officeHours} hrs` },
                { dot: 'bg-emerald-500', label: 'Total worked time', value: workedDisplay },
                { dot: 'bg-destructive', label: 'Total Late working hours', value: lateDisplay },
              ].map(({ dot, label, value }) => (
                <div key={label}>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                    <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dot)} />
                    {label}
                  </p>
                  <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            <Progress value={workProgress} className="h-2" />
          </CardContent>
        </Card>

        {/* ── ROW 4: Tasks + Announcements ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-primary" />
                My Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myTasks.length > 0 ? (
                <div className="space-y-3">
                  {myTasks.map((task: any) => (
                    <div key={task._id || task.id} className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            task.status === 'completed' ? 'status-approved' :
                            task.status === 'in-progress' ? 'status-in-progress' : 'status-pending'
                          )}
                        >
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No tasks assigned yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-4 w-4 text-primary" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((a: any) => (
                    <div key={a._id || a.id} className="p-3 rounded-lg bg-secondary/50 border-l-4 border-primary">
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Megaphone className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No announcements yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
