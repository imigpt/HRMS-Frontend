import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  CalendarCheck,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/useApi';
import { leaveAPI, leaveBalanceAPI, employeeAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface LeaveRequest {
  _id: string;
  user?: { 
    name: string;
    employeeId?: string;
    department?: string;
    position?: string;
  };
  employee?: { name: string };
  employeeName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface LeaveBalance {
  leaveType: string;
  total: number;
  used: number;
  remaining: number;
}

interface LeaveModuleProps {
  role: 'admin' | 'hr' | 'employee';
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge className="status-approved">Approved</Badge>;
    case 'pending':
      return <Badge className="status-pending">Pending</Badge>;
    case 'rejected':
      return <Badge className="status-rejected">Rejected</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const LeaveModule = ({ role }: LeaveModuleProps) => {
  const [filter, setFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance[]>([]);
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const { loading, execute } = useApi();
  const { toast } = useToast();

  useEffect(() => {
    fetchLeaves();
    if (role === 'employee' || role === 'hr') {
      fetchLeaveBalance();
    }
  }, [role]);

  const fetchLeaves = async () => {
    try {
      let result: any;
      // For HR role, show only HR user's own leaves
      if (role === 'hr') {
        result = await execute(() => employeeAPI.getMyLeaves());
        const data = result?.data?.data ?? result?.data ?? [];
        setLeaveRequests(Array.isArray(data) ? data : []);
      } else {
        // Admin and employee see the standard leaves endpoint
        result = await execute(() => leaveAPI.getLeaves());
        const data = result?.data ?? result;
        setLeaveRequests(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch leave requests',
        variant: 'destructive',
      });
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const result = await execute(() => leaveBalanceAPI.getMyBalance());
      if (result?.data) {
        const d = result.data;
        const balanceArray = [
          { leaveType: 'Paid', total: d.paid || 0, used: d.usedPaid || 0, remaining: (d.paid || 0) - (d.usedPaid || 0) },
          { leaveType: 'Sick', total: d.sick || 0, used: d.usedSick || 0, remaining: (d.sick || 0) - (d.usedSick || 0) },
          { leaveType: 'Unpaid', total: d.unpaid || 0, used: d.usedUnpaid || 0, remaining: (d.unpaid || 0) - (d.usedUnpaid || 0) },
        ];
        setLeaveBalance(balanceArray);
      }
    } catch (error: any) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const handleCreateLeave = async () => {
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }
    try {
      await execute(() => leaveAPI.createLeave(formData));
      toast({
        title: 'Success',
        description: 'Leave request submitted successfully',
      });
      setIsDialogOpen(false);
      setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
      if (role === 'employee' || role === 'hr') fetchLeaveBalance();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create leave request',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(true);
      await execute(() => leaveAPI.approveLeave(id));
      toast({
        title: 'Success',
        description: 'Leave request approved successfully',
      });
      fetchLeaves();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve leave',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedLeaveId || !rejectReason.trim()) return;
    
    try {
      setActionLoading(true);
      await execute(() => leaveAPI.rejectLeave(selectedLeaveId, rejectReason));
      toast({
        title: 'Success',
        description: 'Leave request rejected',
      });
      setRejectDialogOpen(false);
      setSelectedLeaveId(null);
      setRejectReason('');
      fetchLeaves();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject leave',
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

  const filteredRequests = leaveRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const canApprove = role === 'admin';
  const canApply = role === 'employee' || role === 'hr';

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Leave Balance Cards (for employees & HR) */}
        {(role === 'employee' || role === 'hr') && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {leaveBalance.map((leave) => (
              <Card key={leave.leaveType} className="glass-card card-hover">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">{leave.leaveType}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-primary">{leave.remaining}</p>
                      <p className="text-xs text-muted-foreground">remaining</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{leave.used}/{leave.total}</p>
                      <p className="text-xs text-muted-foreground">used</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats for HR/Admin */}
        {canApprove && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass-card card-hover">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {leaveRequests.filter(r => r.status === 'pending').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card card-hover">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {leaveRequests.filter(r => r.status === 'approved').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Approved</p>
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
                    <p className="text-2xl font-bold text-foreground">
                      {leaveRequests.filter(r => r.status === 'rejected').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leave Requests */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  Leave Requests
                </CardTitle>
                <CardDescription>
                  {canApprove ? 'Manage and approve leave requests' : 'Your leave request history'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[130px] bg-secondary border-border">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                {canApply && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="glow-button">
                        <Plus className="h-4 w-4 mr-2" />
                        Apply Leave
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card">
                      <DialogHeader>
                        <DialogTitle>Apply for Leave</DialogTitle>
                        <DialogDescription>Fill in the details for your leave request</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Leave Type</Label>
                          <Select value={formData.leaveType} onValueChange={(value) => setFormData({ ...formData, leaveType: value })}>
                            <SelectTrigger className="bg-secondary border-border">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid Leave</SelectItem>
                              <SelectItem value="sick">Sick Leave</SelectItem>
                              <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>From Date</Label>
                            <Input 
                              type="date" 
                              className="bg-secondary border-border" 
                              value={formData.startDate}
                              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>To Date</Label>
                            <Input 
                              type="date" 
                              className="bg-secondary border-border"
                              value={formData.endDate}
                              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Reason</Label>
                          <Textarea 
                            placeholder="Enter reason for leave" 
                            className="bg-secondary border-border"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          />
                        </div>
                        <Button className="w-full glow-button" onClick={handleCreateLeave} disabled={loading}>
                          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Request'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const employeeName = request.user?.name || request.employee?.name || request.employeeName || 'Unknown Employee';
                return (
                <div
                  key={request._id}
                  className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {employeeName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{employeeName}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.leaveType} • {new Date(request.endDate).getDate() - new Date(request.startDate).getDate() + 1} day(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {request.from} - {request.to}
                        </p>
                        <p className="text-xs text-muted-foreground">Applied: {request.appliedOn}</p>
                      </div>
                      {getStatusBadge(request.status)}
                      {canApprove && request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-success hover:text-success hover:bg-success/10"
                            onClick={() => handleApprove(request._id)}
                            disabled={actionLoading}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openRejectDialog(request._id)}
                            disabled={actionLoading}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 pl-14">
                    Reason: {request.reason}
                  </p>
                </div>
              );
              })}
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
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
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
              onClick={handleReject}
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
    </DashboardLayout>
  );
};

export default LeaveModule;
