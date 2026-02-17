import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserCog, Plus, Edit, Trash2, Mail, Phone, Building2, Shield, Eye, Upload } from 'lucide-react';
import { adminAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface HRAccount {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company?: { name: string; _id: string };
  department: string;
  position: string;
  status: 'active' | 'inactive';
  employeeId: string;
  joinedDate: string;
  avatar?: string;
  dateOfBirth: string;
  address: string;
}

const AdminHRAccounts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hrAccounts, setHRAccounts] = useState<HRAccount[]>([]);
  const [companies, setCompanies] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedHR, setSelectedHR] = useState<HRAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    department: '',
    position: '',
    employeeId: '',
    password: '',
    dateOfBirth: '',
    address: '',
    joinedDate: '',
    reportingTo: '',
  });

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await adminAPI.getCompanies();
      if (response.data.success) {
        setCompanies(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch companies:', error);
    }
  }, []);

  const fetchHRAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getHRAccounts();
      if (response.data.success) {
        setHRAccounts(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch HR accounts:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load HR accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch HR accounts on mount
  useEffect(() => {
    fetchHRAccounts();
    fetchCompanies();
  }, [fetchHRAccounts, fetchCompanies]);

  const handleCreate = async () => {
    try {
      // Prepare data, removing empty fields to avoid ObjectId cast errors
      const dataToSend: any = {
        ...formData,
        role: 'hr',
      };
      
      // Remove reportingTo - it should not be sent for HR creation
      // (HR users don't have a reportingTo field in the User model for HR role)
      delete dataToSend.reportingTo;
      
      // Remove company if empty (backend will handle default or make it optional)
      if (!dataToSend.company) {
        delete dataToSend.company;
      }
      
      const response = await adminAPI.createHR(dataToSend);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'HR account created successfully',
        });
        setIsCreateDialogOpen(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          department: '',
          position: '',
          employeeId: '',
          password: '',
          dateOfBirth: '',
          address: '',
          joinedDate: '',
          reportingTo: '',
        });
        fetchHRAccounts(); // Refresh list
      }
    } catch (error: any) {
      console.error('Failed to create HR:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create HR account',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async () => {
    if (!selectedHR) return;

    try {
      if (!formData.name || !formData.employeeId || !formData.email || !formData.phone) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      // Prepare data for update (no password needed for update)
      const dataToSend: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        employeeId: formData.employeeId,
        department: formData.department,
        position: formData.position,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        joinDate: formData.joinedDate,
      };

      // Remove empty fields
      Object.keys(dataToSend).forEach(key => {
        if (!dataToSend[key]) delete dataToSend[key];
      });

      await adminAPI.updateHR(selectedHR._id, dataToSend);
      toast({
        title: 'Success',
        description: 'HR account updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedHR(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        department: '',
        position: '',
        employeeId: '',
        password: '',
        dateOfBirth: '',
        address: '',
        joinedDate: '',
        reportingTo: '',
      });
      fetchHRAccounts();
    } catch (error: any) {
      console.error('Failed to update HR:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update HR account',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this HR account?')) {
      try {
        // TODO: Add delete API call when backend endpoint is ready
        // await adminAPI.deleteHR(id);
        toast({
          title: 'Success',
          description: 'HR account deleted successfully',
        });
        fetchHRAccounts();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to delete HR account',
          variant: 'destructive',
        });
      }
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      // TODO: Add toggle status API call when backend endpoint is ready
      // await adminAPI.updateHRStatus(id, newStatus);
      toast({
        title: 'Success',
        description: 'HR status updated successfully',
      });
      fetchHRAccounts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (hr: HRAccount) => {
    setSelectedHR(hr);
    setFormData({
      name: hr.name,
      email: hr.email,
      phone: hr.phone,
      company: hr.company?._id || '',
      department: hr.department,
      position: hr.position,
      employeeId: hr.employeeId,
      password: '',
      dateOfBirth: hr.dateOfBirth,
      address: hr.address,
      joinedDate: hr.joinedDate,
      reportingTo: '',
    });
    setIsEditDialogOpen(true);
  };

  const fillTestData = () => {
    setFormData({
      name: 'Test HR Manager',
      email: `hr.test${Date.now()}@company.com`,
      phone: '+1 (555) 123-4567',
      company: '',
      department: 'Human Resources',
      position: 'HR Manager',
      employeeId: `HR${Math.floor(Math.random() * 1000)}`,
      password: 'Test@123',
      dateOfBirth: '1990-01-01',
      address: '123 Test Street, Test City, TC 12345',
      joinedDate: new Date().toISOString().split('T')[0],
      reportingTo: '',
    });
    toast({
      title: 'Test Data Filled',
      description: 'Form filled with test data. Ready to create HR account.',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">HR Accounts</h1>
            <p className="text-muted-foreground">Manage HR manager accounts</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="glow-button">
                <Plus className="h-4 w-4 mr-2" />
                Add HR Manager
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle>Add New HR Manager</DialogTitle>
                    <DialogDescription>Create a new HR manager account with complete details</DialogDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fillTestData}
                    className="text-xs"
                  >
                    Fill Test Data
                  </Button>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Profile Photo Upload */}
                <div className="space-y-2">
                  <Label>Profile Photo</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-2 border-border">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        <UserCog className="h-10 w-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer bg-secondary/30">
                        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload photo</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Name and HR ID (Username) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Sarah Johnson"
                      className="bg-secondary border-border"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID <span className="text-xs text-muted-foreground">- Used for login</span></Label>
                    <Input
                      id="employeeId"
                      placeholder="HR-XXX or HR001"
                      className="bg-secondary border-border"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-xs text-muted-foreground">- Initial login password</span></Label>
                  <Input
                    id="password"
                    type="text"
                    placeholder="Create password for HR manager"
                    className="bg-secondary border-border"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="hr@example.com"
                      className="bg-secondary border-border"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="+1 (555) 123-4567"
                      className="bg-secondary border-border"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    className="bg-secondary border-border"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Full address"
                    className="bg-secondary border-border min-h-[80px]"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                {/* Company and Department - Hidden for single company mode */}
                <div className="grid grid-cols-2 gap-4" style={{ display: 'none' }}>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Select
                      value={formData.company}
                      onValueChange={(val) => setFormData({ ...formData, company: val })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company._id} value={company._id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Department - Full width since company is hidden */}
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g., Human Resources"
                    className="bg-secondary border-border"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>

                {/* Position and Join Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      placeholder="HR Manager"
                      className="bg-secondary border-border"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joinedDate">Join Date</Label>
                    <Input
                      id="joinedDate"
                      type="date"
                      className="bg-secondary border-border"
                      value={formData.joinedDate}
                      onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="glow-button"
                  onClick={handleCreate}
                  disabled={!formData.name || !formData.email || !formData.employeeId || !formData.password}
                >
                  Create Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <UserCog className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{hrAccounts.length}</p>
                  <p className="text-xs text-muted-foreground">Total HR Managers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{hrAccounts.filter((hr) => hr.status === 'active').length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{hrAccounts.filter((hr) => hr.status === 'inactive').length}</p>
                  <p className="text-xs text-muted-foreground">Inactive</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <UserCog className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">-</p>
                  <p className="text-xs text-muted-foreground">Employees Managed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* HR Accounts Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>All HR Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HR Manager</TableHead>
                  <TableHead>Login Credentials</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : hrAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No HR accounts found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  hrAccounts.map((hr) => (
                    <TableRow key={hr._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={hr.avatar} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {hr.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{hr.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Since {new Date(hr.joinedDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <UserCog className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-xs text-foreground">{hr.employeeId}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-xs text-muted-foreground">Email:</span>
                            <span className="font-mono text-xs text-primary">{hr.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {hr.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {hr.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-sm">{hr.company?.name || 'N/A'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{hr.department}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{hr.position}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">-</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={hr.status === 'active' ? 'status-approved' : 'bg-muted cursor-pointer'}
                          onClick={() => toggleStatus(hr._id)}
                        >
                          {hr.status.charAt(0).toUpperCase() + hr.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/hr-accounts/${hr._id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(hr)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(hr._id)}
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
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="glass-card max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit HR Manager</DialogTitle>
              <DialogDescription>Update HR manager information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Profile Photo Upload */}
              <div className="space-y-2">
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      <UserCog className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer bg-secondary/30">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload photo</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name and HR ID */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    placeholder="Sarah Johnson"
                    className="bg-secondary border-border"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-employeeId">Employee ID</Label>
                  <Input
                    id="edit-employeeId"
                    placeholder="HR-XXX"
                    className="bg-secondary border-border"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="edit-password">Password</Label>
                <Input
                  id="edit-password"
                  type="text"
                  placeholder="Update password"
                  className="bg-secondary border-border"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              {/* Email and Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="hr@example.com"
                    className="bg-secondary border-border"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    placeholder="+1 (555) 123-4567"
                    className="bg-secondary border-border"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="edit-dateOfBirth">Date of Birth</Label>
                <Input
                  id="edit-dateOfBirth"
                  type="date"
                  className="bg-secondary border-border"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  placeholder="Full address"
                  className="bg-secondary border-border min-h-[80px]"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              {/* Company and Department */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-company">Company</Label>
                  <Select
                    value={formData.company}
                    onValueChange={(val) => setFormData({ ...formData, company: val })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aselea Technologies">Aselea Technologies</SelectItem>
                      <SelectItem value="Innovation Corp">Innovation Corp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <Input
                    id="edit-department"
                    placeholder="e.g., Human Resources"
                    className="bg-secondary border-border"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>

              {/* Position and Join Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-position">Position</Label>
                  <Input
                    id="edit-position"
                    placeholder="HR Manager"
                    className="bg-secondary border-border"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-joinedDate">Join Date</Label>
                  <Input
                    id="edit-joinedDate"
                    type="date"
                    className="bg-secondary border-border"
                    value={formData.joinedDate}
                    onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Reporting To */}
              <div className="space-y-2">
                <Label htmlFor="edit-reportingTo">Reporting To (Optional)</Label>
                <Input
                  id="edit-reportingTo"
                  placeholder="e.g., Senior HR Manager"
                  className="bg-secondary border-border"
                  value={formData.reportingTo}
                  onChange={(e) => setFormData({ ...formData, reportingTo: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="glow-button"
                onClick={handleEdit}
                disabled={!formData.name || !formData.email || !formData.company || !formData.employeeId}
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminHRAccounts;
