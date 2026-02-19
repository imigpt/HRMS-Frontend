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
  Receipt,
  Plus,
  Calendar,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { expenseAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  _id: string;
  id?: string;
  user?: { name: string };
  employee?: { name: string };
  employeeName?: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt?: {
    url?: string;
    publicId?: string;
  };
}

interface ExpensesModuleProps {
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

const ExpensesModule = ({ role }: ExpensesModuleProps) => {
  const [filter, setFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: '',
  });
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { loading, execute } = useApi();
  const { toast } = useToast();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const result = await execute(() => expenseAPI.getExpenses());
      if (result?.data) {
        setExpenses(result.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch expenses',
        variant: 'destructive',
      });
    }
  };

  const handleCreateExpense = async () => {
    if (!formData.category || !formData.amount || !formData.date) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    try {
      const expenseData = new FormData();
      expenseData.append('category', formData.category);
      expenseData.append('amount', formData.amount);
      expenseData.append('description', formData.description);
      expenseData.append('date', formData.date);
      
      if (receiptFile) {
        expenseData.append('receipt', receiptFile);
      }
      
      await execute(() => expenseAPI.createExpense(expenseData));
      toast({
        title: 'Success',
        description: 'Expense claim submitted successfully',
      });
      setIsDialogOpen(false);
      setFormData({ category: '', amount: '', description: '', date: '' });
      setReceiptFile(null);
      setReceiptPreview('');
      fetchExpenses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create expense',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(true);
      await expenseAPI.approveExpense(id);
      toast({
        title: 'Success',
        description: 'Expense approved',
      });
      fetchExpenses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve expense',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedExpenseId) return;
    try {
      setActionLoading(true);
      await expenseAPI.rejectExpense(selectedExpenseId, rejectReason || 'Rejected by HR');
      toast({
        title: 'Success',
        description: 'Expense rejected',
      });
      setRejectDialogOpen(false);
      setSelectedExpenseId(null);
      setRejectReason('');
      fetchExpenses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject expense',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    if (filter === 'all') return true;
    return expense.status === filter;
  });

  const stats = {
    pending: expenses.filter(e => e.status === 'pending').length,
    approved: expenses.filter(e => e.status === 'approved').length,
    rejected: expenses.filter(e => e.status === 'rejected').length,
    total: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
  };

  const canApprove = role === 'hr';
  const canSubmit = role === 'employee' || role === 'hr';

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
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
                  <CheckCircle className="h-5 w-5 text-success" />
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
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
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
                  <p className="text-2xl font-bold text-foreground">₹{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses List */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Expense Claims
                </CardTitle>
                <CardDescription>
                  {canApprove ? 'Review and approve expense claims' : 'Your expense claim history'}
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
                {canSubmit && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="glow-button">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card">
                      <DialogHeader>
                        <DialogTitle>Submit Expense</DialogTitle>
                        <DialogDescription>Submit a new expense claim for approval</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                            <SelectTrigger className="bg-secondary border-border">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="travel">Travel</SelectItem>
                              <SelectItem value="food">Food/Meals</SelectItem>
                              <SelectItem value="office-supplies">Office Supplies</SelectItem>
                              <SelectItem value="software">Software</SelectItem>
                              <SelectItem value="training">Training</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Amount (₹)</Label>
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              className="bg-secondary border-border"
                              value={formData.amount}
                              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Date</Label>
                            <Input 
                              type="date" 
                              className="bg-secondary border-border"
                              value={formData.date}
                              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Bill/Receipt Photo (Optional)</Label>
                          <div className="flex flex-col gap-3">
                            <Input
                              type="file"
                              accept="image/*"
                              className="bg-secondary border-border"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setReceiptFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setReceiptPreview(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            {receiptPreview && (
                              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                                <img
                                  src={receiptPreview}
                                  alt="Receipt preview"
                                  className="w-full h-full object-cover"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="absolute top-2 right-2"
                                  onClick={() => {
                                    setReceiptFile(null);
                                    setReceiptPreview('');
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea 
                            placeholder="Describe the expense" 
                            className="bg-secondary border-border"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          />
                        </div>
                        <Button className="w-full glow-button" onClick={handleCreateExpense} disabled={loading}>
                          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Expense'}
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
              {filteredExpenses.map((expense) => {
                const employeeName = expense.user?.name || expense.employee?.name || expense.employeeName || 'Unknown Employee';
                
                return (
                <div
                  key={expense._id || expense.id}
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">₹{expense.amount}</p>
                          <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{expense.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{employeeName}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(expense.date).toLocaleDateString()}
                          </span>
                          {expense.receipt?.url && (
                            <Button
                              size="sm"
                              variant="link"
                              className="text-xs p-0 h-auto text-primary hover:text-primary/80"
                              onClick={() => {
                                setSelectedReceipt(expense.receipt?.url || null);
                                setReceiptDialogOpen(true);
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              View Bill Photo
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(expense.status)}
                      {canApprove && expense.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-success hover:text-success hover:bg-success/10"
                            onClick={() => handleApprove(expense._id || expense.id || '')}
                            disabled={actionLoading}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedExpenseId(expense._id || expense.id || null);
                              setRejectDialogOpen(true);
                            }}
                            disabled={actionLoading}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Reject Expense Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this expense claim.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Input
                id="reject-reason"
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
                setSelectedExpenseId(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
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
    </DashboardLayout>
  );
};

export default ExpensesModule;
