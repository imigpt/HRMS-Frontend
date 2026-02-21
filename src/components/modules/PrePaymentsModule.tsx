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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Banknote,
  Plus,
  Calendar,
  Clock,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { payrollAPI, adminAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface PrePayment {
  _id: string;
  user: { _id: string; name: string; email: string; employeeId?: string; position?: string; department?: string; profilePhoto?: { url: string } };
  amount: number;
  bankDetails?: { accountNumber?: string; bankName?: string };
  deductMonth: string;
  description?: string;
  status: string;
  createdAt: string;
}

interface PrePaymentsModuleProps {
  role: 'admin' | 'hr' | 'employee';
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending': return <Badge className="status-pending">Pending</Badge>;
    case 'deducted': return <Badge className="status-approved">Deducted</Badge>;
    case 'cancelled': return <Badge className="status-rejected">Cancelled</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

const PrePaymentsModule = ({ role }: PrePaymentsModuleProps) => {
  const [prePayments, setPrePayments] = useState<PrePayment[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PrePayment | null>(null);
  const [filterUser, setFilterUser] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [formData, setFormData] = useState({
    user: '',
    amount: '',
    accountNumber: '',
    bankName: '',
    deductMonth: '',
    description: '',
  });
  const { loading, execute } = useApi();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchPrePayments();
    if (isAdmin) fetchEmployees();
  }, []);

  const fetchPrePayments = async () => {
    try {
      const params: any = {};
      if (filterUser !== 'all') params.userId = filterUser;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
      const result = await execute(() => payrollAPI.getPrePayments(params));
      if (result?.data) setPrePayments(result.data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to fetch pre-payments', variant: 'destructive' });
    }
  };

  const fetchEmployees = async () => {
    try {
      const result = await adminAPI.getEmployees({ limit: 1000 });
      const list = result.data?.data || result.data?.employees || result.data || [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch { /* ignore */ }
  };

  const resetForm = () => {
    setFormData({ user: '', amount: '', accountNumber: '', bankName: '', deductMonth: '', description: '' });
    setIsEditMode(false);
    setSelectedRecord(null);
  };

  const handleSubmit = async () => {
    if (!formData.user || !formData.amount || !formData.deductMonth) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        user: formData.user,
        amount: parseFloat(formData.amount),
        bankDetails: { accountNumber: formData.accountNumber, bankName: formData.bankName },
        deductMonth: formData.deductMonth,
        description: formData.description,
      };
      if (isEditMode && selectedRecord) {
        await execute(() => payrollAPI.updatePrePayment(selectedRecord._id, payload));
        toast({ title: 'Success', description: 'Pre-payment updated successfully' });
      } else {
        await execute(() => payrollAPI.createPrePayment(payload));
        toast({ title: 'Success', description: 'Pre-payment created successfully' });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchPrePayments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Operation failed', variant: 'destructive' });
    }
  };

  const handleEdit = (record: PrePayment) => {
    setSelectedRecord(record);
    setIsEditMode(true);
    setFormData({
      user: record.user._id,
      amount: String(record.amount),
      accountNumber: record.bankDetails?.accountNumber || '',
      bankName: record.bankDetails?.bankName || '',
      deductMonth: record.deductMonth,
      description: record.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pre-payment?')) return;
    try {
      await payrollAPI.deletePrePayment(id);
      toast({ title: 'Success', description: 'Pre-payment deleted' });
      fetchPrePayments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleView = (record: PrePayment) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const filteredRecords = prePayments.filter(pp => {
    if (filterUser !== 'all' && pp.user?._id !== filterUser) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Pre Payments
                </CardTitle>
                <CardDescription>
                  {isAdmin ? 'Manage employee pre-payments and advance deductions' : 'View your pre-payment records'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {isAdmin && (
                  <Select value={filterUser} onValueChange={(v) => { setFilterUser(v); }}>
                    <SelectTrigger className="w-[180px] bg-secondary border-border">
                      <SelectValue placeholder="Select User" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {employees.map((emp: any) => (
                        <SelectItem key={emp._id} value={emp._id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-[150px] bg-secondary border-border" placeholder="Start Date" />
                <Input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-[150px] bg-secondary border-border" placeholder="End Date" />
                <Button variant="outline" onClick={fetchPrePayments}><Search className="h-4 w-4 mr-1" /> Filter</Button>
                {isAdmin && (
                  <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                      <Button className="glow-button"><Plus className="h-4 w-4 mr-2" />Add New Pre Payment</Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Edit Pre Payment' : 'Add New Pre Payment'}</DialogTitle>
                        <DialogDescription>
                          {isEditMode ? 'Update pre-payment details' : 'Create a new pre-payment record for an employee'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Employee *</Label>
                          <Select value={formData.user} onValueChange={v => setFormData({ ...formData, user: v })}>
                            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select Employee" /></SelectTrigger>
                            <SelectContent>
                              {employees.map((emp: any) => (
                                <SelectItem key={emp._id} value={emp._id}>{emp.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Amount (₹) *</Label>
                          <Input type="number" min="0" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="bg-secondary border-border" placeholder="Enter amount" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Account Number</Label>
                            <Input value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} className="bg-secondary border-border" placeholder="Account number" />
                          </div>
                          <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} className="bg-secondary border-border" placeholder="Bank name" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Deduct Month *</Label>
                          <Input type="month" value={formData.deductMonth} onChange={e => setFormData({ ...formData, deductMonth: e.target.value })} className="bg-secondary border-border" />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="bg-secondary border-border" placeholder="Description..." rows={3} />
                        </div>
                        <Button onClick={handleSubmit} className="w-full glow-button" disabled={loading}>
                          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {isEditMode ? 'Update Pre Payment' : 'Add Pre Payment'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Banknote className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No pre-payment records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Account / Bank</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Deduct Month</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((pp) => (
                      <TableRow key={pp._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {pp.user?.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{pp.user?.name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{pp.user?.position || pp.user?.department || ''}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(pp.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(pp.createdAt).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{pp.bankDetails?.accountNumber || '—'}</p>
                          <p className="text-xs text-muted-foreground">{pp.bankDetails?.bankName || ''}</p>
                        </TableCell>
                        <TableCell><span className="font-semibold text-sm">₹{pp.amount.toLocaleString()}</span></TableCell>
                        <TableCell><span className="text-sm">{pp.deductMonth}</span></TableCell>
                        <TableCell>{getStatusBadge(pp.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleView(pp)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                            {isAdmin && pp.status === 'pending' && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(pp)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(pp._id)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle>Pre Payment Details</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-xs">Employee</Label><p className="font-medium">{selectedRecord.user?.name}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Amount</Label><p className="font-medium">₹{selectedRecord.amount.toLocaleString()}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Bank</Label><p className="font-medium">{selectedRecord.bankDetails?.bankName || '—'}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Account</Label><p className="font-medium">{selectedRecord.bankDetails?.accountNumber || '—'}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Deduct Month</Label><p className="font-medium">{selectedRecord.deductMonth}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Status</Label><div>{getStatusBadge(selectedRecord.status)}</div></div>
                  <div><Label className="text-muted-foreground text-xs">Date</Label><p className="font-medium">{new Date(selectedRecord.createdAt).toLocaleDateString()}</p></div>
                </div>
                {selectedRecord.description && (
                  <div><Label className="text-muted-foreground text-xs">Description</Label><p className="text-sm">{selectedRecord.description}</p></div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PrePaymentsModule;
