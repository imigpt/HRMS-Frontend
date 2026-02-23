import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Wallet } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const PayrollSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    payrollCycle: 'monthly',
    payDay: 1,
    overtimeRate: 1.5,
    taxCalculation: 'auto',
    providentFundPercentage: 12,
    esiPercentage: 0.75,
    professionalTax: true,
    autoGeneratePayslip: true,
    payslipFormat: 'pdf',
  });
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await settingsAPI.getPayroll();
        if (res.data?.data) setSettings(prev => ({ ...prev, ...res.data.data }));
      } catch { /* defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updatePayroll(settings);
      toast({ title: 'Success', description: 'Payroll settings updated' });
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
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" />Payroll Settings</CardTitle>
            <CardDescription>Configure payroll calculation rules and parameters</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="glow-button">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Payroll Cycle</Label>
            <Select value={settings.payrollCycle} onValueChange={v => setSettings(p => ({ ...p, payrollCycle: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pay Day</Label>
            <Input type="number" min={1} max={31} className="bg-secondary border-border" value={settings.payDay}
              onChange={e => setSettings(p => ({ ...p, payDay: parseInt(e.target.value) || 1 }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Overtime Rate (multiplier)</Label>
            <Input type="number" step={0.1} className="bg-secondary border-border" value={settings.overtimeRate}
              onChange={e => setSettings(p => ({ ...p, overtimeRate: parseFloat(e.target.value) || 1.5 }))} />
          </div>
          <div className="space-y-2">
            <Label>Tax Calculation</Label>
            <Select value={settings.taxCalculation} onValueChange={v => setSettings(p => ({ ...p, taxCalculation: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatic</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>PF Percentage (%)</Label>
            <Input type="number" step={0.5} className="bg-secondary border-border" value={settings.providentFundPercentage}
              onChange={e => setSettings(p => ({ ...p, providentFundPercentage: parseFloat(e.target.value) || 12 }))} />
          </div>
          <div className="space-y-2">
            <Label>ESI Percentage (%)</Label>
            <Input type="number" step={0.01} className="bg-secondary border-border" value={settings.esiPercentage}
              onChange={e => setSettings(p => ({ ...p, esiPercentage: parseFloat(e.target.value) || 0.75 }))} />
          </div>
          <div className="space-y-2">
            <Label>Payslip Format</Label>
            <Select value={settings.payslipFormat} onValueChange={v => setSettings(p => ({ ...p, payslipFormat: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-8 pt-2">
          <div className="flex items-center gap-2">
            <Switch checked={settings.professionalTax} onCheckedChange={v => setSettings(p => ({ ...p, professionalTax: v }))} />
            <Label>Professional Tax</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.autoGeneratePayslip} onCheckedChange={v => setSettings(p => ({ ...p, autoGeneratePayslip: v }))} />
            <Label>Auto Generate Payslip</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayrollSettings;
