import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Mail, Send, TestTube, Eye } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import EmailTemplates from './EmailTemplates';

const EmailSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    mailDriver: 'smtp',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    encryption: 'tls',
    fromName: 'HRMS',
    fromEmail: 'noreply@hrms.com',
    triggers: {
      leaveApplication: true, leaveApproval: true, leaveRejection: true,
      attendanceCheckIn: false, attendanceCheckOut: false, attendanceLateArrival: true,
      taskAssignment: true, taskCompletion: false,
      expenseSubmission: true, expenseApproval: true,
      resignation: true, complaint: true, announcement: true,
      passwordReset: true, welcomeEmail: true, payslipGenerated: true,
    },
  });
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkForm, setBulkForm] = useState({ subject: '', body: '', targetRole: '' });
  const [bulkSending, setBulkSending] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => { fetchSettings(); fetchLogs(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await settingsAPI.getEmail();
      if (res.data?.data) setSettings(prev => ({ ...prev, ...res.data.data }));
    } catch { /* defaults */ }
    finally { setLoading(false); }
  };

  const fetchLogs = async () => {
    try {
      const res = await settingsAPI.getEmailLogs({ limit: 20 });
      if (res.data?.data) setLogs(res.data.data);
    } catch { /* empty */ }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateEmail(settings);
      toast({ title: 'Success', description: 'Email settings updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testEmail) return;
    try {
      setTestSending(true);
      await settingsAPI.sendTestEmail(testEmail);
      toast({ title: 'Success', description: 'Test email sent!' });
      fetchLogs();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to send', variant: 'destructive' });
    } finally { setTestSending(false); }
  };

  const handleBulkSend = async () => {
    if (!bulkForm.subject || !bulkForm.body) return;
    try {
      setBulkSending(true);
      const res = await settingsAPI.sendBulkEmail(bulkForm);
      toast({ title: 'Success', description: res.data?.message || 'Emails sent' });
      setBulkDialog(false);
      setBulkForm({ subject: '', body: '', targetRole: '' });
      fetchLogs();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally { setBulkSending(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const triggerLabels: Record<string, string> = {
    leaveApplication: 'Leave Application', leaveApproval: 'Leave Approval', leaveRejection: 'Leave Rejection',
    attendanceCheckIn: 'Attendance Check In', attendanceCheckOut: 'Attendance Check Out', attendanceLateArrival: 'Late Arrival Alert',
    taskAssignment: 'Task Assignment', taskCompletion: 'Task Completion',
    expenseSubmission: 'Expense Submission', expenseApproval: 'Expense Approval',
    resignation: 'Resignation', complaint: 'Complaint', announcement: 'Announcement',
    passwordReset: 'Password Reset', welcomeEmail: 'Welcome Email', payslipGenerated: 'Payslip Generated',
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />Email Settings</CardTitle>
            <CardDescription>Configure email server and notification triggers</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
              <DialogTrigger asChild>
                <Button variant="outline"><Send className="h-4 w-4 mr-2" />Send Email</Button>
              </DialogTrigger>
              <DialogContent className="glass-card max-w-lg">
                <DialogHeader>
                  <DialogTitle>Send Bulk Email</DialogTitle>
                  <DialogDescription>Send email to employees by role or to all</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Target Role (optional)</Label>
                    <Select value={bulkForm.targetRole} onValueChange={v => setBulkForm(p => ({ ...p, targetRole: v }))}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="All users" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="employee">Employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input className="bg-secondary border-border" value={bulkForm.subject}
                      onChange={e => setBulkForm(p => ({ ...p, subject: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Body (HTML supported)</Label>
                    <Textarea className="bg-secondary border-border min-h-[120px]" value={bulkForm.body}
                      onChange={e => setBulkForm(p => ({ ...p, body: e.target.value }))} />
                  </div>
                  <Button className="w-full glow-button" onClick={handleBulkSend} disabled={bulkSending || !bulkForm.subject || !bulkForm.body}>
                    {bulkSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Send
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSave} disabled={saving} className="glow-button">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Update
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="server" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="server">Server Configuration</TabsTrigger>
            <TabsTrigger value="triggers">Email Triggers</TabsTrigger>
            <TabsTrigger value="test">Test & Logs</TabsTrigger>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="server" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Mail Driver</Label>
                <Select value={settings.mailDriver} onValueChange={v => setSettings(p => ({ ...p, mailDriver: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smtp">SMTP</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="ses">Amazon SES</SelectItem>
                    <SelectItem value="mailgun">Mailgun</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Encryption</Label>
                <Select value={settings.encryption} onValueChange={v => setSettings(p => ({ ...p, encryption: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input className="bg-secondary border-border" value={settings.smtpHost}
                  onChange={e => setSettings(p => ({ ...p, smtpHost: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>SMTP Port</Label>
                <Input type="number" className="bg-secondary border-border" value={settings.smtpPort}
                  onChange={e => setSettings(p => ({ ...p, smtpPort: parseInt(e.target.value) || 587 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input className="bg-secondary border-border" value={settings.smtpUsername}
                  onChange={e => setSettings(p => ({ ...p, smtpUsername: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" className="bg-secondary border-border" value={settings.smtpPassword}
                  onChange={e => setSettings(p => ({ ...p, smtpPassword: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>From Name</Label>
                <Input className="bg-secondary border-border" value={settings.fromName}
                  onChange={e => setSettings(p => ({ ...p, fromName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input type="email" className="bg-secondary border-border" value={settings.fromEmail}
                  onChange={e => setSettings(p => ({ ...p, fromEmail: e.target.value }))} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="triggers" className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">Enable or disable automatic email notifications for events:</p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(triggerLabels).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                  <span className="text-sm text-foreground">{label}</span>
                  <Switch checked={settings.triggers[key as keyof typeof settings.triggers]}
                    onCheckedChange={v => setSettings(p => ({ ...p, triggers: { ...p.triggers, [key]: v } }))} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
              <Label>Send Test Email</Label>
              <div className="flex gap-2">
                <Input className="bg-secondary border-border" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                  placeholder="recipient@example.com" type="email" />
                <Button onClick={handleTest} disabled={testSending || !testEmail}>
                  {testSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}Send Test
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Recent Email Logs</h3>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log._id} className="border-border">
                      <TableCell className="font-medium">{log.subject}</TableCell>
                      <TableCell><Badge variant="outline">{log.type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{(log.to || []).length} recipient(s)</TableCell>
                      <TableCell>
                        <Badge className={log.status === 'sent' ? 'status-approved' : 'status-rejected'}>{log.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No email logs yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <EmailTemplates />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EmailSettings;
