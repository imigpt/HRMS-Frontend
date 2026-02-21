import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Banknote,
  Plus,
  Calendar,
  Clock,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Download,
  FileText,
  Info,
  CheckCircle,
  XCircle,
  Settings,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { payrollAPI, adminAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface PayrollRecord {
  _id: string;
  user: { _id: string; name: string; email: string; employeeId?: string; position?: string; department?: string; profilePhoto?: { url: string } };
  month: number;
  year: number;
  basicSalary: number;
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  prePaymentDeductions: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  paymentDate?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

interface PayrollModuleProps {
  role: 'admin' | 'hr' | 'employee';
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'generated': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Generated</Badge>;
    case 'paid': return <Badge className="status-approved">Paid</Badge>;
    case 'pending': return <Badge className="status-pending">Pending</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

const PayrollModule = ({ role }: PayrollModuleProps) => {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [filterUser, setFilterUser] = useState('all');
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState('all');
  const [generateData, setGenerateData] = useState({ userId: '', month: '', year: String(new Date().getFullYear()) });
  const { loading, execute } = useApi();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchPayrolls();
    if (isAdmin) fetchEmployees();
  }, []);

  const fetchPayrolls = async () => {
    try {
      const params: any = {};
      if (filterUser !== 'all') params.userId = filterUser;
      if (filterYear && filterYear !== 'all') params.year = filterYear;
      if (filterMonth && filterMonth !== 'all') params.month = filterMonth;
      const result = await execute(() => payrollAPI.getPayrolls(params));
      if (result?.data) setPayrolls(result.data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to fetch payrolls', variant: 'destructive' });
    }
  };

  const fetchEmployees = async () => {
    try {
      const result = await adminAPI.getEmployees({ limit: 1000 });
      const list = result.data?.data || result.data?.employees || result.data || [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch { /* ignore */ }
  };

  const handleGenerate = async () => {
    if (!generateData.userId || !generateData.month || !generateData.year) {
      toast({ title: 'Error', description: 'Please select employee, month, and year', variant: 'destructive' });
      return;
    }
    try {
      await execute(() => payrollAPI.generatePayroll({
        userId: generateData.userId,
        month: parseInt(generateData.month),
        year: parseInt(generateData.year),
      }));
      toast({ title: 'Success', description: 'Payroll generated successfully' });
      setIsGenerateOpen(false);
      setGenerateData({ userId: '', month: '', year: String(new Date().getFullYear()) });
      fetchPayrolls();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to generate payroll', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;
    try {
      await payrollAPI.deletePayroll(id);
      toast({ title: 'Success', description: 'Payroll deleted' });
      fetchPayrolls();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleMarkPaid = async (record: PayrollRecord) => {
    try {
      await payrollAPI.updatePayroll(record._id, { status: 'paid', paymentDate: new Date().toISOString() });
      toast({ title: 'Success', description: 'Payroll marked as paid' });
      fetchPayrolls();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update', variant: 'destructive' });
    }
  };

  const handleView = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleDownloadSlip = (record: PayrollRecord) => {
    // Generate a printable payslip
    const slipContent = `
      PAYROLL SLIP
      ============
      Employee: ${record.user?.name || 'N/A'}
      Employee ID: ${record.user?.employeeId || 'N/A'}
      Department: ${record.user?.department || 'N/A'}
      Month: ${monthNames[(record.month || 1) - 1]} ${record.year}
      
      EARNINGS
      --------
      Basic Salary: ₹${record.basicSalary?.toLocaleString() || 0}
      ${(record.allowances || []).map(a => `${a.name}: ₹${a.amount.toLocaleString()}`).join('\n      ')}
      
      DEDUCTIONS
      ----------
      ${(record.deductions || []).map(d => `${d.name}: ₹${d.amount.toLocaleString()}`).join('\n      ')}
      ${record.prePaymentDeductions ? `Pre-Payment: ₹${record.prePaymentDeductions.toLocaleString()}` : ''}
      
      SUMMARY
      -------
      Gross Salary: ₹${record.grossSalary?.toLocaleString() || 0}
      Total Deductions: ₹${record.totalDeductions?.toLocaleString() || 0}
      Net Salary: ₹${record.netSalary?.toLocaleString() || 0}
      
      Status: ${record.status?.toUpperCase()}
      ${record.paymentDate ? `Payment Date: ${new Date(record.paymentDate).toLocaleDateString()}` : ''}
    `;
    const blob = new Blob([slipContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip_${record.user?.name?.replace(/\s+/g, '_') || 'employee'}_${record.month}_${record.year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: 'Payroll slip downloaded' });
  };

  const filteredPayrolls = payrolls;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Info Banner */}
        {isAdmin && (
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              If you want to generate payroll for an employee then first setup basic salary for that employee.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{payrolls.filter(p => p.status === 'generated').length}</p>
                  <p className="text-xs text-muted-foreground">Generated</p>
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
                  <p className="text-2xl font-bold text-foreground">{payrolls.filter(p => p.status === 'paid').length}</p>
                  <p className="text-xs text-muted-foreground">Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{payrolls.filter(p => p.status === 'pending').length}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="text-primary text-lg">₹</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    ₹{payrolls.filter(p => p.status === 'paid').reduce((s, p) => s + (p.netSalary || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Table */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Payroll
                </CardTitle>
                <CardDescription>
                  {isAdmin ? 'Generate and manage employee payrolls' : 'View your payroll history'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {isAdmin && (
                  <Select value={filterUser} onValueChange={setFilterUser}>
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
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-[120px] bg-secondary border-border">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-[140px] bg-secondary border-border">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {monthNames.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchPayrolls}>Filter</Button>
                {isAdmin && (
                  <>
                    <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                      <DialogTrigger asChild>
                        <Button className="glow-button"><Plus className="h-4 w-4 mr-2" />Generate</Button>
                      </DialogTrigger>
                      <DialogContent className="glass-card max-w-md">
                        <DialogHeader>
                          <DialogTitle>Generate Payroll</DialogTitle>
                          <DialogDescription>Generate payroll for an employee based on their salary structure</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Employee *</Label>
                            <Select value={generateData.userId} onValueChange={v => setGenerateData({ ...generateData, userId: v })}>
                              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select Employee" /></SelectTrigger>
                              <SelectContent>
                                {employees.map((emp: any) => (
                                  <SelectItem key={emp._id} value={emp._id}>{emp.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Month *</Label>
                              <Select value={generateData.month} onValueChange={v => setGenerateData({ ...generateData, month: v })}>
                                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Month" /></SelectTrigger>
                                <SelectContent>
                                  {monthNames.map((m, i) => (
                                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Year *</Label>
                              <Select value={generateData.year} onValueChange={v => setGenerateData({ ...generateData, year: v })}>
                                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Year" /></SelectTrigger>
                                <SelectContent>
                                  {years.map(y => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button onClick={handleGenerate} className="w-full glow-button" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Generate Payroll
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredPayrolls.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Banknote className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No payroll records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayrolls.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {record.user?.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{record.user?.name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{record.user?.department || ''}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><span className="font-semibold text-sm">₹{(record.netSalary || 0).toLocaleString()}</span></TableCell>
                        <TableCell><span className="text-sm">{monthNames[(record.month || 1) - 1]} {record.year}</span></TableCell>
                        <TableCell>
                          {record.paymentDate ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date(record.paymentDate).toLocaleDateString()}
                            </div>
                          ) : <span className="text-sm text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleView(record)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDownloadSlip(record)} className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                            {isAdmin && record.status === 'generated' && (
                              <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(record)} className="h-8 text-xs text-success">
                                <CheckCircle className="h-3 w-3 mr-1" />Paid
                              </Button>
                            )}
                            {isAdmin && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(record._id)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
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

        {/* View / Payslip Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="glass-card max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Payroll Details</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4 mt-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary">{selectedRecord.user?.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedRecord.user?.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedRecord.user?.employeeId} · {selectedRecord.user?.department}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-muted-foreground text-xs">Month</Label><p className="font-medium">{monthNames[(selectedRecord.month || 1) - 1]} {selectedRecord.year}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Status</Label><div className="mt-1">{getStatusBadge(selectedRecord.status)}</div></div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-semibold mb-2 text-success">Earnings</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm"><span>Basic Salary</span><span>₹{(selectedRecord.basicSalary || 0).toLocaleString()}</span></div>
                    {(selectedRecord.allowances || []).map((a, i) => (
                      <div key={i} className="flex justify-between text-sm"><span>{a.name}</span><span>₹{a.amount.toLocaleString()}</span></div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold border-t border-border pt-1 mt-1">
                      <span>Gross Salary</span><span>₹{(selectedRecord.grossSalary || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2 text-destructive">Deductions</p>
                  <div className="space-y-1">
                    {(selectedRecord.deductions || []).map((d, i) => (
                      <div key={i} className="flex justify-between text-sm"><span>{d.name}</span><span>₹{d.amount.toLocaleString()}</span></div>
                    ))}
                    {(selectedRecord.prePaymentDeductions || 0) > 0 && (
                      <div className="flex justify-between text-sm"><span>Pre-Payment Advance</span><span>₹{selectedRecord.prePaymentDeductions.toLocaleString()}</span></div>
                    )}
                    <div className="flex justify-between text-sm font-semibold border-t border-border pt-1 mt-1">
                      <span>Total Deductions</span><span>₹{(selectedRecord.totalDeductions || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Net Salary</span>
                  <span className="text-primary">₹{(selectedRecord.netSalary || 0).toLocaleString()}</span>
                </div>
                {selectedRecord.paymentDate && (
                  <p className="text-xs text-muted-foreground">Paid on: {new Date(selectedRecord.paymentDate).toLocaleDateString()}</p>
                )}
                <Button onClick={() => handleDownloadSlip(selectedRecord)} className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" /> Download Payslip
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PayrollModule;
