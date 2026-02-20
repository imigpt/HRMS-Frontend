import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarCheck, Check, X, Building2, UserCircle, Filter, Loader2, Edit2, Trash2 } from 'lucide-react';
import { adminAPI, leaveAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LeaveRequest {
  _id: string;
  user?: {
    name: string;
    employeeId: string;
    email?: string;
    department?: string;
    company?: { name: string };
  };
  employee?: {
    name: string;
    employeeId: string;
    company?: { name: string };
    department?: string;
  };
  company?: { name: string } | string;
  leaveType: 'paid' | 'sick' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
}

const AdminLeaves = () => {
  const { toast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    status: '',
  });
  const [selectedLeaveForEdit, setSelectedLeaveForEdit] = useState<LeaveRequest | null>(null);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getLeaves();
      setLeaveRequests(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch leaves:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch leave requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(true);
      await leaveAPI.approveLeave(id);
      toast({
        title: 'Success',
        description: 'Leave request approved successfully',
      });
      // Refresh the leave list
      fetchLeaves();
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

  const handleReject = async () => {
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
      fetchLeaves();
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

  const openEditDialog = (request: LeaveRequest) => {
    setSelectedLeaveForEdit(request);
    setEditFormData({
      leaveType: request.leaveType,
      startDate: request.startDate ? new Date(request.startDate).toISOString().split('T')[0] : '',
      endDate: request.endDate ? new Date(request.endDate).toISOString().split('T')[0] : '',
      reason: request.reason,
      status: request.status,
    });
    setEditDialogOpen(true);
  };

  const handleEditLeave = async () => {
    if (!selectedLeaveForEdit) return;
    try {
      setActionLoading(true);
      await leaveAPI.editLeave(selectedLeaveForEdit._id, editFormData);
      toast({ title: 'Success', description: 'Leave request updated successfully' });
      setEditDialogOpen(false);
      setSelectedLeaveForEdit(null);
      fetchLeaves();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update leave', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteDialog = (leaveId: string) => {
    setSelectedLeaveId(leaveId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteLeave = async () => {
    if (!selectedLeaveId) return;
    try {
      setActionLoading(true);
      await leaveAPI.deleteLeave(selectedLeaveId);
      toast({ title: 'Success', description: 'Leave request deleted successfully' });
      setDeleteDialogOpen(false);
      setSelectedLeaveId(null);
      fetchLeaves();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete leave', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = leaveRequests.filter(req => {
    const companyName = req.user?.company?.name || req.company?.name || '';
    const matchesCompany = companyFilter === 'all' || companyName === companyFilter;
    const matchesType = typeFilter === 'all' || req.leaveType === typeFilter;
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesCompany && matchesType && matchesStatus;
  });

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(r => r.status === 'pending').length,
    approved: leaveRequests.filter(r => r.status === 'approved').length,
    rejected: leaveRequests.filter(r => r.status === 'rejected').length,
  };

  const getLeaveTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-blue-500/20 text-blue-400',
      sick: 'bg-red-500/20 text-red-400',
      unpaid: 'bg-gray-500/20 text-gray-400',
    };
    return <Badge className={colors[type] || 'bg-gray-500/20 text-gray-400'}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
  };

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

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leave Management</h1>
          <p className="text-muted-foreground">Manage leave requests from all employees and HR managers</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <Check className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <X className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  <SelectItem value="Aselea Technologies">Aselea Technologies</SelectItem>
                  <SelectItem value="Innovation Corp">Innovation Corp</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="employee">Employees</SelectItem>
                  <SelectItem value="hr">HR Managers</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leave Requests Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>All Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No leave requests found matching the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => {
                    const employeeName = request.user?.name || request.employee?.name || 'Unknown Employee';
                    const employeeId = request.user?.employeeId || request.employee?.employeeId || 'N/A';
                    return (
                  <TableRow key={request._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {employeeName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{employeeName}</p>
                          <p className="text-xs text-muted-foreground">{employeeId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {request.user?.company?.name || request.employee?.company?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{request.user?.department || request.employee?.department || 'N/A'}</TableCell>
                    <TableCell>{getLeaveTypeBadge(request.leaveType)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(request.startDate).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">
                          to {new Date(request.endDate).toLocaleDateString()}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">{request.days} day{request.days > 1 ? 's' : ''}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm line-clamp-2">{request.reason}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-success hover:text-success hover:bg-success/10"
                              onClick={() => handleApprove(request._id)}
                              disabled={actionLoading}
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openRejectDialog(request._id)}
                              disabled={actionLoading}
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => openEditDialog(request)}
                          disabled={actionLoading}
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => openDeleteDialog(request._id)}
                          disabled={actionLoading}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                  })
                )}
              </TableBody>
            </Table>
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

      {/* Edit Leave Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
            <DialogDescription>
              {selectedLeaveForEdit?.user?.name || 'Employee'} — Modify leave details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={editFormData.leaveType} onValueChange={(val) => setEditFormData({ ...editFormData, leaveType: val })}>
                <SelectTrigger>
                  <SelectValue />
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
                  value={editFormData.startDate}
                  onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={editFormData.endDate}
                  onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editFormData.status} onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={editFormData.reason}
                onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditLeave} disabled={actionLoading}>
              {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Leave Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this leave request? This action cannot be undone. The employee will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setSelectedLeaveId(null); }} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLeave} disabled={actionLoading}>
              {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Delete Leave'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminLeaves;
