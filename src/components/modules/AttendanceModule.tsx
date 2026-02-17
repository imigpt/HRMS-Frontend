import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Clock,
  Calendar,
  MapPin,
  Search,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Image,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { attendanceAPI, hrAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface AttendanceRecord {
  _id: string;
  user?: { 
    _id: string;
    name: string;
    employeeId?: string;
    role?: string;
  };
  employeeName?: string;
  date: string;
  checkIn?: {
    time?: string;
    location?: { latitude: number; longitude: number; address?: string };
    photo?: { url: string; publicId: string; capturedAt: string };
  };
  checkOut?: {
    time?: string;
    location?: { latitude: number; longitude: number; address?: string };
  };
  checkInTime?: string;
  checkOutTime?: string;
  totalHours?: string;
  workHours?: number;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';
  location?: string;
}

interface AttendanceModuleProps {
  role: 'admin' | 'hr' | 'employee';
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'present':
      return <Badge className="status-approved">Present</Badge>;
    case 'late':
      return <Badge className="status-pending">Late</Badge>;
    case 'absent':
      return <Badge className="status-rejected">Absent</Badge>;
    case 'half-day':
      return <Badge className="status-in-progress">Half Day</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const AttendanceModule = ({ role }: AttendanceModuleProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all'); // For admin to filter employee/HR
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const { loading, execute } = useApi();
  const { toast } = useToast();

  useEffect(() => {
    fetchAttendance();
    if (role === 'employee') {
      fetchTodayStatus();
    }
  }, [role]);

  const fetchAttendance = async () => {
    try {
      let result;
      if (role === 'employee') {
        result = await execute(() => attendanceAPI.getMyAttendance());
      } else {
        // Admin and HR use the generic attendance endpoint
        // This will return all attendance for their company
        result = await execute(() => attendanceAPI.getAllAttendance());
      }
      
      console.log('Attendance API result:', result);
      
      if (result?.data) {
        // For generic /api/attendance endpoint, data is an array directly
        // For Employee, data also comes as an array
        const records = Array.isArray(result.data) ? result.data : (result.data.attendance || result.data);
        console.log('Attendance records:', records);
        setAttendanceData(Array.isArray(records) ? records : [records]);
      }
    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorMessage = statusCode === 429 
        ? 'Too many requests. Please wait a moment and try again.'
        : statusCode === 404
        ? 'Attendance endpoint not found. Please check backend configuration.'
        : error.response?.data?.message || 'Failed to fetch attendance';
      
      console.error('Failed to fetch attendance:', error);
      if (statusCode !== 429) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  };

  const fetchTodayStatus = async () => {
    try {
      const result = await execute(() => attendanceAPI.getToday());
      if (result?.data) {
        setTodayStatus(result.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch today status:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      await execute(() => attendanceAPI.checkIn());
      toast({
        title: 'Success',
        description: 'Checked in successfully',
      });
      fetchTodayStatus();
      fetchAttendance();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to check in',
        variant: 'destructive',
      });
    }
  };

  const handleCheckOut = async () => {
    try {
      await execute(() => attendanceAPI.checkOut());
      toast({
        title: 'Success',
        description: 'Checked out successfully',
      });
      fetchTodayStatus();
      fetchAttendance();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to check out',
        variant: 'destructive',
      });
    }
  };

  const filteredData = attendanceData.filter(record => {
    const employeeName = record.user?.name || record.employeeName || '';
    const matchesSearch = employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesRole = roleFilter === 'all' || record.user?.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const stats = {
    present: attendanceData.filter(r => r.status === 'present').length,
    late: attendanceData.filter(r => r.status === 'late').length,
    absent: attendanceData.filter(r => r.status === 'absent').length,
    halfDay: attendanceData.filter(r => r.status === 'half-day').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.present}</p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.late}</p>
                  <p className="text-xs text-muted-foreground">Late</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.absent}</p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.halfDay}</p>
                  <p className="text-xs text-muted-foreground">Half Day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Attendance Records
                </CardTitle>
                <CardDescription>Today's attendance overview</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-[200px] bg-secondary border-border"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] bg-secondary border-border">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="half-day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
                {role === 'admin' && (
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[130px] bg-secondary border-border">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="employee">Employees</SelectItem>
                      <SelectItem value="hr">HR Managers</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Button variant="secondary">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Punch In</TableHead>
                    <TableHead>Punch Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Photo</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && attendanceData.length === 0 ? (
                    <TableRow key="loading">
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow key="empty">
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((record) => {
                      const employeeName = record.user?.name || record.employeeName || 'Unknown';
                      const displayDate = record.date ? new Date(record.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) : 'Invalid Date';
                      
                      // Handle both old and new data structures
                      const checkInTime = record.checkIn?.time || record.checkInTime;
                      const checkOutTime = record.checkOut?.time || record.checkOutTime;
                      
                      const checkIn = checkInTime 
                        ? new Date(checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : '-';
                      const checkOut = checkOutTime 
                        ? new Date(checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : '-';
                      
                      // Calculate hours if both times exist
                      let hours = '-';
                      if (record.workHours) {
                        hours = `${Math.floor(record.workHours / 60)}h ${record.workHours % 60}m`;
                      } else if (checkInTime && checkOutTime) {
                        const diff = new Date(checkOutTime).getTime() - new Date(checkInTime).getTime();
                        const totalMinutes = Math.floor(diff / (1000 * 60));
                        hours = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
                      }
                      
                      const checkInLocation = record.checkIn?.location;
                      
                      return (
                        <TableRow key={record._id} className="hover:bg-secondary/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                  {employeeName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{employeeName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{displayDate}</TableCell>
                          <TableCell>{checkIn}</TableCell>
                          <TableCell>{checkOut}</TableCell>
                          <TableCell>{hours}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            {record.checkIn?.photo?.url ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 px-2 text-primary hover:text-primary/80"
                                onClick={() => {
                                  const photoUrl = record.checkIn?.photo?.url;
                                  if (photoUrl) window.open(photoUrl, '_blank');
                                }}
                              >
                                <Image className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {checkInLocation ? (
                              <a
                                href={`https://www.google.com/maps?q=${checkInLocation.latitude},${checkInLocation.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                              >
                                <MapPin className="h-3 w-3" />
                                <span className="text-xs underline">
                                  {checkInLocation.latitude.toFixed(4)}, {checkInLocation.longitude.toFixed(4)}
                                </span>
                              </a>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="text-xs">-</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceModule;
