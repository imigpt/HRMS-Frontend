import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Save, ShieldCheck, Plus, Trash2, Edit, Wand2, Blocks, X } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface PermModule {
  _id: string;
  name: string;
  label: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
}

const RolesPermissions = () => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [modules, setModules] = useState<PermModule[]>([]);
  const [editRole, setEditRole] = useState<any>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [permDialog, setPermDialog] = useState(false);
  const [moduleDialog, setModuleDialog] = useState(false);
  const [addModuleDialog, setAddModuleDialog] = useState(false);
  const [form, setForm] = useState({ roleName: '', description: '' });
  const [moduleForm, setModuleForm] = useState({ name: '', label: '', description: '' });
  const [permissions, setPermissions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchRoles(); fetchModules(); }, []);

  const fetchRoles = async () => {
    try {
      const res = await settingsAPI.getRoles();
      if (res.data?.data) setRoles(res.data.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  const fetchModules = async () => {
    try {
      const res = await settingsAPI.getPermissionModules();
      if (res.data?.data) setModules(res.data.data);
    } catch { /* empty */ }
  };

  const handleCreate = async () => {
    if (!form.roleName) return;
    try {
      setSaving(true);
      await settingsAPI.createRole(form);
      toast({ title: 'Success', description: 'Role created' });
      setCreateDialog(false);
      setForm({ roleName: '', description: '' });
      fetchRoles();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await settingsAPI.deleteRole(id);
      toast({ title: 'Success', description: 'Role deleted' });
      fetchRoles();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    }
  };

  const openPermissions = (role: any) => {
    setEditRole(role);
    const existingPerms = role.permissions || [];
    // Use dynamic modules from DB
    const activeModules = modules.filter(m => m.isActive);
    const perms = activeModules.map(mod => {
      const existing = existingPerms.find((p: any) => p.module === mod.name);
      return existing || { module: mod.name, actions: { view: false, create: false, edit: false, delete: false } };
    });
    setPermissions(perms);
    setPermDialog(true);
  };

  const togglePerm = (moduleIdx: number, action: string) => {
    setPermissions(prev => {
      const updated = [...prev];
      updated[moduleIdx] = {
        ...updated[moduleIdx],
        actions: { ...updated[moduleIdx].actions, [action]: !updated[moduleIdx].actions[action] }
      };
      return updated;
    });
  };

  const savePermissions = async () => {
    if (!editRole) return;
    try {
      setSaving(true);
      await settingsAPI.assignPermissions(editRole._id, permissions);
      toast({ title: 'Success', description: 'Permissions updated' });
      setPermDialog(false);
      fetchRoles();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const seedDefaults = async () => {
    try {
      setSeeding(true);
      // Seed modules first, then roles
      await settingsAPI.seedPermissionModules();
      await settingsAPI.seedRoles();
      toast({ title: 'Success', description: 'Default roles & modules seeded' });
      await fetchModules();
      await fetchRoles();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally { setSeeding(false); }
  };

  // Module management
  const handleAddModule = async () => {
    if (!moduleForm.name || !moduleForm.label) return;
    try {
      setSaving(true);
      await settingsAPI.createPermissionModule(moduleForm);
      toast({ title: 'Success', description: `Module "${moduleForm.label}" added` });
      setModuleForm({ name: '', label: '', description: '' });
      setAddModuleDialog(false);
      fetchModules();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const toggleModuleActive = async (mod: PermModule) => {
    try {
      await settingsAPI.updatePermissionModule(mod._id, { isActive: !mod.isActive });
      toast({ title: 'Success', description: `Module "${mod.label}" ${!mod.isActive ? 'enabled' : 'disabled'}` });
      fetchModules();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleDeleteModule = async (mod: PermModule) => {
    try {
      await settingsAPI.deletePermissionModule(mod._id);
      toast({ title: 'Success', description: `Module "${mod.label}" deleted` });
      fetchModules();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Cannot delete system modules', variant: 'destructive' });
    }
  };

  // Get module label for display in permissions grid
  const getModuleLabel = (modName: string) => {
    const found = modules.find(m => m.name === modName);
    return found?.label || modName;
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Roles Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Role & Permissions</CardTitle>
              <CardDescription>Manage roles and their access permissions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setModuleDialog(true)}>
                <Blocks className="h-4 w-4 mr-2" />Manage Modules
              </Button>
              <Button variant="outline" size="sm" onClick={seedDefaults} disabled={seeding}>
                {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}Seed Defaults
              </Button>
              <Dialog open={createDialog} onOpenChange={setCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="glow-button"><Plus className="h-4 w-4 mr-2" />Add Role</Button>
                </DialogTrigger>
                <DialogContent className="glass-card">
                  <DialogHeader>
                    <DialogTitle>Create New Role</DialogTitle>
                    <DialogDescription>Define a new role for the system</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Role Name</Label>
                      <Input className="bg-secondary border-border" value={form.roleName}
                        onChange={e => setForm(p => ({ ...p, roleName: e.target.value }))} placeholder="e.g. supervisor" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea className="bg-secondary border-border" value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Role description" />
                    </div>
                    <Button className="w-full glow-button" onClick={handleCreate} disabled={saving || !form.roleName}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Create Role
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map(role => (
                <TableRow key={role._id} className="border-border">
                  <TableCell className="font-medium capitalize">{role.roleName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{role.description || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={role.isSystem ? 'default' : 'outline'}>
                      {role.isSystem ? 'System' : 'Custom'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{(role.permissions || []).length} modules</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={role.status === 'active' ? 'status-approved' : 'status-rejected'}>
                      {role.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openPermissions(role)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!role.isSystem && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(role._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {roles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No roles found. Click "Seed Defaults" to create system roles.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={permDialog} onOpenChange={setPermDialog}>
        <DialogContent className="glass-card max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissions: <span className="capitalize text-primary">{editRole?.roleName}</span></DialogTitle>
            <DialogDescription>Configure module access permissions</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Module</TableHead>
                <TableHead className="text-center">View</TableHead>
                <TableHead className="text-center">Create</TableHead>
                <TableHead className="text-center">Edit</TableHead>
                <TableHead className="text-center">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((perm, idx) => (
                <TableRow key={perm.module} className="border-border">
                  <TableCell className="font-medium capitalize">{getModuleLabel(perm.module)}</TableCell>
                  {['view', 'create', 'edit', 'delete'].map(action => (
                    <TableCell key={action} className="text-center">
                      <Switch checked={perm.actions[action]} onCheckedChange={() => togglePerm(idx, action)} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setPermDialog(false)}>Cancel</Button>
            <Button className="glow-button" onClick={savePermissions} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save Permissions
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Modules Dialog */}
      <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
        <DialogContent className="glass-card max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Blocks className="h-5 w-5 text-primary" />Manage Permission Modules</DialogTitle>
            <DialogDescription>Add, remove, or toggle modules that appear in the permissions grid. Changes reflect for all roles.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mb-3">
            <Button size="sm" className="glow-button" onClick={() => setAddModuleDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Module
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Module</TableHead>
                <TableHead>Name (key)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map(mod => (
                <TableRow key={mod._id} className="border-border">
                  <TableCell className="font-medium">{mod.label}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{mod.name}</TableCell>
                  <TableCell>
                    <Badge variant={mod.isSystem ? 'default' : 'outline'}>
                      {mod.isSystem ? 'System' : 'Custom'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={mod.isActive} onCheckedChange={() => toggleModuleActive(mod)} />
                  </TableCell>
                  <TableCell className="text-right">
                    {!mod.isSystem && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive"
                        onClick={() => handleDeleteModule(mod)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {modules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No modules found. Click "Seed Defaults" to create default modules.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Add Module Dialog */}
      <Dialog open={addModuleDialog} onOpenChange={setAddModuleDialog}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle>Add Permission Module</DialogTitle>
            <DialogDescription>Create a new module that will appear in the permissions grid for all roles.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Module Key (lowercase, no spaces)</Label>
              <Input className="bg-secondary border-border" value={moduleForm.name}
                onChange={e => setModuleForm(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                placeholder="e.g. email_settings" />
            </div>
            <div className="space-y-2">
              <Label>Display Label</Label>
              <Input className="bg-secondary border-border" value={moduleForm.label}
                onChange={e => setModuleForm(p => ({ ...p, label: e.target.value }))}
                placeholder="e.g. Email Settings" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input className="bg-secondary border-border" value={moduleForm.description}
                onChange={e => setModuleForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What this module controls" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddModuleDialog(false)}>Cancel</Button>
              <Button className="glow-button" onClick={handleAddModule}
                disabled={saving || !moduleForm.name || !moduleForm.label}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Add Module
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesPermissions;
