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
  Calendar,
  Edit,
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
      if (!isPunchedIn) {
        await attendanceAPI.checkIn();
        setIsPunchedIn(true);
        toast({ title: 'Checked in successfully' });
      } else {
        await attendanceAPI.checkOut();
        setIsPunchedIn(false);
        toast({ title: 'Checked out successfully' });
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

  // SVG ring clock
  const RADIUS = 52;
  const CIRC = 2 * Math.PI * RADIUS;
  const workedPercent = Math.min((todayAtt.workedMinutes || 0) / (8 * 60) * 100, 100);
  const strokeOffset = CIRC - (workedPercent / 100) * CIRC;

  const formatDuration = (mins: number) => {
    if (!mins) return '0 mins';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} mins`;
  };

  const workedDisplay = formatDuration(todayAtt.workedMinutes || 0);
  const lateDisplay = formatDuration(todayAtt.lateMinutes || 0);

  const now = new Date();
  const dateTimeDisplay =
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) +
    ', ' +
    now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">

        {/* ── ROW 1: Profile | Attendance Details | Leave Details ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Employee Profile */}
          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {profile.profilePhoto ? (
                      <img src={profile.profilePhoto} alt={profile.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground leading-tight">{profile.name || 'Employee'}</p>
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

              <div className="space-y-3">
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
                    <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{value || '-'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Details */}
          <Card className="glass-card">
            <CardHeader className="pt-5 px-5 pb-3">
              <CardTitle className="text-base">Attendance Details</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
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
            <CardHeader className="pt-5 px-5 pb-3">
              <CardTitle className="text-base">Leave Details</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-5">
                {[
                  { label: 'Total Leaves', value: leaveStats.total || 0, color: 'text-foreground' },
                  { label: 'Approved', value: leaveStats.approved || 0, color: 'text-emerald-500' },
                  { label: 'Rejected', value: leaveStats.rejected || 0, color: 'text-destructive' },
                  { label: 'Pending', value: leaveStats.pending || 0, color: 'text-amber-500' },
                  { label: 'Paid Leaves', value: leaveStats.paidLeaves || 0, color: 'text-foreground' },
                  { label: 'Unpaid Leaves', value: leaveStats.unpaidLeaves || 0, color: 'text-foreground' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={cn('text-xl font-bold mt-0.5', color)}>{value}</p>
                  </div>
                ))}
              </div>
              <Button className="w-full glow-button" onClick={() => navigate('/employee/leave')}>
                Apply New Leave
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── ROW 2: Attendance Clock + 4 Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

          {/* Attendance Clock */}
          <Card className="glass-card col-span-2 sm:col-span-1 lg:col-span-1">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <p className="font-semibold text-sm text-foreground">Attendance</p>
              <p className="text-[11px] text-muted-foreground mb-3 mt-0.5">{dateTimeDisplay}</p>

              {/* SVG Ring */}
              <div className="relative mb-3">
                <svg className="w-[120px] h-[120px] -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="hsl(var(--secondary))" strokeWidth="9" />
                  <circle
                    cx="60" cy="60" r={RADIUS}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={workedPercent > 0 ? strokeOffset : CIRC}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">{workedDisplay}</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground mb-2">Production: {workedDisplay}</p>

              {todayAtt.checkIn && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  <span>Clock In Time {todayAtt.checkIn}</span>
                </div>
              )}

              {todayAtt.checkOut ? (
                <Button variant="outline" size="sm" className="w-full text-[11px] h-7 mt-1" disabled>
                  Clocked Out : {todayAtt.checkOut}
                </Button>
              ) : todayAtt.checkIn ? (
                <Button variant="outline" size="sm" className="w-full text-xs mt-2" onClick={handlePunch}>
                  <Timer className="h-3 w-3 mr-1" /> Clock Out
                </Button>
              ) : (
                <Button size="sm" className="w-full text-xs mt-2 glow-button" onClick={handlePunch}>
                  <Clock className="h-3 w-3 mr-1" /> Clock In
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 4 Mini Stat Cards */}
          {[
            { label: 'Leave Balance', value: stats.leaveBalance ?? 0, icon: CalendarCheck, color: 'bg-primary/20 text-primary' },
            { label: 'Active Tasks', value: stats.activeTasks ?? 0, icon: ClipboardList, color: 'bg-purple-500/20 text-purple-400' },
            { label: 'Expenses', value: stats.expenseCount ?? 0, icon: Receipt, color: 'bg-orange-500/20 text-orange-400' },
            { label: 'Attendance %', value: `${stats.attendancePercentage ?? 0}%`, icon: CheckCircle, color: 'bg-emerald-500/20 text-emerald-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="glass-card">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[130px]">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── ROW 3: Working Hour Details ── */}
        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground">Working Hour Details</h3>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                Today
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { dot: 'bg-foreground/70', label: 'Total office time', value: `${todayAtt.officeHours || 8} hrs` },
                { dot: 'bg-emerald-500', label: 'Total worked time', value: workedDisplay },
                { dot: 'bg-destructive', label: 'Total Late time', value: lateDisplay },
              ].map(({ dot, label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
                    {label}
                  </p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            <Progress value={todayAtt.workProgress || 0} className="h-2" />
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
