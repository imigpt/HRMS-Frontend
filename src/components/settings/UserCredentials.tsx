import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, KeyRound, RefreshCw, Eye, EyeOff, Copy, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { authAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface UserCredential {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
  status: string;
  profilePhoto?: string;
  joinDate?: string;
  lastSetPassword?: string;
}

const UserCredentials = () => {
  const [users, setUsers] = useState<UserCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Reset password dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserCredential | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (roleFilter && roleFilter !== 'all') params.role = roleFilter;
      const res = await authAPI.getUserCredentials(params);
      const data = res.data as any;
      setUsers(data.data || data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to fetch users', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenResetDialog = (user: UserCredential) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPassword(false);
    setResetDialogOpen(true);
  };

  const handleGeneratePassword = async () => {
    setIsGenerating(true);
    try {
      const res = await authAPI.generatePassword();
      const data = res.data as any;
      setNewPassword(data.password);
      setShowPassword(true);
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to generate password', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setIsResetting(true);
    try {
      await authAPI.adminResetPassword(selectedUser._id, newPassword);
      toast({ title: 'Success', description: `Password reset for ${selectedUser.name}` });
      setResetDialogOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to reset password', variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Password copied to clipboard' });
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      hr: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      employee: 'bg-green-500/20 text-green-400 border-green-500/30',
      client: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return <Badge variant="outline" className={colors[role] || ''}>{role.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const isActive = status === 'active';
    return (
      <Badge variant="outline" className={isActive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
        {status}
      </Badge>
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          User Credentials
        </CardTitle>
        <CardDescription>View user accounts and manage passwords. Passwords are shown only after being set/reset by admin.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or employee ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead>User</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user._id} className="hover:bg-secondary/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {user.profilePhoto && <AvatarImage src={user.profilePhoto} />}
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{user.employeeId || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {user.lastSetPassword ? (
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs bg-secondary px-2 py-0.5 rounded font-mono">
                            {visiblePasswords.has(user._id) ? user.lastSetPassword : '••••••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() => setVisiblePasswords(prev => {
                              const next = new Set(prev);
                              if (next.has(user._id)) next.delete(user._id);
                              else next.add(user._id);
                              return next;
                            })}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                          >
                            {visiblePasswords.has(user._id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(user.lastSetPassword!)}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not set by admin</span>
                      )}
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => handleOpenResetDialog(user)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing page {page} of {totalPages} ({total} users)
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="pr-20 bg-secondary border-border"
                  minLength={6}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  {newPassword && (
                    <button type="button" onClick={() => copyToClipboard(newPassword)}
                      className="text-muted-foreground hover:text-foreground p-1">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground p-1">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleGeneratePassword}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              Generate Strong Password
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button className="glow-button" onClick={handleResetPassword} disabled={isResetting || !newPassword}>
              {isResetting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Resetting...
                </span>
              ) : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserCredentials;
