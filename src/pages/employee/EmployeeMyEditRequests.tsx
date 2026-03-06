import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  FileEdit,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { attendanceAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface MyEditRequest {
  _id: string;
  date: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: {
    _id: string;
    name: string;
    role?: string;
  };
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

const EmployeeMyEditRequests = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<MyEditRequest[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getMyEditRequests();
      setRequests(response.data.data || response.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load edit requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

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

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const filteredRequests = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const filterLabel: Record<FilterType, string> = {
    all: `All Requests (${requests.length})`,
    pending: `Pending (${pendingCount})`,
    approved: `Approved (${approvedCount})`,
    rejected: `Rejected (${rejectedCount})`,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileEdit className="h-8 w-8 text-primary" />
              My Edit Requests
            </h1>
            <p className="text-muted-foreground mt-1">
              Track the status of your attendance correction requests
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {filterLabel[filter]}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem onSelect={() => setFilter('all')}>
                  All Requests ({requests.length})
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setFilter('pending')}>
                  Pending ({pendingCount})
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setFilter('approved')}>
                  Approved ({approvedCount})
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setFilter('rejected')}>
                  Rejected ({rejectedCount})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
                  <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
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
                  <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{filterLabel[filter]}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileEdit className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-xl font-semibold text-foreground">No requests found</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {filter === 'all'
                    ? "You haven't submitted any attendance edit requests yet."
                    : `No ${filter} requests found.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div
                    key={request._id}
                    className={`bg-secondary/30 rounded-lg p-4 border transition-colors ${
                      request.status === 'pending'
                        ? 'border-warning/40'
                        : request.status === 'approved'
                        ? 'border-success/40'
                        : 'border-destructive/40'
                    }`}
                  >
                    {/* Date & Status row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground font-medium">{formatDate(request.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        <span className="text-xs text-muted-foreground">
                          Submitted {new Date(request.createdAt).toLocaleDateString()}
                        </span>
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

                    {/* Review info */}
                    {request.status !== 'pending' && request.reviewedBy && (
                      <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                          {request.status === 'approved' ? 'Approved' : 'Rejected'} by
                        </span>
                        <span className="text-foreground font-medium">{request.reviewedBy.name}</span>
                        {request.reviewedBy.role && (
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 ${
                              request.reviewedBy.role === 'admin'
                                ? 'border-primary/50 text-primary'
                                : 'border-blue-500/50 text-blue-500'
                            }`}
                          >
                            {request.reviewedBy.role === 'admin' ? 'Admin' : 'HR'}
                          </Badge>
                        )}
                        {request.reviewedAt && (
                          <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(request.reviewedAt).toLocaleDateString()}
                          </span>
                        )}
                        {request.reviewNote && (
                          <span className="w-full mt-1 text-xs text-muted-foreground">
                            <strong>Note:</strong> {request.reviewNote}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Pending notice */}
                    {request.status === 'pending' && (
                      <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2 text-sm text-warning">
                        <AlertCircle className="h-4 w-4" />
                        <span>Awaiting review by HR or Admin</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeMyEditRequests;
