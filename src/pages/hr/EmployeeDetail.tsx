import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  UserCircle,
  Key,
  Clock,
  MessageSquare,
  ClipboardList,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileEdit,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
} from 'lucide-react';
import { hrAPI, adminAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Import employee components for monitoring
import EmployeeTasksContent from '@/components/modules/EmployeeTasksContent.tsx';
import EmployeeChatContent from '@/components/modules/EmployeeChatContent.tsx';

// Type definitions
interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  dateOfBirth?: string;
  joinDate?: string;
  address?: string;
  status: 'active' | 'inactive' | 'on-leave';
  profilePhoto?: {
    url: string;
    publicId: string;
  } | string;
  company?: any;
}

interface DailyAttendance {
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  punchIn: string | null;
  punchOut: string | null;
  duration: string | null;
  remarks: string | null;
}

interface AttendanceEditRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  originalPunchIn: string | null;
  originalPunchOut: string | null;
  requestedPunchIn: string;
  requestedPunchOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

// Generate full month attendance data (temporary mock until attendance API is integrated)
const generateAttendanceData = (year: number, month: number, employeeId: string): DailyAttendance[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const attendance: DailyAttendance[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    
    // Generate realistic attendance data
    const rand = Math.random();
    const dayOfWeek = date.getDay();
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }
    
    if (rand > 0.9) {
      attendance.push({
        date: dateStr,
        status: 'absent',
        punchIn: null,
        punchOut: null,
        duration: null,
        remarks: null,
      });
    } else if (rand > 0.8) {
      attendance.push({
        date: dateStr,
        status: 'leave',
        punchIn: null,
        punchOut: null,
        duration: null,
        remarks: 'Sick Leave',
      });
    } else if (rand > 0.7) {
      attendance.push({
        date: dateStr,
        status: 'late',
        punchIn: '10:15 AM',
        punchOut: '06:30 PM',
        duration: '08:15',
        remarks: 'Traffic delay',
      });
    } else {
      attendance.push({
        date: dateStr,
        status: 'present',
        punchIn: '09:00 AM',
        punchOut: '06:00 PM',
        duration: '09:00',
        remarks: null,
      });
    }
  }
  
  return attendance;
};

type Section = 'overview' | 'attendance' | 'tasks' | 'chat';

const EmployeeDetail = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const today = new Date();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [editRequests, setEditRequests] = useState<AttendanceEditRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceEditRequest | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  
  // Attendance filter states
  const [attendanceView, setAttendanceView] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [downloadDateRange, setDownloadDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  
  // Edit dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    employeeId: '',
    dateOfBirth: '',
    joinDate: '',
    address: '',
    status: 'active' as 'active' | 'inactive' | 'on-leave',
  });

  // Fetch employee details from API
  useEffect(() => {
    const fetchEmployee = async () => {
      if (!employeeId) return;
      
      try {
        setLoading(true);
        // Use adminAPI if user is admin, otherwise use hrAPI
        const response = isAdmin 
          ? await adminAPI.getEmployeeDetail(employeeId)
          : await hrAPI.getEmployeeDetail(employeeId);
        
        // Handle different response structures
        const employeeData = response.data.user || response.data.data;
        setEmployee(employeeData);
      } catch (error: any) {
        console.error('Failed to fetch employee:', error);
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to load employee details',
          variant: 'destructive',
        });
        navigate(isAdmin ? '/admin/employees' : '/hr/employees');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId, navigate, toast, isAdmin]);

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'File size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle update employee
  const handleUpdateEmployee = async () => {
    if (!employee) return;

    try {
      if (!formData.name || !formData.email || !formData.phone || !formData.employeeId) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      setEditLoading(true);

      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('employeeId', formData.employeeId);
      if (formData.department) submitData.append('department', formData.department);
      if (formData.position) submitData.append('position', formData.position);
      if (formData.dateOfBirth) submitData.append('dateOfBirth', formData.dateOfBirth);
      if (formData.joinDate) submitData.append('joinDate', formData.joinDate);
      if (formData.address) submitData.append('address', formData.address);
      submitData.append('status', formData.status);
      if (photoFile) submitData.append('profilePhoto', photoFile);

      // Use adminAPI if user is admin
      if (isAdmin) {
        await adminAPI.updateEmployee(employee._id, submitData);
      } else {
        await hrAPI.updateEmployee(employee._id, submitData);
      }
      
      toast({
        title: 'Success',
        description: 'Employee profile updated successfully',
      });

      setIsEditDialogOpen(false);
      
      // Refresh employee data
      const response = isAdmin 
        ? await adminAPI.getEmployeeDetail(employeeId!)
        : await hrAPI.getEmployeeDetail(employeeId!);
      const employeeData = response.data.user || response.data.data;
      setEmployee(employeeData);
    } catch (error: any) {
      console.error('Failed to update employee:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update employee',
        variant: 'destructive',
      });
    } finally {
      setEditLoading(false);
    }
  };
  
  // Get employee attendance for selected month (keeping mock for now as attendance API might be different)
  const allAttendance = employee ? generateAttendanceData(selectedYear, selectedMonth, employeeId || '') : [];
  
  // Filter attendance based on view
  const getFilteredAttendance = () => {
    if (attendanceView === 'weekly') {
      // Get last 7 days from today
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return allAttendance.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= weekAgo && recordDate <= today;
      });
    }
    return allAttendance; // Monthly view shows all
  };
  
  const employeeAttendance = getFilteredAttendance();
  
  // Get pending edit requests for this employee
  const pendingRequests = editRequests.filter(
    req => req.employeeId === employeeId && req.status === 'pending'
  );
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  
  const handleDownloadReport = () => {
    // Generate CSV or trigger download
    const csvContent = generateAttendanceCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${employee?.name}_Attendance_${downloadDateRange.startDate}_to_${downloadDateRange.endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    setIsDownloadDialogOpen(false);
  };
  
  const generateAttendanceCSV = () => {
    let csv = 'Date,Status,Punch In,Punch Out,Duration,Remarks\n';
    
    const filteredData = downloadDateRange.startDate && downloadDateRange.endDate
      ? allAttendance.filter(record => {
          const recordDate = new Date(record.date);
          const start = new Date(downloadDateRange.startDate);
          const end = new Date(downloadDateRange.endDate);
          return recordDate >= start && recordDate <= end;
        })
      : allAttendance;
    
    filteredData.forEach(record => {
      csv += `${record.date},${record.status},${record.punchIn || '-'},${record.punchOut || '-'},${record.duration || '-'},${record.remarks || '-'}\n`;
    });
    
    return csv;
  };

  const handleApproveRequest = (requestId: string) => {
    setEditRequests(editRequests.map(req => 
      req.id === requestId ? { ...req, status: 'approved' as const } : req
    ));
    setSelectedRequest(null);
    setIsRequestDialogOpen(false);
  };

  const handleRejectRequest = (requestId: string) => {
    setEditRequests(editRequests.map(req => 
      req.id === requestId ? { ...req, status: 'rejected' as const } : req
    ));
    setSelectedRequest(null);
    setIsRequestDialogOpen(false);
  };

  const openRequestDialog = (request: AttendanceEditRequest) => {
    setSelectedRequest(request);
    setIsRequestDialogOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="glass-card">
            <CardContent className="p-12">
              <div className="text-center">
                <Loader2 className="h-16 w-16 mx-auto mb-4 text-primary animate-spin" />
                <h2 className="text-2xl font-bold mb-2">Loading Employee Details...</h2>
                <p className="text-muted-foreground">
                  Please wait while we fetch the employee information.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="glass-card">
            <CardContent className="p-12">
              <div className="text-center">
                <UserCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">Employee Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The employee you're looking for doesn't exist.
                </p>
                <Button onClick={() => navigate(-1)} className="glow-button">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-secondary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Employees
            </Button>
            <Separator orientation="vertical" className="h-8" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Employee Profile
            </h1>
          </div>
          <Button className="glow-button" onClick={() => {
            if (employee) {
              setFormData({
                name: employee.name || '',
                email: employee.email || '',
                phone: employee.phone || '',
                department: employee.department || '',
                position: employee.position || '',
                employeeId: employee.employeeId || '',
                dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
                joinDate: employee.joinDate ? new Date(employee.joinDate).toISOString().split('T')[0] : '',
                address: employee.address || '',
                status: employee.status || 'active',
              });
              const photoUrl = typeof employee.profilePhoto === 'string' ? employee.profilePhoto : employee.profilePhoto?.url;
              setPhotoPreview(photoUrl || '');
              setPhotoFile(null);
              setIsEditDialogOpen(true);
            }
          }}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <Avatar className="h-32 w-32 mb-4 ring-4 ring-primary/20">
                    <AvatarImage 
                      src={typeof employee.profilePhoto === 'string' ? employee.profilePhoto : employee.profilePhoto?.url} 
                      alt={employee.name} 
                    />
                    <AvatarFallback className="text-3xl bg-primary/20 text-primary">
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-bold mb-1">{employee.name}</h2>
                  <p className="text-muted-foreground mb-3">{employee.position}</p>
                  <Badge className={employee.status === 'active' ? 'status-approved' : 'status-rejected'}>
                    {employee.status}
                  </Badge>
                  <Separator className="my-4 w-full" />
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{employee.department}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">ID: {employee.employeeId}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSection === 'overview'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'hover:bg-secondary/50'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span className="font-medium">Overview</span>
                  </button>
                  <button
                    onClick={() => setActiveSection('attendance')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSection === 'attendance'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'hover:bg-secondary/50'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Attendance</span>
                    {pendingRequests.length > 0 && (
                      <Badge className="ml-auto bg-warning text-warning-foreground">
                        {pendingRequests.length}
                      </Badge>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveSection('tasks')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSection === 'tasks'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'hover:bg-secondary/50'
                    }`}
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span className="font-medium">Tasks</span>
                  </button>
                  <button
                    onClick={() => setActiveSection('chat')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSection === 'chat'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'hover:bg-secondary/50'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium">Chat</span>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeSection === 'overview' && (
              <>
                {/* Personal Information */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl">Personal Information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>Email</span>
                        </div>
                        <p className="font-medium">{employee.email}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>Phone</span>
                        </div>
                        <p className="font-medium">{employee.phone}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Date of Birth</span>
                        </div>
                        <p className="font-medium">
                          {new Date(employee.dateOfBirth).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>Address</span>
                        </div>
                        <p className="font-medium">{employee.address}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Employment Information */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl">Employment Information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Employee ID</p>
                        <p className="font-medium">{employee.employeeId}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="font-medium">{employee.department}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Position</p>
                        <p className="font-medium">{employee.position}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Joined Date</p>
                        <p className="font-medium">
                          {employee.joinDate && new Date(employee.joinDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge className={employee.status === 'active' ? 'status-approved' : 'status-rejected'}>
                          {employee.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Login Credentials */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Key className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl">Login Credentials</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{employee.email}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Employee ID (Username)</p>
                        <p className="font-medium font-mono bg-secondary px-3 py-2 rounded-lg inline-block">
                          {employee.employeeId}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Note</p>
                        <p className="text-sm text-muted-foreground">
                          Employee can login using their Employee ID and the password set during creation.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === 'attendance' && (
              <>
                {/* Pending Edit Requests */}
                {pendingRequests.length > 0 && (
                  <Card className="glass-card border-warning/30">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-warning/10">
                          <AlertTriangle className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Pending Edit Requests</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {pendingRequests.length} attendance edit request{pendingRequests.length > 1 ? 's' : ''} awaiting your review
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pendingRequests.map((request) => (
                        <div key={request.id} className="border border-border rounded-lg p-4 bg-secondary/20">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="font-semibold">
                                  {new Date(request.date).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                                <Badge className="status-pending">Pending</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Requested on {new Date(request.requestedAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRequestDialog(request)}
                            >
                              <FileEdit className="h-3 w-3 mr-1" />
                              Review
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Original Times</p>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">Punch In:</span>
                                  <span className="font-medium line-through text-destructive">
                                    {request.originalPunchIn || 'Not recorded'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">Punch Out:</span>
                                  <span className="font-medium line-through text-destructive">
                                    {request.originalPunchOut || 'Not recorded'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Requested Times</p>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">Punch In:</span>
                                  <span className="font-medium text-success">{request.requestedPunchIn}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">Punch Out:</span>
                                  <span className="font-medium text-success">{request.requestedPunchOut}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-secondary/50 rounded-lg p-3">
                            <p className="text-xs font-semibold mb-1">Reason:</p>
                            <p className="text-sm text-muted-foreground">{request.reason}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Attendance Records */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Attendance Records</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            View and download employee attendance history
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg">
                          <Button
                            size="sm"
                            variant={attendanceView === 'weekly' ? 'default' : 'ghost'}
                            onClick={() => setAttendanceView('weekly')}
                            className="h-8"
                          >
                            <Filter className="h-3 w-3 mr-1" />
                            Weekly
                          </Button>
                          <Button
                            size="sm"
                            variant={attendanceView === 'monthly' ? 'default' : 'ghost'}
                            onClick={() => setAttendanceView('monthly')}
                            className="h-8"
                          >
                            <Filter className="h-3 w-3 mr-1" />
                            Monthly
                          </Button>
                        </div>
                        
                        {/* Month/Year Selector - Only show in monthly view */}
                        {attendanceView === 'monthly' && (
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Select 
                              value={selectedMonth.toString()} 
                              onValueChange={(val) => setSelectedMonth(parseInt(val))}
                            >
                              <SelectTrigger className="w-[120px] bg-secondary border-border h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {months.map((month, idx) => (
                                  <SelectItem key={idx} value={idx.toString()}>
                                    {month}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select 
                              value={selectedYear.toString()} 
                              onValueChange={(val) => setSelectedYear(parseInt(val))}
                            >
                              <SelectTrigger className="w-[90px] bg-secondary border-border h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[2024, 2025, 2026, 2027].map((year) => (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={handleNextMonth}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        
                        {/* Download Report Button */}
                        <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="glow-button h-8">
                              <Download className="h-3 w-3 mr-1" />
                              Download Report
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="glass-card max-w-md">
                            <DialogHeader>
                              <DialogTitle>Download Attendance Report</DialogTitle>
                              <DialogDescription>
                                Select date range to export {employee?.name}'s attendance records
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                  id="startDate"
                                  type="date"
                                  className="bg-secondary border-border"
                                  value={downloadDateRange.startDate}
                                  onChange={(e) => setDownloadDateRange({ ...downloadDateRange, startDate: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                  id="endDate"
                                  type="date"
                                  className="bg-secondary border-border"
                                  value={downloadDateRange.endDate}
                                  onChange={(e) => setDownloadDateRange({ ...downloadDateRange, endDate: e.target.value })}
                                />
                              </div>
                              <div className="bg-muted/30 p-3 rounded-lg">
                                <p className="text-xs text-muted-foreground">
                                  <strong>Note:</strong> Leave dates empty to download all records from the selected month
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end gap-3">
                              <Button variant="outline" onClick={() => setIsDownloadDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button
                                className="glow-button"
                                onClick={handleDownloadReport}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download CSV
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing <span className="font-semibold text-foreground">{employeeAttendance.length}</span> records
                        {attendanceView === 'weekly' && ' (Last 7 days)'}
                        {attendanceView === 'monthly' && ` (${months[selectedMonth]} ${selectedYear})`}
                      </div>
                      {employeeAttendance.length > 0 && (
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-success"></div>
                            <span className="text-muted-foreground">Present: {employeeAttendance.filter(r => r.status === 'present').length}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-warning"></div>
                            <span className="text-muted-foreground">Late: {employeeAttendance.filter(r => r.status === 'late').length}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-destructive"></div>
                            <span className="text-muted-foreground">Absent: {employeeAttendance.filter(r => r.status === 'absent').length}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {employeeAttendance.length > 0 ? (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-secondary/50 border-b border-border">
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Date</th>
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Day</th>
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Status</th>
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Punch In</th>
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Punch Out</th>
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Duration</th>
                                <th className="text-left p-4 text-sm font-semibold text-foreground">Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...employeeAttendance].reverse().map((record) => {
                                const recordDate = new Date(record.date);
                                const dayName = recordDate.toLocaleDateString('en-US', { weekday: 'short' });
                                
                                return (
                                  <tr key={record.date} className="border-b border-border hover:bg-secondary/30 transition-colors">
                                    <td className="p-4 text-sm text-muted-foreground">
                                      {recordDate.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </td>
                                    <td className="p-4 text-sm text-muted-foreground font-medium">
                                      {dayName}
                                    </td>
                                    <td className="p-4">
                                      <Badge className={
                                        record.status === 'present' ? 'status-approved' :
                                        record.status === 'late' ? 'status-pending' :
                                        record.status === 'absent' ? 'status-rejected' :
                                        'status-in-progress'
                                      }>
                                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                      </Badge>
                                    </td>
                                    <td className="p-4 text-sm">
                                      <span className="text-foreground font-medium">{record.punchIn || '-'}</span>
                                    </td>
                                    <td className="p-4 text-sm">
                                      <span className="text-foreground font-medium">{record.punchOut || '-'}</span>
                                    </td>
                                    <td className="p-4 text-sm text-foreground font-medium">
                                      {record.duration || '-'}
                                    </td>
                                    <td className="p-4 text-sm text-muted-foreground">
                                      {record.remarks || '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-semibold mb-2">No Attendance Records</h3>
                        <p className="text-muted-foreground">
                          No attendance records found for the selected period.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === 'tasks' && (
              <div className="space-y-4">
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-warning">Employee Task Monitoring</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        You are viewing {employee.name}'s task dashboard for monitoring and oversight purposes.
                      </p>
                    </div>
                  </div>
                </div>
                <EmployeeTasksContent employeeId={employeeId} employeeName={employee.name} />
              </div>
            )}

            {activeSection === 'chat' && (
              <div className="space-y-4">
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-warning">Employee Chat Monitoring</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        You are viewing {employee.name}'s chat conversations for monitoring and oversight purposes.
                      </p>
                    </div>
                  </div>
                </div>
                <EmployeeChatContent employeeId={employeeId} employeeName={employee.name} />
              </div>
            )}
          </div>
        </div>

        {/* Edit Request Review Dialog */}
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogContent className="glass-card max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Attendance Edit Request</DialogTitle>
              <DialogDescription>
                {selectedRequest && `Request from ${selectedRequest.employeeName} for ${new Date(selectedRequest.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}`}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                      <h4 className="font-semibold mb-3 text-sm text-destructive">Original Times</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Punch In</p>
                          <p className="font-medium text-destructive line-through">
                            {selectedRequest.originalPunchIn || 'Not recorded'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Punch Out</p>
                          <p className="font-medium text-destructive line-through">
                            {selectedRequest.originalPunchOut || 'Not recorded'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                      <h4 className="font-semibold mb-3 text-sm text-success">Requested Times</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Punch In</p>
                          <p className="font-medium text-success">{selectedRequest.requestedPunchIn}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Punch Out</p>
                          <p className="font-medium text-success">{selectedRequest.requestedPunchOut}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-sm">Reason for Edit Request:</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Requested on {new Date(selectedRequest.requestedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRequestDialogOpen(false);
                  setSelectedRequest(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedRequest && handleRejectRequest(selectedRequest.id)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                className="glow-button bg-success hover:bg-success/90"
                onClick={() => selectedRequest && handleApproveRequest(selectedRequest.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Employee Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>Update employee details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Profile Photo Upload */}
              <div className="space-y-2">
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    {photoPreview ? (
                      <AvatarImage src={photoPreview} alt="Preview" />
                    ) : (
                      <AvatarFallback className="bg-primary/20 text-primary">
                        <UserCircle className="h-10 w-10" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <input
                      type="file"
                      id="photo-upload-edit"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handlePhotoChange}
                    />
                    <label
                      htmlFor="photo-upload-edit"
                      className="block border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer bg-secondary/30"
                    >
                      <Upload className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground">Click to upload or change photo</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                    </label>
                  </div>
                </div>
              </div>

              {/* Name and Employee ID */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input 
                    placeholder="John Doe" 
                    className="bg-secondary border-border"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employee ID *</Label>
                  <Input 
                    placeholder="EMP-001" 
                    className="bg-secondary border-border"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  />
                </div>
              </div>

              {/* Email and Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input 
                    type="email"
                    placeholder="employee@example.com" 
                    className="bg-secondary border-border"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input 
                    type="tel"
                    placeholder="+1 234 567 8900" 
                    className="bg-secondary border-border"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    className="bg-secondary border-border pl-10"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea 
                  placeholder="Full address" 
                  className="bg-secondary border-border resize-none"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              {/* Department and Position */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input 
                    placeholder="Engineering" 
                    className="bg-secondary border-border"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input 
                    placeholder="Software Developer" 
                    className="bg-secondary border-border"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>

              {/* Join Date and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Join Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="date" 
                      className="bg-secondary border-border pl-10"
                      value={formData.joinDate}
                      onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'on-leave') => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-leave">On Leave</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button className="flex-1 glow-button" onClick={handleUpdateEmployee} disabled={editLoading}>
                  {editLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Employee'
                  )}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeDetail;
