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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Wallet,
  Plus,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  X,
  Settings,
  IndianRupee,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { payrollAPI, adminAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface Allowance {
  _id?: string;
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
}

interface Deduction {
  _id?: string;
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
}

interface SalaryRecord {
  _id: string;
  user: { _id: string; name: string; email: string; employeeId?: string; position?: string; department?: string; profilePhoto?: { url: string } };
  salaryGroup: string;
  basicSalary: number;
  allowances: Allowance[];
  deductions: Deduction[];
  status: string;
  effectiveFrom?: string;
  notes?: string;
  totalAllowances?: number;
  totalDeductions?: number;
  netSalary?: number;
  createdAt: string;
}

interface EmployeeSalariesModuleProps {
  role: 'admin' | 'hr' | 'employee';
}

const EmployeeSalariesModule = ({ role }: EmployeeSalariesModuleProps) => {
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showSalary, setShowSalary] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    user: '',
    salaryGroup: 'Default',
    basicSalary: '',
    effectiveFrom: '',
    notes: '',
    status: 'active',
  });
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const { loading, execute } = useApi();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchSalaries();
    if (isAdmin) fetchEmployees();
  }, []);

  const fetchSalaries = async () => {
    try {
      const params: any = {};
      if (activeTab !== 'all') params.status = activeTab;
      const result = await execute(() => payrollAPI.getSalaries(params));
      if (result?.data) setSalaries(result.data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to fetch salaries', variant: 'destructive' });
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
    setFormData({ user: '', salaryGroup: 'Default', basicSalary: '', effectiveFrom: '', notes: '', status: 'active' });
    setAllowances([]);
    setDeductions([]);
    setIsEditMode(false);
    setSelectedRecord(null);
  };

  const addAllowance = () => setAllowances([...allowances, { name: '', amount: 0, type: 'fixed' }]);
  const removeAllowance = (i: number) => setAllowances(allowances.filter((_, idx) => idx !== i));
  const updateAllowance = (i: number, field: keyof Allowance, value: any) => {
    const updated = [...allowances];
    (updated[i] as any)[field] = value;
    setAllowances(updated);
  };

  const addDeduction = () => setDeductions([...deductions, { name: '', amount: 0, type: 'fixed' }]);
  const removeDeduction = (i: number) => setDeductions(deductions.filter((_, idx) => idx !== i));
  const updateDeduction = (i: number, field: keyof Deduction, value: any) => {
    const updated = [...deductions];
    (updated[i] as any)[field] = value;
    setDeductions(updated);
  };

  const handleSubmit = async () => {
    if (!formData.user || !formData.basicSalary) {
      toast({ title: 'Error', description: 'Please select an employee and enter basic salary', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        user: formData.user,
        salaryGroup: formData.salaryGroup || 'Default',
        basicSalary: parseFloat(formData.basicSalary),
        allowances: allowances.filter(a => a.name && a.amount > 0),
        deductions: deductions.filter(d => d.name && d.amount > 0),
        effectiveFrom: formData.effectiveFrom || undefined,
        notes: formData.notes || undefined,
        status: formData.status,
      };
      if (isEditMode && selectedRecord) {
        await execute(() => payrollAPI.updateSalary(selectedRecord._id, payload));
        toast({ title: 'Success', description: 'Salary updated successfully' });
      } else {
        await execute(() => payrollAPI.createSalary(payload));
        toast({ title: 'Success', description: 'Salary created successfully' });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchSalaries();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Operation failed', variant: 'destructive' });
    }
  };

  const handleEdit = (record: SalaryRecord) => {
    setSelectedRecord(record);
    setIsEditMode(true);
    setFormData({
      user: record.user._id,
      salaryGroup: record.salaryGroup || 'Default',
      basicSalary: String(record.basicSalary),
      effectiveFrom: record.effectiveFrom ? record.effectiveFrom.split('T')[0] : '',
      notes: record.notes || '',
      status: record.status,
    });
    setAllowances(record.allowances.map(a => ({ name: a.name, amount: a.amount, type: a.type })));
    setDeductions(record.deductions.map(d => ({ name: d.name, amount: d.amount, type: d.type })));
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary record?')) return;
    try {
      await payrollAPI.deleteSalary(id);
      toast({ title: 'Success', description: 'Salary deleted' });
      fetchSalaries();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleView = (record: SalaryRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const toggleSalary = (id: string) => {
    setShowSalary(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredSalaries = salaries.filter(s => {
    if (activeTab === 'all') return true;
    return s.status === activeTab;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Employee Salaries
                </CardTitle>
                <CardDescription>
                  {isAdmin ? 'Setup and manage employee salary structures' : 'View your salary details'}
                </CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="glow-button"><Plus className="h-4 w-4 mr-2" />Setup Salary</Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{isEditMode ? 'Edit Salary Structure' : 'Setup Employee Salary'}</DialogTitle>
                      <DialogDescription>Configure salary components for an employee</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
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
                          <Label>Salary Group</Label>
                          <Input value={formData.salaryGroup} onChange={e => setFormData({ ...formData, salaryGroup: e.target.value })} className="bg-secondary border-border" placeholder="e.g., Default, Senior, Junior" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Basic Salary (₹) *</Label>
                          <Input type="number" min="0" value={formData.basicSalary} onChange={e => setFormData({ ...formData, basicSalary: e.target.value })} className="bg-secondary border-border" placeholder="Monthly basic salary" />
                        </div>
                        <div className="space-y-2">
                          <Label>Effective From</Label>
                          <Input type="date" value={formData.effectiveFrom} onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })} className="bg-secondary border-border" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                          <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      {/* Allowances */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-semibold text-success">Allowances</Label>
                          <Button variant="outline" size="sm" onClick={addAllowance}><Plus className="h-3 w-3 mr-1" />Add</Button>
                        </div>
                        {allowances.length === 0 && <p className="text-xs text-muted-foreground">No allowances added</p>}
                        {allowances.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 mb-2">
                            <Input placeholder="Name" value={a.name} onChange={e => updateAllowance(i, 'name', e.target.value)} className="bg-secondary border-border flex-1" />
                            <Input type="number" min="0" placeholder="Amount" value={a.amount || ''} onChange={e => updateAllowance(i, 'amount', parseFloat(e.target.value) || 0)} className="bg-secondary border-border w-28" />
                            <Select value={a.type} onValueChange={v => updateAllowance(i, 'type', v)}>
                              <SelectTrigger className="bg-secondary border-border w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed</SelectItem>
                                <SelectItem value="percentage">%</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => removeAllowance(i)} className="h-8 w-8 text-destructive"><X className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      {/* Deductions */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-semibold text-destructive">Deductions</Label>
                          <Button variant="outline" size="sm" onClick={addDeduction}><Plus className="h-3 w-3 mr-1" />Add</Button>
                        </div>
                        {deductions.length === 0 && <p className="text-xs text-muted-foreground">No deductions added</p>}
                        {deductions.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 mb-2">
                            <Input placeholder="Name" value={d.name} onChange={e => updateDeduction(i, 'name', e.target.value)} className="bg-secondary border-border flex-1" />
                            <Input type="number" min="0" placeholder="Amount" value={d.amount || ''} onChange={e => updateDeduction(i, 'amount', parseFloat(e.target.value) || 0)} className="bg-secondary border-border w-28" />
                            <Select value={d.type} onValueChange={v => updateDeduction(i, 'type', v)}>
                              <SelectTrigger className="bg-secondary border-border w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed</SelectItem>
                                <SelectItem value="percentage">%</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => removeDeduction(i)} className="h-8 w-8 text-destructive"><X className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="bg-secondary border-border" placeholder="Additional notes..." rows={2} />
                      </div>

                      <Button onClick={handleSubmit} className="w-full glow-button" disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isEditMode ? 'Update Salary' : 'Setup Salary'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); }} className="mb-4">
              <TabsList className="bg-secondary">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>

            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredSalaries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No salary records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Salary Group</TableHead>
                      <TableHead>Components</TableHead>
                      <TableHead>Basic Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalaries.map((record) => (
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
                              <p className="text-xs text-muted-foreground">{record.user?.position || record.user?.department || ''}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-sm">{record.salaryGroup || 'Default'}</span></TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {record.allowances?.length > 0 && (
                              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                                {record.allowances.length} Allowance{record.allowances.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {record.deductions?.length > 0 && (
                              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                                {record.deductions.length} Deduction{record.deductions.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {(!record.allowances?.length && !record.deductions?.length) && (
                              <span className="text-xs text-muted-foreground">Basic only</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <button onClick={() => toggleSalary(record._id)} className="font-semibold text-sm hover:text-primary transition-colors">
                            {showSalary[record._id]
                              ? `₹${record.basicSalary.toLocaleString()}`
                              : '₹ ••••••'}
                          </button>
                        </TableCell>
                        <TableCell>
                          {record.status === 'active'
                            ? <Badge className="status-approved">Active</Badge>
                            : <Badge className="status-rejected">Inactive</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleView(record)} className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                            {isAdmin && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(record)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(record._id)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
          <DialogContent className="glass-card max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Salary Details</DialogTitle>
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
                  <div><Label className="text-muted-foreground text-xs">Salary Group</Label><p className="font-medium">{selectedRecord.salaryGroup}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Basic Salary</Label><p className="font-medium">₹{selectedRecord.basicSalary.toLocaleString()}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">{selectedRecord.status === 'active' ? <Badge className="status-approved">Active</Badge> : <Badge className="status-rejected">Inactive</Badge>}</div>
                  </div>
                  {selectedRecord.effectiveFrom && (
                    <div><Label className="text-muted-foreground text-xs">Effective From</Label><p className="font-medium">{new Date(selectedRecord.effectiveFrom).toLocaleDateString()}</p></div>
                  )}
                </div>
                {selectedRecord.allowances?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold mb-2 text-success">Allowances</p>
                      {selectedRecord.allowances.map((a, i) => (
                        <div key={i} className="flex justify-between text-sm mb-1">
                          <span>{a.name}</span>
                          <span>{a.type === 'percentage' ? `${a.amount}%` : `₹${a.amount.toLocaleString()}`}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {selectedRecord.deductions?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold mb-2 text-destructive">Deductions</p>
                      {selectedRecord.deductions.map((d, i) => (
                        <div key={i} className="flex justify-between text-sm mb-1">
                          <span>{d.name}</span>
                          <span>{d.type === 'percentage' ? `${d.amount}%` : `₹${d.amount.toLocaleString()}`}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Net Salary</span>
                  <span className="text-primary">₹{(selectedRecord.netSalary || selectedRecord.basicSalary).toLocaleString()}</span>
                </div>
                {selectedRecord.notes && (
                  <div><Label className="text-muted-foreground text-xs">Notes</Label><p className="text-sm">{selectedRecord.notes}</p></div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeSalariesModule;
