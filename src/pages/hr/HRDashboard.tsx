import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  UserCircle,
  Clock,
  CalendarCheck,
  ClipboardList,
  Receipt,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock3,
  Loader2,
  FileText,
  ExternalLink,
  Phone,
  Mail,
  Building2,
  Users,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { hrAPI, leaveAPI, expenseAPI, attendanceAPI, employeeAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const HRDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [hrProfileData, setHrProfileData] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>({ attendance: [], absent: [], stats: {} });
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [expenseRejectDialogOpen, setExpenseRejectDialogOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [expenseRejectReason, setExpenseRejectReason] = useState('');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardRes, leavesRes, expensesRes, attendanceRes] = await Promise.all([
        hrAPI.getDashboard(),
        hrAPI.getPendingLeaves(),
        hrAPI.getPendingExpenses(),
        hrAPI.getTodayAttendance(),
      ]);
      setDashboardData(dashboardRes.data.data);

      // Fetch full HR profile so phone/email/photo/position are available
      try {
        const profileRes = await hrAPI.getProfile();
        setHrProfileData(profileRes.data?.user || dashboardRes.data.data?.user || null);
      } catch {
        setHrProfileData(dashboardRes.data.data?.user || null);
      }

      // Load only HR user's own leaves for this section
      let myLeaves: any[] = [];
      try {
        const myRes = await employeeAPI.getMyLeaves();
        myLeaves = Array.isArray(myRes.data?.data) ? myRes.data.data : [];
      } catch (e) {
        myLeaves = [];
      }
      setPendingLeaves(myLeaves);
      setPendingExpenses(Array.isArray(expensesRes.data.data) ? expensesRes.data.data : []);
      // Handle nested attendance data structure
      const attendanceData = attendanceRes.data.data;
      if (attendanceData && attendanceData.attendance) {
        setTodayAttendance(attendanceData);
      } else if (Array.isArray(attendanceData)) {
        setTodayAttendance({ attendance: attendanceData, absent: [], stats: {} });
      } else {
        setTodayAttendance({ attendance: [], absent: [], stats: {} });
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard:', error);
      // Set empty arrays on error
      setPendingLeaves([]);
      setPendingExpenses([]);
      setTodayAttendance({ attendance: [], absent: [], stats: {} });
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

  const handleApproveLeave = async (leaveId: string) => {
    try {
      setActionLoading(true);
      await leaveAPI.approveLeave(leaveId);
      toast({
        title: 'Success',
        description: 'Leave request approved successfully',
      });
      // Refresh the leave list
      fetchDashboard();
    } catch (error: any) {
      console.error('Failed to approve leave:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve leave request',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectLeave = async () => {
    if (!selectedLeaveId) return;
    
    try {
      setActionLoading(true);
      await leaveAPI.rejectLeave(selectedLeaveId, rejectReason);
      toast({
        title: 'Success',
        description: 'Leave request rejected',
      });
      setRejectDialogOpen(false);
      setSelectedLeaveId(null);
      setRejectReason('');
      // Refresh the leave list
      fetchDashboard();
    } catch (error: any) {
      console.error('Failed to reject leave:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject leave request',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectDialog = (leaveId: string) => {
    setSelectedLeaveId(leaveId);
    setRejectDialogOpen(true);
  };

  const handleApproveExpense = async (expenseId: string) => {
    console.log('Approving expense:', expenseId);
    try {
      setActionLoading(true);
      await expenseAPI.approveExpense(expenseId);
      toast({
        title: 'Success',
        description: 'Expense approved successfully',
      });
      fetchDashboard();
    } catch (error: any) {
      console.error('Approve expense error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve expense',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectExpense = async () => {
    console.log('Rejecting expense:', selectedExpenseId, 'Reason:', expenseRejectReason);
    if (!selectedExpenseId || !expenseRejectReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      await expenseAPI.rejectExpense(selectedExpenseId, expenseRejectReason);
      toast({
        title: 'Success',
        description: 'Expense rejected successfully',
      });
      setExpenseRejectDialogOpen(false);
      setExpenseRejectReason('');
      setSelectedExpenseId(null);
      fetchDashboard();
    } catch (error: any) {
      console.error('Reject expense error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject expense',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
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
        {/* ── Greeting Card ────────────────────────────────────────────────────── */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Good Morning, {hrProfileData?.name || 'HR Manager'}!
                </h2>
                <p className="text-muted-foreground">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {/* You have {pendingLeaves.length} pending leave requests and {pendingExpenses.length} expense claims to review. */}
                </p>
              </div>
              <div className="flex gap-3">
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
                      navigate('/hr/my-attendance');
                    } catch (err: any) {
                      // If there's no record for today (404), allow navigation to check in page
                      if (err.response?.status === 404) {
                        navigate('/hr/my-attendance');
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
                  className="glow-button h-20 w-40 text-lg font-semibold"
                >
                  <Clock className="h-5 w-5 mr-2" />
                  Check In
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Row 1: HR Profile | Attendance Stats | Pending Approvals ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* HR Profile Card */}
          <Card className="glass-card min-h-[260px]">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  {hrProfileData?.profilePhoto?.url ? (
                    <img src={hrProfileData.profilePhoto.url} alt="HR avatar" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <UserCircle className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate text-2xl">{hrProfileData?.name || 'HR Manager'}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {hrProfileData?.position || 'HR Manager'} • {hrProfileData?.department || 'HR'}
                  </p>
                  <Badge variant="outline" className="text-sm mt-0.5 status-approved capitalize">
                    {hrProfileData?.status || 'active'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3 text-lg">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0 text-primary/70" />
                  <span className="truncate">{hrProfileData?.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0 text-primary/70" />
                  <span className="truncate">{hrProfileData?.email || '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HR Stats */}
          <Card className="glass-card min-h-[260px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                HR Overview
              </CardTitle>
              <CardDescription>Organization snapshot</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                  <span className="text-sm font-medium">Total Employees</span>
                  <span className="text-2xl font-bold text-primary">{dashboardData?.stats?.totalEmployees || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                  <span className="text-sm font-medium">Present Today</span>
                  <span className="text-2xl font-bold text-success">{todayAttendance?.stats?.present || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                  <span className="text-sm font-medium">On Leave</span>
                  <span className="text-2xl font-bold text-warning">{todayAttendance?.stats?.onLeave || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                  <span className="text-sm font-medium">Absent</span>
                  <span className="text-2xl font-bold text-destructive">{todayAttendance?.stats?.absent || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card className="glass-card min-h-[260px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Pending Approvals
              </CardTitle>
              <CardDescription>Items awaiting review</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="space-y-4">
                <div className="p-3 rounded bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Leave Requests</span>
                    <Badge className="bg-warning text-black">{pendingLeaves.length}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 w-full text-xs"
                    onClick={() => navigate('/hr/leaves')}
                  >
                    View All
                  </Button>
                </div>
                <div className="p-3 rounded bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Expense Claims</span>
                    <Badge className="bg-warning text-black">{pendingExpenses.length}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 w-full text-xs"
                    onClick={() => navigate('/hr/expenses')}
                  >
                    View All
                  </Button>
                </div>
                <div className="p-3 rounded bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Tasks</span>
                    <Badge className="bg-primary">{dashboardData?.stats?.activeTasks || 0}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 w-full text-xs"
                    onClick={() => navigate('/hr/tasks')}
                  >
                    View All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Row 2: 4 Stat Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Employees on Leave"
            value={todayAttendance?.stats?.onLeave || 0}
            icon={CalendarCheck}
            className="stagger-1"
          />
          <StatsCard
            title="Pending Approvals"
            value={(pendingLeaves.length || 0) + (pendingExpenses.length || 0)}
            icon={ClipboardList}
            className="stagger-2"
          />
          <StatsCard
            title="Active Tasks"
            value={dashboardData?.stats?.activeTasks || 0}
            icon={TrendingUp}
            className="stagger-3"
          />
          <StatsCard
            title="Total Departments"
            value={dashboardData?.stats?.totalDepartments || 0}
            icon={Building2}
            className="stagger-4"
          />
        </div>

        {/* ── Row 3: Pending Leaves & Expenses (2-column) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                My Leave Requests
              </CardTitle>
              <CardDescription>Your leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingLeaves.map((leave) => {
                  const employeeName = leave.user?.name || leave.employee?.name || leave.name || 'Unknown Employee';
                  const leaveType = leave.leaveType || leave.type || 'Leave';
                  const startDate = leave.startDate || leave.from || '';
                  const endDate = leave.endDate || leave.to || '';
                  return (
                  <div
                    key={leave._id || leave.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {employeeName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {leaveType} • {leave.days} day{leave.days > 1 ? 's' : ''} • {startDate} - {endDate}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {/* Approve/reject are not shown for HR's own leaves */}
                      {leave.user?._id !== hrProfileData?._id && leave.user && (
                        <>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-success hover:text-success hover:bg-success/10"
                            onClick={() => handleApproveLeave(leave._id)}
                            disabled={actionLoading}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openRejectDialog(leave._id)}
                            disabled={actionLoading}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pending Expenses */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Pending Expenses
              </CardTitle>
              <CardDescription>Expense claims for review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingExpenses.map((expense) => {
                  const employeeName = expense.user?.name || expense.employee?.name || expense.name || 'Unknown Employee';
                  
                  return (
                  <div
                    key={expense._id || expense.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {employeeName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">₹{expense.amount}</p>
                      <p className="text-xs text-muted-foreground">
                        {employeeName} • {expense.description}
                      </p>
                      {expense.receipt?.url && (
                        <Button
                          size="sm"
                          variant="link"
                          className="text-xs p-0 h-auto text-primary hover:text-primary/80 mt-1"
                          onClick={() => {
                            setSelectedReceipt(expense.receipt.url);
                            setReceiptDialogOpen(true);
                          }}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          View Bill Photo
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-success hover:text-success hover:bg-success/10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Approve button clicked for expense:', expense._id || expense.id);
                          handleApproveExpense(expense._id || expense.id);
                        }}
                        disabled={actionLoading}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Reject button clicked for expense:', expense._id || expense.id);
                          setSelectedExpenseId(expense._id || expense.id);
                          setExpenseRejectDialogOpen(true);
                        }}
                        disabled={actionLoading}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Attendance removed per request */}
      </div>

      {/* Reject Leave Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Input
                id="reason"
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason('');
                setSelectedLeaveId(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectLeave}
              disabled={actionLoading || !rejectReason.trim()}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Leave'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Reject Dialog */}
      <Dialog open={expenseRejectDialogOpen} onOpenChange={setExpenseRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this expense claim.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expense-reason">Rejection Reason</Label>
              <Input
                id="expense-reason"
                placeholder="Enter reason for rejection..."
                value={expenseRejectReason}
                onChange={(e) => setExpenseRejectReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setExpenseRejectDialogOpen(false);
                setExpenseRejectReason('');
                setSelectedExpenseId(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectExpense}
              disabled={actionLoading || !expenseRejectReason.trim()}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Expense'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt/Bill Photo Viewing Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bill Photo / Receipt</DialogTitle>
            <DialogDescription>
              Uploaded receipt for expense claim
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReceipt && (
              <div className="relative w-full">
                <img
                  src={selectedReceipt}
                  alt="Receipt"
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg border border-border"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => window.open(selectedReceipt, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setReceiptDialogOpen(false);
                setSelectedReceipt(null);
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default HRDashboard;
