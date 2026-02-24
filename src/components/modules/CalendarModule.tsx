import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { attendanceAPI, leaveAPI } from '@/lib/apiClient';

interface CalendarModuleProps {
  role: 'admin' | 'hr' | 'employee';
}

interface DayData {
  date: number;
  status: 'present' | 'absent' | 'late' | 'holiday' | 'weekend' | 'future' | 'leave' | 'half-day';
  label?: string;
}

const CalendarModule = ({ role }: CalendarModuleProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const buildCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // 1-based

      // Fetch attendance records for this month
      const [attRes, leaveRes] = await Promise.all([
        attendanceAPI.getMyAttendance({ month, year }).catch(() => ({ data: [] })),
        leaveAPI.getLeaves({ month, year }).catch(() => ({ data: [] })),
      ]);

      // Build a date → status map from attendance
      const attMap: Record<string, string> = {};
      const attRaw = attRes?.data?.data ?? attRes?.data ?? [];
      (Array.isArray(attRaw) ? attRaw : []).forEach((rec: any) => {
        const d = new Date(rec.date);
        const key = d.getDate().toString();
        attMap[key] = rec.status; // 'present', 'absent', 'late', 'half-day', etc.
      });

      // Build a set of leave dates (approved leaves)
      const leaveDates: Record<string, { isHalfDay: boolean; session?: string }> = {};
      const leaveRaw = leaveRes?.data?.data ?? leaveRes?.data ?? [];
      (Array.isArray(leaveRaw) ? leaveRaw : []).forEach((leave: any) => {
        if (leave.status !== 'approved') return;
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        // Walk every day in the leave range
        const cur = new Date(start);
        while (cur <= end) {
          if (cur.getFullYear() === year && cur.getMonth() + 1 === month) {
            leaveDates[cur.getDate().toString()] = {
              isHalfDay: !!leave.isHalfDay,
              session: leave.session,
            };
          }
          cur.setDate(cur.getDate() + 1);
        }
      });

      const today = new Date();
      const daysInMonth = getDaysInMonth(currentMonth);
      const days: DayData[] = [];

      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, currentMonth.getMonth(), i);
        const dayOfWeek = date.getDay();
        const isFuture = date > today;
        const key = i.toString();

        let status: DayData['status'] = 'absent'; // default for past workdays
        let label: string | undefined;

        if (isFuture) {
          status = 'future';
        } else if (dayOfWeek === 0 || dayOfWeek === 6) {
          status = 'weekend';
        } else if (leaveDates[key]) {
          if (leaveDates[key].isHalfDay) {
            status = 'half-day';
            label = leaveDates[key].session ?? 'half';
          } else {
            status = 'leave';
            label = 'On Leave';
          }
        } else if (attMap[key]) {
          const s = attMap[key];
          if (s === 'present') status = 'present';
          else if (s === 'late') status = 'late';
          else if (s === 'half-day') status = 'half-day';
          else if (s === 'work-from-home') { status = 'present'; label = 'WFH'; }
          else status = 'absent';
        }
        // else: past weekday with no attendance = absent

        days.push({ date: i, status, label });
      }

      setCalendarData(days);
    } catch (err) {
      console.error('Calendar fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    buildCalendar();
  }, [buildCalendar]);

  const firstDay = getFirstDayOfMonth(currentMonth);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const getStatusColor = (status: DayData['status']) => {
    switch (status) {
      case 'present':    return 'bg-success/20 text-success border-success/30';
      case 'absent':     return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'late':       return 'bg-warning/20 text-warning border-warning/30';
      case 'holiday':    return 'bg-primary/20 text-primary border-primary/30';
      case 'leave':      return 'bg-blue-500/20 text-blue-400 border-blue-400/30';
      case 'half-day':   return 'bg-orange-500/20 text-orange-400 border-orange-400/30';
      case 'weekend':    return 'bg-muted text-muted-foreground border-border';
      case 'future':     return 'bg-transparent text-muted-foreground/50 border-border/50';
      default:           return '';
    }
  };

  // Count statistics
  const stats = {
    present:  calendarData.filter(d => d.status === 'present').length,
    absent:   calendarData.filter(d => d.status === 'absent').length,
    late:     calendarData.filter(d => d.status === 'late').length,
    leave:    calendarData.filter(d => d.status === 'leave' || d.status === 'half-day').length,
    holiday:  calendarData.filter(d => d.status === 'holiday').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Present',  count: stats.present,  color: 'bg-success' },
            { label: 'Absent',   count: stats.absent,   color: 'bg-destructive' },
            { label: 'Late',     count: stats.late,     color: 'bg-warning' },
            { label: 'Leave',    count: stats.leave,    color: 'bg-blue-500' },
            { label: 'Holiday',  count: stats.holiday,  color: 'bg-primary/50' },
          ].map(s => (
            <Card key={s.label} className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('w-4 h-4 rounded-full', s.color)} />
                <div>
                  <p className="text-lg font-bold text-foreground">{s.count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Calendar */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Attendance Calendar</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-lg font-semibold min-w-[160px] text-center">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {daysOfWeek.map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {calendarData.map(day => (
                    <div
                      key={day.date}
                      className={cn(
                        'aspect-square rounded-lg border flex flex-col items-center justify-center transition-all hover:scale-105 cursor-pointer',
                        getStatusColor(day.status)
                      )}
                    >
                      <span className="text-base font-semibold">{day.date}</span>
                      {day.status !== 'future' && day.status !== 'weekend' && (
                        <span className="text-[9px] capitalize leading-tight text-center px-1">
                          {day.label ?? day.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
                  {[
                    { color: 'bg-success',       label: 'Present' },
                    { color: 'bg-destructive',    label: 'Absent' },
                    { color: 'bg-warning',        label: 'Late' },
                    { color: 'bg-blue-500',       label: 'On Leave' },
                    { color: 'bg-orange-400',     label: 'Half Day' },
                    { color: 'bg-muted',          label: 'Weekend' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', l.color)} />
                      <span className="text-muted-foreground">{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CalendarModule;


interface CalendarModuleProps {
  role: 'admin' | 'hr' | 'employee';
}

interface DayData {
  date: number;
  status: 'present' | 'absent' | 'late' | 'holiday' | 'weekend' | 'future' | 'leave';
}

const CalendarModule = ({ role }: CalendarModuleProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Generate mock data for the calendar
  const generateCalendarData = (): DayData[] => {
    const days: DayData[] = [];
    const daysInMonth = getDaysInMonth(currentMonth);
    const today = new Date();

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const dayOfWeek = date.getDay();
      const isFuture = date > today;

      let status: DayData['status'] = 'present';

      if (isFuture) {
        status = 'future';
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        status = 'weekend';
      } else if (i === 15) {
        status = 'holiday';
      } else if (i === 10 || i === 11) {
        status = 'leave';
      } else if (i === 5 || i === 12) {
        status = 'late';
      } else if (i === 8) {
        status = 'absent';
      }

      days.push({ date: i, status });
    }

    return days;
  };

  const calendarData = generateCalendarData();
  const firstDay = getFirstDayOfMonth(currentMonth);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getStatusColor = (status: DayData['status']) => {
    switch (status) {
      case 'present':
        return 'bg-success/20 text-success border-success/30';
      case 'absent':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'late':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'holiday':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'leave':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'weekend':
        return 'bg-muted text-muted-foreground border-border';
      case 'future':
        return 'bg-transparent text-muted-foreground/50 border-border/50';
      default:
        return '';
    }
  };

  // Count statistics
  const stats = {
    present: calendarData.filter(d => d.status === 'present').length,
    absent: calendarData.filter(d => d.status === 'absent').length,
    late: calendarData.filter(d => d.status === 'late').length,
    leave: calendarData.filter(d => d.status === 'leave').length,
    holiday: calendarData.filter(d => d.status === 'holiday').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Legend & Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-success" />
              <div>
                <p className="text-lg font-bold text-foreground">{stats.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-destructive" />
              <div>
                <p className="text-lg font-bold text-foreground">{stats.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-warning" />
              <div>
                <p className="text-lg font-bold text-foreground">{stats.late}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-primary" />
              <div>
                <p className="text-lg font-bold text-foreground">{stats.leave}</p>
                <p className="text-xs text-muted-foreground">Leave</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-primary/50" />
              <div>
                <p className="text-lg font-bold text-foreground">{stats.holiday}</p>
                <p className="text-xs text-muted-foreground">Holiday</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Attendance Calendar</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-lg font-semibold min-w-[160px] text-center">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells for days before the first day of month */}
              {Array.from({ length: firstDay }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {/* Calendar days */}
              {calendarData.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    'aspect-square rounded-lg border flex flex-col items-center justify-center transition-all hover:scale-105 cursor-pointer',
                    getStatusColor(day.status)
                  )}
                >
                  <span className="text-lg font-semibold">{day.date}</span>
                  {day.status !== 'future' && day.status !== 'weekend' && (
                    <span className="text-[10px] capitalize">{day.status}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-muted-foreground">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-muted-foreground">Late</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Leave/Holiday</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <span className="text-muted-foreground">Weekend</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CalendarModule;
