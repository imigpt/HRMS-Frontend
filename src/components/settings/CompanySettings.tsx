import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Building2 } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const CompanySettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    industry: '',
  });
  const [additional, setAdditional] = useState({
    shortName: '',
    googleMapsApiKey: '',
    timezone: 'Asia/Kolkata',
    defaultLanguage: 'en',
  });
  const { toast } = useToast();

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await settingsAPI.getCompany();
      if (res.data?.data) {
        const { company: c, settings: s } = res.data.data;
        if (c) setCompany(prev => ({ ...prev, name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || '', website: c.website || '', industry: c.industry || '' }));
        if (s) setAdditional(prev => ({ ...prev, ...s }));
      }
    } catch { /* use defaults */ }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateCompany({ companyData: company, settings: additional });
      toast({ title: 'Success', description: 'Company settings updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Company Settings</CardTitle>
            <CardDescription>Configure your company information</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="glow-button">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input className="bg-secondary border-border" value={company.name} onChange={e => setCompany(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Short Name</Label>
            <Input className="bg-secondary border-border" value={additional.shortName} onChange={e => setAdditional(p => ({ ...p, shortName: e.target.value }))} placeholder="e.g. ACME" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Company Email</Label>
            <Input type="email" className="bg-secondary border-border" value={company.email} onChange={e => setCompany(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input className="bg-secondary border-border" value={company.phone} onChange={e => setCompany(p => ({ ...p, phone: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Textarea className="bg-secondary border-border" value={company.address} onChange={e => setCompany(p => ({ ...p, address: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Website</Label>
            <Input className="bg-secondary border-border" value={company.website} onChange={e => setCompany(p => ({ ...p, website: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <Input className="bg-secondary border-border" value={company.industry} onChange={e => setCompany(p => ({ ...p, industry: e.target.value }))} />
          </div>
        </div>
        <div className="border-t border-border pt-6 space-y-4">
          <h3 className="font-semibold text-foreground">Advanced Settings</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Google Maps API Key</Label>
              <Input className="bg-secondary border-border" value={additional.googleMapsApiKey} onChange={e => setAdditional(p => ({ ...p, googleMapsApiKey: e.target.value }))} placeholder="AIzaSy..." />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input className="bg-secondary border-border" value={additional.timezone} onChange={e => setAdditional(p => ({ ...p, timezone: e.target.value }))} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanySettings;
