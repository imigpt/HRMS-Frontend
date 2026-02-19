import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  CalendarCheck,
  Search,
  Edit2,
  Loader2,
  Users,
  Save,
  Filter,
} from 'lucide-react';
import { leaveBalanceAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface UserBalance {
  _id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  department: string;
  position: string;
  balance: {
    _id?: string;
    paid: number;
    sick: number;
    unpaid: number;
    usedPaid: number;
    usedSick: number;
    usedUnpaid: number;
  };
}

const AdminLeaveManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Edit dialog
  const [editUser, setEditUser] = useState<UserBalance | null>(null);
  const [editForm, setEditForm] = useState<{ paid: string; sick: string; unpaid: string }>({ paid: '0', sick: '0', unpaid: '0' });
  const [saving, setSaving] = useState(false);

  // Bulk dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<{ paid: string; sick: string; unpaid: string }>({ paid: '0', sick: '0', unpaid: '0' });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await leaveBalanceAPI.getAll({ search, role: roleFilter });
      setUsers(res.data?.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Edit single user ──
  const openEditDialog = (user: UserBalance) => {
    setEditUser(user);
    setEditForm({
      paid: String(user.balance.paid ?? 0),
      sick: String(user.balance.sick ?? 0),
      unpaid: String(user.balance.unpaid ?? 0),
    });
  };

  const handleSave = async () => {
    if (!editUser) return;
    try {
      setSaving(true);
      // Convert form strings to numbers before sending
      await leaveBalanceAPI.assign(editUser._id, {
        paid: parseInt(editForm.paid, 10) || 0,
        sick: parseInt(editForm.sick, 10) || 0,
        unpaid: parseInt(editForm.unpaid, 10) || 0,
      });
      toast({ title: 'Success', description: `Leave balance updated for ${editUser.name}` });
      setEditUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update balance',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Bulk assign ──
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map((u) => u._id));
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkSaving(true);
      await leaveBalanceAPI.bulkAssign({
        userIds: selectedIds,
        paid: parseInt(bulkForm.paid, 10) || 0,
        sick: parseInt(bulkForm.sick, 10) || 0,
        unpaid: parseInt(bulkForm.unpaid, 10) || 0,
      });
      toast({
        title: 'Success',
        description: `Balances updated for ${selectedIds.length} user(s)`,
      });
      setBulkOpen(false);
      setSelectedIds([]);
      setBulkForm({ paid: '0', sick: '0', unpaid: '0' });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Bulk assign failed',
        variant: 'destructive',
      });
    } finally {
      setBulkSaving(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.employeeId || '').toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalUsers = filteredUsers.length;
  const hrCount = filteredUsers.filter((u) => u.role === 'hr').length;
  const empCount = filteredUsers.filter((u) => u.role === 'employee').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-primary" />
              Leave Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Assign and manage leave balances for HR &amp; Employees
            </p>
          </div>
          {selectedIds.length > 0 && (
            <Button className="glow-button" onClick={() => setBulkOpen(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Bulk Assign ({selectedIds.length})
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{hrCount}</p>
                  <p className="text-xs text-muted-foreground">HR Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{empCount}</p>
                  <p className="text-xs text-muted-foreground">Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Leave Balances</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Click Edit to assign or change leave balances
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[130px] bg-secondary border-border">
                    <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email…"
                    className="pl-9 bg-secondary border-border"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="accent-primary h-4 w-4 cursor-pointer"
                        checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={selectAll}
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Paid Leave</TableHead>
                    <TableHead className="text-center">Sick Leave</TableHead>
                    <TableHead className="text-center">Unpaid Leave</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user._id} className="border-border hover:bg-secondary/30">
                      <TableCell>
                        <input
                          type="checkbox"
                          className="accent-primary h-4 w-4 cursor-pointer"
                          checked={selectedIds.includes(user._id)}
                          onChange={() => toggleSelect(user._id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {user.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={user.role === 'hr' ? 'text-blue-400 border-blue-400/30' : 'text-green-400 border-green-400/30'}
                        >
                          {user.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            {user.balance.paid - user.balance.usedPaid}
                          </span>
                          <span className="text-xs text-muted-foreground">/{user.balance.paid}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            {user.balance.sick - user.balance.usedSick}
                          </span>
                          <span className="text-xs text-muted-foreground">/{user.balance.sick}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            {user.balance.unpaid - user.balance.usedUnpaid}
                          </span>
                          <span className="text-xs text-muted-foreground">/{user.balance.unpaid}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Edit Balance Dialog ── */}
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Edit Leave Balance
              </DialogTitle>
              <DialogDescription>
                Set annual leave counts for{' '}
                <span className="font-medium text-foreground">{editUser?.name}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {editUser && (
                <div className="bg-secondary/40 rounded-lg p-3 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {editUser.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{editUser.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {editUser.role.toUpperCase()} &bull; {editUser.department || 'No dept'}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Paid Leave</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    className="bg-secondary border-border"
                    value={editForm.paid}
                    onChange={(e) => setEditForm({ ...editForm, paid: e.target.value })}
                    onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                    onBlur={() => { if (editForm.paid.trim() === '') setEditForm({ ...editForm, paid: '0' }); }}
                  />
                  {editUser && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Used: {editUser.balance.usedPaid}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sick Leave</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    className="bg-secondary border-border"
                    value={editForm.sick}
                    onChange={(e) => setEditForm({ ...editForm, sick: e.target.value })}
                    onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                    onBlur={() => { if (editForm.sick.trim() === '') setEditForm({ ...editForm, sick: '0' }); }}
                  />
                  {editUser && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Used: {editUser.balance.usedSick}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Unpaid Leave</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    className="bg-secondary border-border"
                    value={editForm.unpaid}
                    onChange={(e) => setEditForm({ ...editForm, unpaid: e.target.value })}
                    onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                    onBlur={() => { if (editForm.unpaid.trim() === '') setEditForm({ ...editForm, unpaid: '0' }); }}
                  />
                  {editUser && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Used: {editUser.balance.usedUnpaid}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)} disabled={saving}>
                Cancel
              </Button>
              <Button className="glow-button" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Bulk Assign Dialog ── */}
        <Dialog open={bulkOpen} onOpenChange={(o) => { if (!bulkSaving) setBulkOpen(o); }}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Bulk Assign Leave Balance
              </DialogTitle>
              <DialogDescription>
                Set the same leave counts for {selectedIds.length} selected user(s).
                This will <span className="font-medium text-foreground">overwrite</span> their current assigned balance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Paid Leave</Label>
                <Input
                  type="number"
                  min={0}
                  className="bg-secondary border-border"
                  value={bulkForm.paid}
                  onChange={(e) => setBulkForm({ ...bulkForm, paid: e.target.value })}
                  onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                  onBlur={() => { if (bulkForm.paid.trim() === '') setBulkForm({ ...bulkForm, paid: '0' }); }}
                />
              </div>
              <div className="space-y-2">
                <Label>Sick Leave</Label>
                <Input
                  type="number"
                  min={0}
                  className="bg-secondary border-border"
                  value={bulkForm.sick}
                  onChange={(e) => setBulkForm({ ...bulkForm, sick: e.target.value })}
                  onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                  onBlur={() => { if (bulkForm.sick.trim() === '') setBulkForm({ ...bulkForm, sick: '0' }); }}
                />
              </div>
              <div className="space-y-2">
                <Label>Unpaid Leave</Label>
                <Input
                  type="number"
                  min={0}
                  className="bg-secondary border-border"
                  value={bulkForm.unpaid}
                  onChange={(e) => setBulkForm({ ...bulkForm, unpaid: e.target.value })}
                  onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                  onBlur={() => { if (bulkForm.unpaid.trim() === '') setBulkForm({ ...bulkForm, unpaid: '0' }); }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>
                Cancel
              </Button>
              <Button className="glow-button" onClick={handleBulkAssign} disabled={bulkSaving}>
                {bulkSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Assign to {selectedIds.length} User(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminLeaveManagement;
