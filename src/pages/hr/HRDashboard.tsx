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
} from 'lucide-react';
import { hrAPI, leaveAPI, expenseAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const HRDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
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
      setPendingLeaves(Array.isArray(leavesRes.data.data) ? leavesRes.data.data : []);
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Employees"
            value={dashboardData?.stats?.totalEmployees || 0}
            icon={UserCircle}
            className="stagger-1"
          />
          <StatsCard
            title="Present Today"
            value={dashboardData?.stats?.presentToday || 0}
            icon={Clock}
            suffix={`/${dashboardData?.stats?.totalEmployees || 0}`}
            className="stagger-2"
          />
          <StatsCard
            title="Pending Leaves"
            value={dashboardData?.stats?.pendingLeaves || 0}
            icon={CalendarCheck}
            className="stagger-3"
          />
          <StatsCard
            title="Active Tasks"
            value={dashboardData?.stats?.activeTasks || 0}
            icon={ClipboardList}
            className="stagger-4"
          />
        </div>

        {/* Quick Actions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                className="glow-button"
                onClick={() => navigate('/hr/employees')}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
              <Button 
                variant="secondary"
                onClick={() => navigate('/hr/tasks')}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Create Task
              </Button>
              <Button 
                variant="secondary"
                onClick={() => navigate('/hr/holidays')}
              >
                <CalendarCheck className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
              <Button 
                variant="secondary"
                onClick={() => navigate('/hr/expenses')}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Review Expenses
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Leave Requests */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Pending Leave Requests
              </CardTitle>
              <CardDescription>Requests awaiting your approval</CardDescription>
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
                    </div>
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pending Expenses */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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

        {/* Today's Attendance */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Today's Attendance
            </CardTitle>
            <CardDescription>Real-time attendance status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {todayAttendance?.attendance && todayAttendance.attendance.length > 0 ? (
                todayAttendance.attendance.map((record: any) => {
                  const userName = record.user?.name || 'Unknown';
                  const checkInTime = record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                  const checkOutTime = record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                  
                  return (
                  <div
                    key={record._id}
                    className="p-4 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {userName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{userName}</p>
                        <Badge
                          variant="outline"
                          className={
                            record.status === 'present' ? 'status-approved' :
                            record.status === 'late' ? 'status-pending' : 'status-rejected'
                          }
                        >
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>In: {checkInTime}</span>
                      <span>Out: {checkOutTime}</span>
                    </div>
                  </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No attendance records for today
                </div>
              )}
            </div>

            {/* Attendance Summary */}
            <div className="mt-6 p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-success">{todayAttendance?.stats?.present || 0}</p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{todayAttendance?.stats?.late || 0}</p>
                  <p className="text-xs text-muted-foreground">Late</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{todayAttendance?.stats?.absent || 0}</p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{todayAttendance?.stats?.onLeave || 0}</p>
                  <p className="text-xs text-muted-foreground">On Leave</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
