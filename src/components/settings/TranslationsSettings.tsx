import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Languages } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const TranslationsSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultLanguage: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    timezone: 'Asia/Kolkata',
  });
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await settingsAPI.getLocalization();
        if (res.data?.data) setSettings(prev => ({ ...prev, ...res.data.data }));
      } catch { /* defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateLocalization(settings);
      toast({ title: 'Success', description: 'Localization settings updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Languages className="h-5 w-5 text-primary" />Translations & Localization</CardTitle>
            <CardDescription>Configure language, date/time formats, and timezone</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="glow-button">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Default Language</Label>
            <Select value={settings.defaultLanguage} onValueChange={v => setSettings(p => ({ ...p, defaultLanguage: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input className="bg-secondary border-border" value={settings.timezone}
              onChange={e => setSettings(p => ({ ...p, timezone: e.target.value }))} placeholder="Asia/Kolkata" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select value={settings.dateFormat} onValueChange={v => setSettings(p => ({ ...p, dateFormat: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Time Format</Label>
            <Select value={settings.timeFormat} onValueChange={v => setSettings(p => ({ ...p, timeFormat: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12 Hour</SelectItem>
                <SelectItem value="24h">24 Hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TranslationsSettings;
