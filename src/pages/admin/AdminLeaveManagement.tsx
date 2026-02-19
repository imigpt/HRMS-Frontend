import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Edit2,
  Upload,
  Loader2,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { leaveBalanceAPI, employeeAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface LeaveBalance {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    position?: string;
  };
  paid: number;
  sick: number;
  unpaid: number;
  usedPaid: number;
  usedSick: number;
  usedUnpaid: number;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  position?: string;
}

const AdminLeaveManagement = () => {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<LeaveBalance | null>(null);
  const [editFormData, setEditFormData] = useState({
    paid: '0',
    sick: '0',
    unpaid: '0',
  });
  const [bulkFormData, setBulkFormData] = useState({
    paid: '0',
    sick: '0',
    unpaid: '0',
  });
  const { loading, execute } = useApi();
  const { toast } = useToast();

  useEffect(() => {
    fetchLeaveBalances();
    fetchEmployees();
  }, []);

  const fetchLeaveBalances = async () => {
    try {
      const result = await execute(() => leaveBalanceAPI.getAll());
      if (result?.data?.data) {
        setBalances(result.data.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch leave balances',
        variant: 'destructive',
      });
    }
  };

  const fetchEmployees = async () => {
    try {
      const result = await execute(() => employeeAPI.getEmployees());
      if (result?.data?.data) {
        setEmployees(result.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleEditBalance = (balance: LeaveBalance) => {
    setSelectedBalance(balance);
    setEditFormData({
      paid: balance.paid.toString(),
      sick: balance.sick.toString(),
      unpaid: balance.unpaid.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveBalance = async () => {
    if (!selectedBalance) return;

    try {
      await execute(() =>
        leaveBalanceAPI.assign(selectedBalance.user._id, {
          paid: parseInt(editFormData.paid),
          sick: parseInt(editFormData.sick),
          unpaid: parseInt(editFormData.unpaid),
        })
      );
      toast({
        title: 'Success',
        description: 'Leave balance updated successfully',
      });
      setIsEditDialogOpen(false);
      fetchLeaveBalances();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update balance',
        variant: 'destructive',
      });
    }
  };

  const handleBulkAssign = async () => {
    try {
      await execute(() =>
        leaveBalanceAPI.bulkAssign({
          paid: parseInt(bulkFormData.paid),
          sick: parseInt(bulkFormData.sick),
          unpaid: parseInt(bulkFormData.unpaid),
        })
      );
      toast({
        title: 'Success',
        description: 'Leave balances assigned to all employees',
      });
      setIsBulkDialogOpen(false);
      setBulkFormData({ paid: '0', sick: '0', unpaid: '0' });
      fetchLeaveBalances();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign balances',
        variant: 'destructive',
      });
    }
  };

  const filteredBalances = balances.filter((balance) =>
    balance.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    balance.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPaidRemaining = balances.reduce((sum, b) => sum + (b.paid - b.usedPaid), 0);
  const totalSickRemaining = balances.reduce((sum, b) => sum + (b.sick - b.usedSick), 0);
  const totalUnpaidRemaining = balances.reduce((sum, b) => sum + (b.unpaid - b.usedUnpaid), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leave Management</h1>
            <p className="text-gray-600">Manage employee leave balances</p>
          </div>
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Bulk Assign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Assign Leave Balance</DialogTitle>
                <DialogDescription>
                  Assign leave balance to all employees
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-paid">Paid Leave</Label>
                  <Input
                    id="bulk-paid"
                    type="number"
                    value={bulkFormData.paid}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, paid: e.target.value })}
                    onBlur={(e) => {
                      if (!e.target.value || e.target.value === '') {
                        setBulkFormData({ ...bulkFormData, paid: '0' });
                      }
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="bulk-sick">Sick Leave</Label>
                  <Input
                    id="bulk-sick"
                    type="number"
                    value={bulkFormData.sick}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, sick: e.target.value })}
                    onBlur={(e) => {
                      if (!e.target.value || e.target.value === '') {
                        setBulkFormData({ ...bulkFormData, sick: '0' });
                      }
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="bulk-unpaid">Unpaid Leave</Label>
                  <Input
                    id="bulk-unpaid"
                    type="number"
                    value={bulkFormData.unpaid}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, unpaid: e.target.value })}
                    onBlur={(e) => {
                      if (!e.target.value || e.target.value === '') {
                        setBulkFormData({ ...bulkFormData, unpaid: '0' });
                      }
                    }}
                    placeholder="0"
                  />
                </div>
                <Button onClick={handleBulkAssign} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Assign to All
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Paid Leave (Remaining)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPaidRemaining}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Sick Leave (Remaining)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSickRemaining}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Unpaid Leave (Remaining)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUnpaidRemaining}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Leave Balances</CardTitle>
            <CardDescription>View and manage individual employee leave balances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold">Position</th>
                    <th className="text-center py-3 px-4 font-semibold">Paid</th>
                    <th className="text-center py-3 px-4 font-semibold">Sick</th>
                    <th className="text-center py-3 px-4 font-semibold">Unpaid</th>
                    <th className="text-center py-3 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((balance) => (
                    <tr key={balance._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {balance.user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{balance.user.name}</p>
                            <p className="text-xs text-gray-500">{balance.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{balance.user.position || 'N/A'}</td>
                      <td className="py-3 px-4 text-center">
                        <div>
                          <p className="font-semibold">{balance.paid - balance.usedPaid}</p>
                          <p className="text-xs text-gray-500">/{balance.paid}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div>
                          <p className="font-semibold">{balance.sick - balance.usedSick}</p>
                          <p className="text-xs text-gray-500">/{balance.sick}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div>
                          <p className="font-semibold">{balance.unpaid - balance.usedUnpaid}</p>
                          <p className="text-xs text-gray-500">/{balance.unpaid}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Dialog open={isEditDialogOpen && selectedBalance?._id === balance._id} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditBalance(balance)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Leave Balance</DialogTitle>
                              <DialogDescription>
                                {selectedBalance?.user.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-paid">Paid Leave</Label>
                                <Input
                                  id="edit-paid"
                                  type="number"
                                  value={editFormData.paid}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) => setEditFormData({ ...editFormData, paid: e.target.value })}
                                  onBlur={(e) => {
                                    if (!e.target.value || e.target.value === '') {
                                      setEditFormData({ ...editFormData, paid: '0' });
                                    }
                                  }}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-sick">Sick Leave</Label>
                                <Input
                                  id="edit-sick"
                                  type="number"
                                  value={editFormData.sick}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) => setEditFormData({ ...editFormData, sick: e.target.value })}
                                  onBlur={(e) => {
                                    if (!e.target.value || e.target.value === '') {
                                      setEditFormData({ ...editFormData, sick: '0' });
                                    }
                                  }}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-unpaid">Unpaid Leave</Label>
                                <Input
                                  id="edit-unpaid"
                                  type="number"
                                  value={editFormData.unpaid}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) => setEditFormData({ ...editFormData, unpaid: e.target.value })}
                                  onBlur={(e) => {
                                    if (!e.target.value || e.target.value === '') {
                                      setEditFormData({ ...editFormData, unpaid: '0' });
                                    }
                                  }}
                                  placeholder="0"
                                />
                              </div>
                              <Button onClick={handleSaveBalance} className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save Changes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredBalances.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No employees found matching your search' : 'No leave balances found'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminLeaveManagement;
