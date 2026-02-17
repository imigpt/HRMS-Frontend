import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
