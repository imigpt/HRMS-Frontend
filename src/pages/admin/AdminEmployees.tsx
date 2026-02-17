import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  UserCircle,
  Search,
  Filter,
  Mail,
  Phone,
  Eye,
  Building2,
  Loader2,
  Plus,
  Upload,
  Edit,
  Calendar,
} from 'lucide-react';
import { adminAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: { name: string; _id: string };
  department?: string;
  position?: string;
  joinDate?: string;
  status: 'active' | 'on-leave' | 'inactive';
  employeeId: string;
  profilePhoto?: {
    url: string;
    publicId: string;
  } | string;
}

const AdminEmployees = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    phone: '',
    password: '',
    department: '',
    position: '',
    joinDate: '',
    dateOfBirth: '',
    address: '',
    status: 'active',
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a photo under 5MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateEmployee = async () => {
    try {
      if (!formData.name || !formData.employeeId || !formData.email || !formData.password || !formData.phone) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields (Name, Employee ID, Email, Phone, Password)',
          variant: 'destructive',
        });
        return;
      }

      setCreateLoading(true);
      
      // Send as FormData for file upload support
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('employeeId', formData.employeeId);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('password', formData.password);
      submitData.append('role', 'employee');
      if (formData.department) submitData.append('department', formData.department);
      if (formData.position) submitData.append('position', formData.position);
      if (formData.joinDate) submitData.append('joinDate', formData.joinDate);
      if (formData.dateOfBirth) submitData.append('dateOfBirth', formData.dateOfBirth);
      if (formData.address) submitData.append('address', formData.address);
      if (selectedPhoto) submitData.append('profilePhoto', selectedPhoto);

      await adminAPI.createEmployee(submitData);
      toast({
        title: 'Success',
        description: 'Employee created successfully',
      });
      setIsAddDialogOpen(false);
      setFormData({
        name: '',
        employeeId: '',
        email: '',
        phone: '',
        password: '',
        department: '',
        position: '',
        joinDate: '',
        dateOfBirth: '',
        address: '',
      });
      setSelectedPhoto(null);
      setPhotoPreview('');
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create employee',
        variant: 'destructive',
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name || '',
      employeeId: employee.employeeId || '',
      email: employee.email || '',
      phone: employee.phone || '',
      password: '', // Don't show password
      department: employee.department || '',
      position: employee.position || '',
      joinDate: employee.joinDate ? new Date(employee.joinDate).toISOString().split('T')[0] : '',
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      address: employee.address || '',
      status: employee.status || 'active',
    });
    const photoUrl = typeof employee.profilePhoto === 'string' ? employee.profilePhoto : employee.profilePhoto?.url;
    setPhotoPreview(photoUrl || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateEmployee = async () => {
    try {
      if (!selectedEmployee) return;
      
      if (!formData.name || !formData.employeeId || !formData.email || !formData.phone) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields (Name, Employee ID, Email, Phone)',
          variant: 'destructive',
        });
        return;
      }

      setEditLoading(true);
      
      // Send as FormData for file upload support
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('employeeId', formData.employeeId);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      if (formData.department) submitData.append('department', formData.department);
      if (formData.position) submitData.append('position', formData.position);
      if (formData.joinDate) submitData.append('joinDate', formData.joinDate);
      if (formData.dateOfBirth) submitData.append('dateOfBirth', formData.dateOfBirth);
      if (formData.address) submitData.append('address', formData.address);
      submitData.append('status', formData.status);
      if (selectedPhoto) submitData.append('profilePhoto', selectedPhoto);

      await adminAPI.updateEmployee(selectedEmployee._id, submitData);
      toast({
        title: 'Success',
        description: 'Employee updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      setSelectedPhoto(null);
      setPhotoPreview('');
      setFormData({
        name: '',
        employeeId: '',
        email: '',
        phone: '',
        password: '',
        department: '',
        position: '',
        joinDate: '',
        dateOfBirth: '',
        address: '',
        status: 'active',
      });
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update employee',
        variant: 'destructive',
      });
    } finally {
      setEditLoading(false);
    }
  };

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getEmployees();
      setEmployees(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch employees:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch employees',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = companyFilter === 'all' || emp.company?.name === companyFilter;
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchesSearch && matchesCompany && matchesDepartment && matchesStatus;
  });

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    onLeave: employees.filter(e => e.status === 'on-leave').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="status-approved">Active</Badge>;
      case 'on-leave':
        return <Badge className="status-pending">On Leave</Badge>;
      case 'inactive':
        return <Badge className="status-rejected">Inactive</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Employees</h1>
            <p className="text-muted-foreground">View and manage employees across all companies</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="glow-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>Enter the details of the new employee</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Profile Photo Upload */}
                <div className="space-y-2">
                  <Label>Profile Photo</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-2 border-border">
                      {photoPreview ? (
                        <AvatarImage src={photoPreview} alt="Preview" />
                      ) : (
                        <AvatarFallback className="bg-primary/20 text-primary">
                          <UserCircle className="h-10 w-10" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <input
                        type="file"
                        id="photo-upload"
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handlePhotoChange}
                      />
                      <label
                        htmlFor="photo-upload"
                        className="block border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer bg-secondary/30"
                      >
                        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {selectedPhoto ? selectedPhoto.name : 'Click to upload photo'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Name and Employee ID (Username) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input 
                      placeholder="John Doe" 
                      className="bg-secondary border-border"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee ID (Username) * <span className="text-xs text-muted-foreground">- Used for login</span></Label>
                    <Input 
                      placeholder="EMP-XXX or john.doe" 
                      className="bg-secondary border-border"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label>Password * <span className="text-xs text-muted-foreground">- Initial login password</span></Label>
                  <Input 
                    type="text" 
                    placeholder="Create password for employee" 
                    className="bg-secondary border-border"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input 
                      type="email" 
                      placeholder="employee@company.com" 
                      className="bg-secondary border-border"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input 
                      type="tel" 
                      placeholder="+1 (555) 123-4567" 
                      className="bg-secondary border-border"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input 
                    type="date" 
                    className="bg-secondary border-border"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea 
                    placeholder="Full address" 
                    className="bg-secondary border-border min-h-[80px]"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                {/* Department and Position */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select 
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input 
                      placeholder="Job Title" 
                      className="bg-secondary border-border"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                </div>

                {/* Join Date */}
                <div className="space-y-2">
                  <Label>Join Date</Label>
                  <Input 
                    type="date" 
                    className="bg-secondary border-border"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 glow-button" onClick={handleCreateEmployee} disabled={createLoading}>
                    {createLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Add Employee'
                    )}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Employee Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Employee</DialogTitle>
                <DialogDescription>Update employee details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Profile Photo Upload */}
                <div className="space-y-2">
                  <Label>Profile Photo</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-2 border-border">
                      {photoPreview ? (
                        <AvatarImage src={photoPreview} alt="Preview" />
                      ) : (
                        <AvatarFallback className="bg-primary/20 text-primary">
                          <UserCircle className="h-10 w-10" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <input
                        type="file"
                        id="photo-upload-edit"
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handlePhotoChange}
                      />
                      <label
                        htmlFor="photo-upload-edit"
                        className="block border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer bg-secondary/30"
                      >
                        <Upload className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="text-sm text-muted-foreground">Click to upload or change photo</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Name and Employee ID */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input 
                      placeholder="John Doe" 
                      className="bg-secondary border-border"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee ID *</Label>
                    <Input 
                      placeholder="EMP-001" 
                      className="bg-secondary border-border"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    />
                  </div>
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input 
                      type="email"
                      placeholder="employee@example.com" 
                      className="bg-secondary border-border"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input 
                      type="tel"
                      placeholder="+1 234 567 8900" 
                      className="bg-secondary border-border"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="date" 
                      className="bg-secondary border-border pl-10"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea 
                    placeholder="Full address" 
                    className="bg-secondary border-border resize-none"
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                {/* Department and Position */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input 
                      placeholder="Engineering" 
                      className="bg-secondary border-border"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input 
                      placeholder="Software Developer" 
                      className="bg-secondary border-border"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                </div>

                {/* Join Date and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Join Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="date" 
                        className="bg-secondary border-border pl-10"
                        value={formData.joinDate}
                        onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on-leave">On Leave</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 glow-button" onClick={handleUpdateEmployee} disabled={editLoading}>
                    {editLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Employee'
                    )}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedEmployee(null);
                    setSelectedPhoto(null);
                    setPhotoPreview('');
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.onLeave}</p>
                  <p className="text-xs text-muted-foreground">On Leave</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.inactive}</p>
                  <p className="text-xs text-muted-foreground">Inactive</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
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
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-leave">On Leave</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Employee Table */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No employees found matching the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                  <TableRow key={employee._id} className="hover:bg-primary/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={typeof employee.profilePhoto === 'string' ? employee.profilePhoto : employee.profilePhoto?.url} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">{employee.employeeId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {employee.email}
                        </div>
                        {employee.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {employee.phone}
                        </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        {employee.company?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{employee.department || 'N/A'}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{new Date(employee.joinDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(employee.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/employees/${employee._id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditDialog(employee)}
                        >
                          <Edit className="h-4 w-4" />
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
      </div>
    </DashboardLayout>
  );
};

export default AdminEmployees;
