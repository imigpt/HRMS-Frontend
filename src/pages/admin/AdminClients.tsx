import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Mail, Phone, Briefcase, UserCheck } from 'lucide-react';
import { clientAPI, adminAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Client {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  clientNotes?: string;
  employeeId: string;
  status: 'active' | 'inactive';
  createdAt: string;
  company?: string | { _id: string; name: string };
}

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  companyName: '',
  clientNotes: '',
  address: '',
  company: '', // which HRMS company this client belongs to
};

const AdminClients = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientAPI.getClients({ search });
      if (res.data.success) setClients(res.data.data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load clients', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  const fetchCompanies = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await adminAPI.getCompanies();
      if (res.data.success) setCompanies(res.data.data || []);
    } catch (_) { /* non-fatal */ }
  }, [isAdmin]);

  useEffect(() => {
    fetchClients();
    fetchCompanies();
  }, [fetchClients, fetchCompanies]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const openCreate = () => {
    setFormData(emptyForm);
    setIsCreateOpen(true);
  };

  const openEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      password: '',
      phone: client.phone || '',
      companyName: client.companyName || '',
      clientNotes: client.clientNotes || '',
      address: '',
      company: (client as any).company?._id || (client as any).company || '',
    });
    setIsEditOpen(true);
  };

  const openDelete = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({ title: 'Validation', description: 'Name, email and password are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await clientAPI.createClient(formData);
      if (res.data.success) {
        toast({ title: 'Success', description: 'Client created successfully' });
        setIsCreateOpen(false);
        fetchClients();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to create client', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedClient) return;
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.password) delete (payload as any).password;
      const res = await clientAPI.updateClient(selectedClient._id, payload);
      if (res.data.success) {
        toast({ title: 'Success', description: 'Client updated successfully' });
        setIsEditOpen(false);
        fetchClients();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to update client', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    try {
      await clientAPI.deleteClient(selectedClient._id);
      toast({ title: 'Success', description: 'Client deleted' });
      setIsDeleteOpen(false);
      fetchClients();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete client', variant: 'destructive' });
    }
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Clients</h1>
              <p className="text-muted-foreground text-sm">Manage client accounts &amp; access</p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>Create a client account. They will have access to the chat panel only.</DialogDescription>
              </DialogHeader>
              <ClientForm
                formData={formData}
                onChange={handleChange}
                showPassword
                companies={companies}
                isAdmin={isAdmin}
                onCompanyChange={(val) => setFormData(f => ({ ...f, company: val }))}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Client'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <UserCheck className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{clients.length}</p>
                <p className="text-sm text-muted-foreground">Total Clients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{clients.filter(c => c.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <UserCheck className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{clients.filter(c => c.status === 'inactive').length}</p>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Client List</CardTitle>
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No clients found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(client => (
                    <TableRow key={client._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{client.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            {client.clientNotes && (
                              <p className="text-xs text-muted-foreground truncate max-w-[160px]">{client.clientNotes}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {client.email}
                          </div>
                          {client.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.companyName ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Briefcase className="h-3 w-3 text-muted-foreground" />
                            {client.companyName}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{client.employeeId}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(client)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDelete(client)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>Update client details</DialogDescription>
            </DialogHeader>
            <ClientForm
              formData={formData}
              onChange={handleChange}
              showPassword={false}
              companies={companies}
              isAdmin={isAdmin}
              onCompanyChange={(val) => setFormData(f => ({ ...f, company: val }))}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Client</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{selectedClient?.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

// ─── Reusable form ────────────────────────────────────────────────────────────

const ClientForm = ({
  formData,
  onChange,
  showPassword,
  companies,
  isAdmin,
  onCompanyChange,
}: {
  formData: typeof emptyForm;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  showPassword: boolean;
  companies?: { _id: string; name: string }[];
  isAdmin?: boolean;
  onCompanyChange?: (val: string) => void;
}) => (
  <div className="grid gap-4 py-2">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <Label htmlFor="name">Full Name *</Label>
        <Input id="name" name="name" value={formData.name} onChange={onChange} placeholder="John Smith" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" value={formData.phone} onChange={onChange} placeholder="+1 234 567 890" />
      </div>
    </div>
    <div className="space-y-1">
      <Label htmlFor="email">Email Address *</Label>
      <Input id="email" name="email" type="email" value={formData.email} onChange={onChange} placeholder="client@company.com" />
    </div>
    {showPassword && (
      <div className="space-y-1">
        <Label htmlFor="password">Password *</Label>
        <Input id="password" name="password" type="password" value={formData.password} onChange={onChange} placeholder="Min 6 characters" />
      </div>
    )}
    {isAdmin && companies && companies.length > 0 && (
      <div className="space-y-1">
        <Label>Assign to HRMS Company</Label>
        <Select value={formData.company} onValueChange={(val) => onCompanyChange?.(val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select company (optional)" />
          </SelectTrigger>
          <SelectContent>
            {companies.map(c => (
              <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}
    <div className="space-y-1">
      <Label htmlFor="companyName">Client's Own Company Name</Label>
      <Input id="companyName" name="companyName" value={formData.companyName} onChange={onChange} placeholder="Acme Corp" />
    </div>
    <div className="space-y-1">
      <Label htmlFor="clientNotes">Notes (optional)</Label>
      <Input id="clientNotes" name="clientNotes" value={formData.clientNotes} onChange={onChange} placeholder="Any relevant notes about this client" />
    </div>
  </div>
);

export default AdminClients;
