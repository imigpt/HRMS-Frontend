import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  FileEdit,
  User,
  RefreshCw,
} from 'lucide-react';
import { attendanceAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface EditRequest {
  _id: string;
  attendance: {
    _id: string;
    date: string;
    checkIn?: { time?: string };
    checkOut?: { time?: string };
  };
  employee: {
    _id: string;
    name: string;
    email: string;
    profilePhoto?: string;
    department?: string;
  };
  originalCheckIn?: string;
  originalCheckOut?: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: {
    _id: string;
    name: string;
  };
  reviewNote?: string;
  createdAt: string;
}

const HRAttendanceRequests = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getPendingEditRequests();
      console.log('Edit requests response:', response.data);
      setRequests(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch edit requests:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load edit requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      await attendanceAPI.reviewEditRequest(
        selectedRequest._id, 
        status, 
        reviewNote || undefined
      );

      toast({
        title: 'Success',
        description: `Request ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      });

      setIsDialogOpen(false);
      setSelectedRequest(null);
      setReviewNote('');
      
      // Refresh the list
      await fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to process request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const openReviewDialog = (request: EditRequest) => {
    setSelectedRequest(request);
    setReviewNote('');
    setIsDialogOpen(true);
  };

  const formatTime = (timeValue: string | undefined) => {
    if (!timeValue) return '-';
    return new Date(timeValue).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateValue: string) => {
    return new Date(dateValue).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="status-pending">Pending</Badge>;
      case 'approved':
        return <Badge className="status-approved">Approved</Badge>;
      case 'rejected':
        return <Badge className="status-rejected">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRequests = filter === 'pending' 
    ? requests.filter(r => r.status === 'pending')
    : requests;

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileEdit className="h-8 w-8 text-primary" />
              Attendance Edit Requests
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and manage employee attendance correction requests
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilter('pending')}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Pending ({pendingCount})
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All Requests
            </Button>
            <Button variant="outline" onClick={fetchRequests} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {requests.filter(r => r.status === 'approved').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {requests.filter(r => r.status === 'rejected').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>
              {filter === 'pending' ? 'Pending Requests' : 'All Requests'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-success mb-4" />
                <p className="text-xl font-semibold text-foreground">No pending requests</p>
                <p className="text-muted-foreground">All attendance edit requests have been processed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-secondary/30 rounded-lg p-4 border border-border hover:border-primary/40 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Employee Info */}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.employee?.profilePhoto} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {request.employee?.name?.charAt(0) || 'E'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">
                            {request.employee?.name || 'Unknown Employee'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.employee?.department || request.employee?.email}
                          </p>
                        </div>
                      </div>

                      {/* Date & Status */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">
                            {formatDate(request.attendance?.date || request.createdAt)}
                          </span>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </div>

                    {/* Time Changes */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Original Times</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-foreground">
                            <strong>In:</strong> {formatTime(request.originalCheckIn)}
                          </span>
                          <span className="text-foreground">
                            <strong>Out:</strong> {formatTime(request.originalCheckOut)}
                          </span>
                        </div>
                      </div>
                      <div className="bg-primary/10 p-3 rounded-lg border border-primary/30">
                        <p className="text-xs text-primary mb-1">Requested Changes</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-foreground">
                            <strong>In:</strong> {formatTime(request.requestedCheckIn)}
                          </span>
                          <span className="text-foreground">
                            <strong>Out:</strong> {formatTime(request.requestedCheckOut)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground">
                        <strong>Reason:</strong> {request.reason}
                      </p>
                    </div>

                    {/* Actions */}
                    {request.status === 'pending' && (
                      <div className="mt-4 flex justify-end gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                          onClick={() => openReviewDialog(request)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-white"
                          onClick={() => {
                            setSelectedRequest(request);
                            handleReview('approved');
                          }}
                          disabled={processing}
                        >
                          {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    )}

                    {/* Review info for processed requests */}
                    {request.status !== 'pending' && request.reviewedBy && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        <span>Reviewed by </span>
                        <span className="text-foreground font-medium">{request.reviewedBy.name}</span>
                        {request.reviewNote && (
                          <span> • Note: {request.reviewNote}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rejection Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="glass-card max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this attendance edit request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reviewNote">Rejection Reason (Optional)</Label>
                <Textarea
                  id="reviewNote"
                  placeholder="Explain why this request is being rejected..."
                  className="bg-secondary border-border min-h-[100px]"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReview('rejected')}
                disabled={processing}
              >
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Rejection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default HRAttendanceRequests;
