import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Coins } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const CurrenciesSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    currency: 'INR',
    currencySymbol: '₹',
    currencyPosition: 'before',
  });
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await settingsAPI.getLocalization();
        if (res.data?.data) {
          const d = res.data.data;
          setSettings({
            currency: d.currency || 'INR',
            currencySymbol: d.currencySymbol || '₹',
            currencyPosition: d.currencyPosition || 'before',
          });
        }
      } catch { /* defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateLocalization(settings);
      toast({ title: 'Success', description: 'Currency settings updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  ];

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-primary" />Currencies</CardTitle>
            <CardDescription>Configure the currency used across the system</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="glow-button">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={settings.currency} onValueChange={v => {
              const c = currencies.find(c => c.code === v);
              setSettings(p => ({ ...p, currency: v, currencySymbol: c?.symbol || p.currencySymbol }));
            }}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencies.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Symbol Position</Label>
            <Select value={settings.currencyPosition} onValueChange={v => setSettings(p => ({ ...p, currencyPosition: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Before amount ({settings.currencySymbol}100)</SelectItem>
                <SelectItem value="after">After amount (100{settings.currencySymbol})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Currency Symbol</Label>
          <Input className="bg-secondary border-border" value={settings.currencySymbol}
            onChange={e => setSettings(p => ({ ...p, currencySymbol: e.target.value }))} />
        </div>
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground">Preview</p>
          <p className="text-2xl font-bold text-foreground">
            {settings.currencyPosition === 'before' ? `${settings.currencySymbol}1,00,000` : `1,00,000${settings.currencySymbol}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrenciesSettings;
