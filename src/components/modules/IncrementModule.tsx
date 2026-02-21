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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Plus,
  Calendar,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Award,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { payrollAPI, adminAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface IncrementRecord {
  _id: string;
  user: { _id: string; name: string; email: string; employeeId?: string; position?: string; department?: string; profilePhoto?: { url: string } };
  type: string;
  currentDesignation: string;
  newDesignation?: string;
  previousCTC?: number;
  newCTC?: number;
  effectiveDate: string;
  reason?: string;
  description?: string;
  createdAt: string;
}

interface IncrementModuleProps {
  role: 'admin' | 'hr' | 'employee';
}

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'increment': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Increment</Badge>;
    case 'promotion': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Promotion</Badge>;
    case 'increment-promotion': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Increment/Promotion</Badge>;
    case 'decrement': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Decrement</Badge>;
    case 'decrement-demotion': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Decrement/Demotion</Badge>;
    default: return <Badge>{type}</Badge>;
  }
};

const IncrementModule = ({ role }: IncrementModuleProps) => {
  const [records, setRecords] = useState<IncrementRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IncrementRecord | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showCTC, setShowCTC] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    user: '',
    type: '',
    currentDesignation: '',
    newDesignation: '',
    previousCTC: '',
    newCTC: '',
    effectiveDate: '',
    reason: '',
    description: '',
  });
  const { loading, execute } = useApi();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchRecords();
    if (isAdmin) fetchEmployees();
  }, []);

  const fetchRecords = async () => {
    try {
      const result = await execute(() => payrollAPI.getIncrements());
      if (result?.data) setRecords(result.data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to fetch records', variant: 'destructive' });
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
    setFormData({ user: '', type: '', currentDesignation: '', newDesignation: '', previousCTC: '', newCTC: '', effectiveDate: '', reason: '', description: '' });
    setIsEditMode(false);
    setSelectedRecord(null);
  };

  const handleSubmit = async () => {
    if (!formData.user || !formData.type || !formData.currentDesignation || !formData.effectiveDate) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        user: formData.user,
        type: formData.type,
        currentDesignation: formData.currentDesignation,
        newDesignation: formData.newDesignation || undefined,
        previousCTC: formData.previousCTC ? parseFloat(formData.previousCTC) : undefined,
        newCTC: formData.newCTC ? parseFloat(formData.newCTC) : undefined,
        effectiveDate: formData.effectiveDate,
        reason: formData.reason || undefined,
        description: formData.description || undefined,
      };
      if (isEditMode && selectedRecord) {
        await execute(() => payrollAPI.updateIncrement(selectedRecord._id, payload));
        toast({ title: 'Success', description: 'Record updated successfully' });
      } else {
        await execute(() => payrollAPI.createIncrement(payload));
        toast({ title: 'Success', description: 'Record created successfully' });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchRecords();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Operation failed', variant: 'destructive' });
    }
  };

  const handleEdit = (record: IncrementRecord) => {
    setSelectedRecord(record);
    setIsEditMode(true);
    setFormData({
      user: record.user._id,
      type: record.type,
      currentDesignation: record.currentDesignation,
      newDesignation: record.newDesignation || '',
      previousCTC: record.previousCTC ? String(record.previousCTC) : '',
      newCTC: record.newCTC ? String(record.newCTC) : '',
      effectiveDate: record.effectiveDate ? record.effectiveDate.split('T')[0] : '',
      reason: record.reason || '',
      description: record.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await payrollAPI.deleteIncrement(id);
      toast({ title: 'Success', description: 'Record deleted' });
      fetchRecords();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleView = (record: IncrementRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const toggleCTC = (id: string) => {
    setShowCTC(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredRecords = records.filter(r => {
    if (activeTab === 'all') return true;
    return r.type === activeTab;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Increment / Promotion
                </CardTitle>
                <CardDescription>
                  {isAdmin ? 'Manage employee increments, promotions, and demotions' : 'View your increment and promotion history'}
                </CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="glow-button"><Plus className="h-4 w-4 mr-2" />Add New</Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{isEditMode ? 'Edit Record' : 'Add Increment / Promotion'}</DialogTitle>
                      <DialogDescription>
                        {isEditMode ? 'Update record details' : 'Create a new increment, promotion, or demotion record'}
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
                        <Label>Type *</Label>
                        <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="increment">Increment</SelectItem>
                            <SelectItem value="promotion">Promotion</SelectItem>
                            <SelectItem value="increment-promotion">Increment/Promotion</SelectItem>
                            <SelectItem value="decrement">Decrement</SelectItem>
                            <SelectItem value="decrement-demotion">Decrement/Demotion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Current Designation *</Label>
                          <Input value={formData.currentDesignation} onChange={e => setFormData({ ...formData, currentDesignation: e.target.value })} className="bg-secondary border-border" placeholder="Current designation" />
                        </div>
                        <div className="space-y-2">
                          <Label>New Designation</Label>
                          <Input value={formData.newDesignation} onChange={e => setFormData({ ...formData, newDesignation: e.target.value })} className="bg-secondary border-border" placeholder="New designation" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Previous Annual CTC (₹)</Label>
                          <Input type="number" min="0" value={formData.previousCTC} onChange={e => setFormData({ ...formData, previousCTC: e.target.value })} className="bg-secondary border-border" placeholder="Previous CTC" />
                        </div>
                        <div className="space-y-2">
                          <Label>New Annual CTC (₹)</Label>
                          <Input type="number" min="0" value={formData.newCTC} onChange={e => setFormData({ ...formData, newCTC: e.target.value })} className="bg-secondary border-border" placeholder="New CTC" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Effective Date *</Label>
                        <Input type="date" value={formData.effectiveDate} onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })} className="bg-secondary border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label>Reason</Label>
                        <Textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} className="bg-secondary border-border" placeholder="Reason for change..." rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="bg-secondary border-border" placeholder="Additional details..." rows={2} />
                      </div>
                      <Button onClick={handleSubmit} className="w-full glow-button" disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isEditMode ? 'Update Record' : 'Create Record'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
              <TabsList className="bg-secondary">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="increment">Increment</TabsTrigger>
                <TabsTrigger value="promotion">Promotion</TabsTrigger>
                <TabsTrigger value="increment-promotion">Inc/Promo</TabsTrigger>
                <TabsTrigger value="decrement">Decrement</TabsTrigger>
                <TabsTrigger value="decrement-demotion">Dec/Demotion</TabsTrigger>
              </TabsList>
            </Tabs>

            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current Designation</TableHead>
                      <TableHead>New Designation</TableHead>
                      <TableHead>Annual CTC</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
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
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(record.effectiveDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(record.type)}</TableCell>
                        <TableCell><span className="text-sm">{record.currentDesignation}</span></TableCell>
                        <TableCell><span className="text-sm">{record.newDesignation || '—'}</span></TableCell>
                        <TableCell>
                          <button onClick={() => toggleCTC(record._id)} className="text-sm font-medium hover:text-primary transition-colors">
                            {showCTC[record._id]
                              ? `₹${(record.newCTC || record.previousCTC || 0).toLocaleString()}`
                              : '₹ ••••••'}
                          </button>
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
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Record Details</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-xs">Employee</Label><p className="font-medium">{selectedRecord.user?.name}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Type</Label><div className="mt-1">{getTypeBadge(selectedRecord.type)}</div></div>
                  <div><Label className="text-muted-foreground text-xs">Current Designation</Label><p className="font-medium">{selectedRecord.currentDesignation}</p></div>
                  <div><Label className="text-muted-foreground text-xs">New Designation</Label><p className="font-medium">{selectedRecord.newDesignation || '—'}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Previous CTC</Label><p className="font-medium">₹{(selectedRecord.previousCTC || 0).toLocaleString()}</p></div>
                  <div><Label className="text-muted-foreground text-xs">New CTC</Label><p className="font-medium">₹{(selectedRecord.newCTC || 0).toLocaleString()}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Effective Date</Label><p className="font-medium">{new Date(selectedRecord.effectiveDate).toLocaleDateString()}</p></div>
                </div>
                {selectedRecord.reason && (
                  <div><Label className="text-muted-foreground text-xs">Reason</Label><p className="text-sm">{selectedRecord.reason}</p></div>
                )}
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

export default IncrementModule;
