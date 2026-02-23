import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Edit, Trash2, Plus, Send, Search, Wand2, Eye, X } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  _id: string;
  name: string;
  slug: string;
  subject: string;
  body: string;
  category: 'company' | 'employee';
  type: string;
  variables: string[];
  isActive: boolean;
  isSystem: boolean;
  updatedAt: string;
}

const EmailTemplates = () => {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [category, setCategory] = useState<'company' | 'employee'>('company');
  const [search, setSearch] = useState('');

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [editForm, setEditForm] = useState({ name: '', subject: '', body: '', category: 'company', type: '', isActive: true });
  const [saving, setSaving] = useState(false);

  // Create dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', subject: '', body: '', category: 'company', type: '', variables: '' });

  // Send dialog
  const [sendDialog, setSendDialog] = useState(false);
  const [sendTemplate, setSendTemplate] = useState<EmailTemplate | null>(null);
  const [sendForm, setSendForm] = useState({ recipients: '', variables: {} as Record<string, string> });
  const [sending, setSending] = useState(false);

  // Preview dialog
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      const params: any = {};
      if (category) params.category = category;
      if (search) params.search = search;
      const res = await settingsAPI.getEmailTemplates(params);
      if (res.data?.data) setTemplates(res.data.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, [category, search]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filteredTemplates = templates.filter(t => t.category === category);

  const openEdit = (tpl: EmailTemplate) => {
    setEditTemplate(tpl);
    setEditForm({
      name: tpl.name,
      subject: tpl.subject,
      body: tpl.body,
      category: tpl.category,
      type: tpl.type,
      isActive: tpl.isActive,
    });
    setEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editTemplate) return;
    try {
      setSaving(true);
      await settingsAPI.updateEmailTemplate(editTemplate._id, editForm);
      toast({ title: 'Success', description: 'Template updated' });
      setEditDialog(false);
      fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.subject || !createForm.body || !createForm.type) return;
    try {
      setSaving(true);
      await settingsAPI.createEmailTemplate({
        ...createForm,
        variables: createForm.variables.split(',').map(v => v.trim()).filter(Boolean),
      });
      toast({ title: 'Success', description: 'Template created' });
      setCreateDialog(false);
      setCreateForm({ name: '', subject: '', body: '', category: 'company', type: '', variables: '' });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await settingsAPI.deleteEmailTemplate(id);
      toast({ title: 'Success', description: 'Template deleted' });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Cannot delete system templates', variant: 'destructive' });
    }
  };

  const openSend = (tpl: EmailTemplate) => {
    setSendTemplate(tpl);
    const vars: Record<string, string> = {};
    tpl.variables.forEach(v => { vars[v] = ''; });
    setSendForm({ recipients: '', variables: vars });
    setSendDialog(true);
  };

  const handleSend = async () => {
    if (!sendTemplate || !sendForm.recipients) return;
    try {
      setSending(true);
      const recipients = sendForm.recipients.split(',').map(e => e.trim()).filter(Boolean);
      await settingsAPI.sendFromTemplate(sendTemplate._id, {
        recipients,
        customVariables: sendForm.variables,
      });
      toast({ title: 'Success', description: `Email sent to ${recipients.length} recipient(s)` });
      setSendDialog(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to send', variant: 'destructive' });
    } finally { setSending(false); }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      await settingsAPI.seedEmailTemplates();
      toast({ title: 'Success', description: 'Default templates seeded' });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally { setSeeding(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Header - search + actions */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-secondary border-border"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
            {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}Seed Defaults
          </Button>
          <Button size="sm" className="glow-button" onClick={() => setCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Template
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={v => setCategory(v as 'company' | 'employee')}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="employee">Employee</TabsTrigger>
        </TabsList>

        <TabsContent value={category}>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="w-1/2">Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map(tpl => (
                <TableRow key={tpl._id} className="border-border">
                  <TableCell className="font-medium text-foreground">{tpl.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{tpl.type}</TableCell>
                  <TableCell>
                    <Badge className={tpl.isActive ? 'status-approved' : 'status-rejected'}>
                      {tpl.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setPreviewTemplate(tpl); setPreviewDialog(true); }}
                        className="h-8 w-8 hover:text-primary" title="Preview">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openSend(tpl)}
                        className="h-8 w-8 hover:text-green-400" title="Send">
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button size="icon" className="h-8 w-8 bg-primary hover:bg-primary/80" onClick={() => openEdit(tpl)}
                        title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!tpl.isSystem && (
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(tpl._id)}
                          className="h-8 w-8 hover:text-destructive" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTemplates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                    No templates found. Click "Seed Defaults" to create default templates.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="glass-card max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription>Update the template content and settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input className="bg-secondary border-border" value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input className="bg-secondary border-border" value={editForm.type}
                  onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input className="bg-secondary border-border" value={editForm.subject}
                onChange={e => setEditForm(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Body (HTML)</Label>
              <Textarea className="bg-secondary border-border min-h-[200px] font-mono text-sm" value={editForm.body}
                onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editForm.category} onValueChange={v => setEditForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-7">
                <Switch checked={editForm.isActive}
                  onCheckedChange={v => setEditForm(p => ({ ...p, isActive: v }))} />
                <Label>Active</Label>
              </div>
            </div>
            {editTemplate?.variables && editTemplate.variables.length > 0 && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <Label className="text-xs text-muted-foreground mb-2 block">Available Variables</Label>
                <div className="flex flex-wrap gap-1.5">
                  {editTemplate.variables.map(v => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">##{ v }##</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
              <Button className="glow-button" onClick={handleUpdate} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="glass-card max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>Add a new email template</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input className="bg-secondary border-border" value={createForm.name}
                  onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. New Hire Welcome" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input className="bg-secondary border-border" value={createForm.type}
                  onChange={e => setCreateForm(p => ({ ...p, type: e.target.value }))} placeholder="e.g. On Employee Create" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input className="bg-secondary border-border" value={createForm.subject}
                onChange={e => setCreateForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="e.g. Welcome ##EMPLOYEE_NAME## to our team" />
            </div>
            <div className="space-y-2">
              <Label>Body (HTML)</Label>
              <Textarea className="bg-secondary border-border min-h-[160px] font-mono text-sm" value={createForm.body}
                onChange={e => setCreateForm(p => ({ ...p, body: e.target.value }))} placeholder="<p>Dear ##EMPLOYEE_NAME##,</p>" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={createForm.category} onValueChange={v => setCreateForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Variables (comma-separated)</Label>
                <Input className="bg-secondary border-border" value={createForm.variables}
                  onChange={e => setCreateForm(p => ({ ...p, variables: e.target.value }))}
                  placeholder="EMPLOYEE_NAME, COMPANY" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
              <Button className="glow-button" onClick={handleCreate}
                disabled={saving || !createForm.name || !createForm.subject || !createForm.body || !createForm.type}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={sendDialog} onOpenChange={setSendDialog}>
        <DialogContent className="glass-card max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Email from Template</DialogTitle>
            <DialogDescription>
              {sendTemplate?.name} — fill in variables and recipients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Recipients (comma-separated emails)</Label>
              <Input className="bg-secondary border-border" value={sendForm.recipients}
                onChange={e => setSendForm(p => ({ ...p, recipients: e.target.value }))}
                placeholder="user@example.com, user2@example.com" />
            </div>
            {sendTemplate?.variables && sendTemplate.variables.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Template Variables</Label>
                {sendTemplate.variables.map(v => (
                  <div key={v} className="space-y-1">
                    <Label className="text-xs text-muted-foreground font-mono">##{v}##</Label>
                    <Input className="bg-secondary border-border" value={sendForm.variables[v] || ''}
                      onChange={e => setSendForm(p => ({ ...p, variables: { ...p.variables, [v]: e.target.value } }))}
                      placeholder={v.replace(/_/g, ' ').toLowerCase()} />
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSendDialog(false)}>Cancel</Button>
              <Button className="glow-button" onClick={handleSend} disabled={sending || !sendForm.recipients}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent className="glass-card max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>{previewTemplate?.name}</DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Subject</p>
                <p className="text-sm font-medium text-foreground">{previewTemplate.subject}</p>
              </div>
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-border">
                <div className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewTemplate.body }} />
              </div>
              {previewTemplate.variables.length > 0 && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-2">Variables</p>
                  <div className="flex flex-wrap gap-1.5">
                    {previewTemplate.variables.map(v => (
                      <Badge key={v} variant="outline" className="text-xs font-mono">##{ v }##</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Category: <Badge variant="secondary" className="capitalize ml-1">{previewTemplate.category}</Badge></span>
                <span>Type: {previewTemplate.type}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplates;
