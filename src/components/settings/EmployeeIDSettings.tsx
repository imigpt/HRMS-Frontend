import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Save, UserCog, Eye, RefreshCw } from 'lucide-react';
import { settingsAPI, adminAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const EmployeeIDSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    prefix: 'EMP',
    nextNumber: 1,
    padding: 3,
    separator: '',
    includeYear: false,
    formatRule: 'auto',
    manualOverrideAllowed: true,
    preview: 'EMP001',
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [customId, setCustomId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [configRes, empRes] = await Promise.all([
        settingsAPI.getEmployeeIDConfig(),
        adminAPI.getEmployees()
      ]);
      if (configRes.data?.data) setConfig(configRes.data.data);
      if (empRes.data?.data) setEmployees(empRes.data.data);
    } catch { /* defaults */ }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await settingsAPI.updateEmployeeIDConfig(config);
      if (res.data?.data) setConfig(res.data.data);
      toast({ title: 'Success', description: 'Employee ID configuration updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleAssign = async () => {
    if (!selectedUser) return;
    try {
      setAssigning(true);
      await settingsAPI.assignEmployeeID({ userId: selectedUser, customId: customId || undefined });
      toast({ title: 'Success', description: 'Employee ID assigned' });
      setAssignDialog(false);
      setSelectedUser('');
      setCustomId('');
      fetchAll();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to assign', variant: 'destructive' });
    } finally { setAssigning(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Config Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" />Employee ID Configuration</CardTitle>
              <CardDescription>Configure how employee IDs are generated</CardDescription>
            </div>
            <Button onClick={handleSave} disabled={saving} className="glow-button">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Update
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Preview</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{config.preview}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Prefix</Label>
              <Input className="bg-secondary border-border" value={config.prefix}
                onChange={e => setConfig(p => ({ ...p, prefix: e.target.value }))} placeholder="EMP" />
            </div>
            <div className="space-y-2">
              <Label>Next Number</Label>
              <Input type="number" className="bg-secondary border-border" min={1} value={config.nextNumber}
                onChange={e => setConfig(p => ({ ...p, nextNumber: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Padding (digits)</Label>
              <Input type="number" className="bg-secondary border-border" min={1} max={10} value={config.padding}
                onChange={e => setConfig(p => ({ ...p, padding: parseInt(e.target.value) || 3 }))} />
            </div>
            <div className="space-y-2">
              <Label>Separator</Label>
              <Select value={config.separator} onValueChange={v => setConfig(p => ({ ...p, separator: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="-">Hyphen (-)</SelectItem>
                  <SelectItem value="_">Underscore (_)</SelectItem>
                  <SelectItem value="/">Slash (/)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format Rule</Label>
              <Select value={config.formatRule} onValueChange={v => setConfig(p => ({ ...p, formatRule: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto Generate</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Switch checked={config.includeYear} onCheckedChange={v => setConfig(p => ({ ...p, includeYear: v }))} />
              <Label>Include Year</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={config.manualOverrideAllowed} onCheckedChange={v => setConfig(p => ({ ...p, manualOverrideAllowed: v }))} />
              <Label>Allow Manual Override</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Employee ID Assignment</CardTitle>
            <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
              <DialogTrigger asChild>
                <Button className="glow-button" size="sm">Assign ID</Button>
              </DialogTrigger>
              <DialogContent className="glass-card">
                <DialogHeader>
                  <DialogTitle>Assign Employee ID</DialogTitle>
                  <DialogDescription>Select an employee and optionally provide a custom ID</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((emp: any) => (
                          <SelectItem key={emp._id} value={emp._id}>{emp.name} ({emp.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {config.manualOverrideAllowed && (
                    <div className="space-y-2">
                      <Label>Custom ID (optional)</Label>
                      <Input className="bg-secondary border-border" value={customId} onChange={e => setCustomId(e.target.value)}
                        placeholder={`Leave empty for auto: ${config.preview}`} />
                    </div>
                  )}
                  <Button className="w-full glow-button" onClick={handleAssign} disabled={assigning || !selectedUser}>
                    {assigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Assign
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Employee ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.slice(0, 20).map((emp: any) => (
                <TableRow key={emp._id} className="border-border">
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                  <TableCell><Badge variant="outline">{emp.role}</Badge></TableCell>
                  <TableCell><Badge className="bg-primary/20 text-primary">{emp.employeeId || 'Not assigned'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeIDSettings;
