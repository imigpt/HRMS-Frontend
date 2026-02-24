import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Clock, Plus, X } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const HRMSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    leaveStartMonth: 'January',
    clockInTime: '09:30:00',
    clockOutTime: '18:00:00',
    earlyClockInMinutes: 0,
    allowClockOutTillMinutes: 0,
    lateMarkAfterMinutes: 30,
    selfClocking: true,
    captureLocation: false,
    halfDayHours: 4,
    allowedIPs: [] as string[],
    workingDaysPerWeek: 5,
    weeklyOffDays: ['sunday'] as string[],
  });
  const [newIP, setNewIP] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await settingsAPI.getHRM();
      if (res.data?.data) {
        setSettings(prev => ({ ...prev, ...res.data.data }));
      }
    } catch { /* use defaults */ }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateHRM(settings);
      toast({ title: 'Success', description: 'HRM settings updated successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update settings', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const addIP = () => {
    if (newIP && !settings.allowedIPs.includes(newIP)) {
      setSettings(prev => ({ ...prev, allowedIPs: [...prev.allowedIPs, newIP] }));
      setNewIP('');
    }
  };

  const removeIP = (ip: string) => {
    setSettings(prev => ({ ...prev, allowedIPs: prev.allowedIPs.filter(i => i !== ip) }));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              HRM Settings
            </CardTitle>
            <CardDescription>Configure attendance, work rules, and policies</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="glow-button">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Update
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="attendance">Attendance Settings</TabsTrigger>
            <TabsTrigger value="work">Work Rules</TabsTrigger>
            <TabsTrigger value="ip">IP Restrictions</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-6">
            {/* Leave Start Month */}
            <div className="space-y-2">
              <Label className="text-destructive font-medium">* Leave Start Month</Label>
              <Select value={settings.leaveStartMonth} onValueChange={v => setSettings(p => ({ ...p, leaveStartMonth: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Clock In / Out Times */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-destructive font-medium">* Check In Time</Label>
                <Input type="time" className="bg-secondary border-border" value={settings.clockInTime}
                  onChange={e => setSettings(p => ({ ...p, clockInTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-destructive font-medium">* Check Out Time</Label>
                <Input type="time" className="bg-secondary border-border" value={settings.clockOutTime}
                  onChange={e => setSettings(p => ({ ...p, clockOutTime: e.target.value }))} />
              </div>
            </div>

            {/* Early Clock In / Allow Clock Out */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Early Clock In Time</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" className="bg-secondary border-border" value={settings.earlyClockInMinutes}
                    onChange={e => setSettings(p => ({ ...p, earlyClockInMinutes: parseInt(e.target.value) || 0 }))} placeholder="Please Enter Early Clock In Time" />
                  <Badge variant="outline" className="shrink-0">Minute</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Allow Clock Out till</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" className="bg-secondary border-border" value={settings.allowClockOutTillMinutes}
                    onChange={e => setSettings(p => ({ ...p, allowClockOutTillMinutes: parseInt(e.target.value) || 0 }))} placeholder="Please Enter Allow Clock Out till" />
                  <Badge variant="outline" className="shrink-0">Minute</Badge>
                </div>
              </div>
            </div>

            {/* Late Mark / Self Clocking / Capture Location */}
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Late Mark After</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" className="bg-secondary border-border" value={settings.lateMarkAfterMinutes}
                    onChange={e => setSettings(p => ({ ...p, lateMarkAfterMinutes: parseInt(e.target.value) || 0 }))} />
                  <Badge variant="outline" className="shrink-0">Minute</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Self Clocking</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Button size="sm" variant={settings.selfClocking ? 'default' : 'outline'}
                    className={settings.selfClocking ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                    onClick={() => setSettings(p => ({ ...p, selfClocking: true }))}>Yes</Button>
                  <Button size="sm" variant={!settings.selfClocking ? 'default' : 'outline'}
                    className={!settings.selfClocking ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}
                    onClick={() => setSettings(p => ({ ...p, selfClocking: false }))}>No</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Capture Location</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Button size="sm" variant={settings.captureLocation ? 'default' : 'outline'}
                    className={settings.captureLocation ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                    onClick={() => setSettings(p => ({ ...p, captureLocation: true }))}>Yes</Button>
                  <Button size="sm" variant={!settings.captureLocation ? 'default' : 'outline'}
                    className={!settings.captureLocation ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}
                    onClick={() => setSettings(p => ({ ...p, captureLocation: false }))}>No</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="work" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Half Day Hours</Label>
                <Input type="number" className="bg-secondary border-border" value={settings.halfDayHours}
                  onChange={e => setSettings(p => ({ ...p, halfDayHours: parseInt(e.target.value) || 4 }))} />
              </div>
              <div className="space-y-2">
                <Label>Working Days Per Week</Label>
                <Input type="number" className="bg-secondary border-border" value={settings.workingDaysPerWeek}
                  onChange={e => setSettings(p => ({ ...p, workingDaysPerWeek: parseInt(e.target.value) || 5 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Weekly Off Days</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => (
                  <Button key={day} size="sm"
                    variant={settings.weeklyOffDays.includes(day) ? 'default' : 'outline'}
                    className={settings.weeklyOffDays.includes(day) ? 'bg-primary text-white' : ''}
                    onClick={() => {
                      setSettings(p => ({
                        ...p,
                        weeklyOffDays: p.weeklyOffDays.includes(day)
                          ? p.weeklyOffDays.filter(d => d !== day)
                          : [...p.weeklyOffDays, day]
                      }));
                    }}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ip" className="space-y-6">
            <div className="space-y-2">
              <Label>Allowed IP Addresses</Label>
              <div className="flex items-center gap-2">
                <Input className="bg-secondary border-border" value={newIP} onChange={e => setNewIP(e.target.value)}
                  placeholder="Enter IP address (e.g. 192.168.1.1)" onKeyDown={e => e.key === 'Enter' && addIP()} />
                <Button size="sm" onClick={addIP}><Plus className="h-4 w-4" /></Button>
              </div>
              {settings.allowedIPs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {settings.allowedIPs.map(ip => (
                    <Badge key={ip} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                      {ip}
                      <button onClick={() => removeIP(ip)}><X className="h-3 w-3 ml-1 hover:text-destructive" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              {settings.allowedIPs.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">No IP restrictions configured. All IPs are allowed.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default HRMSettings;
