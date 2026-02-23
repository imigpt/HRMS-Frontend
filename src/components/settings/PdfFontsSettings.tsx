import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, FileText } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const PdfFontsSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    pdfFont: 'Helvetica',
    pdfFontSize: '12',
    pdfOrientation: 'portrait',
    pdfHeaderColor: '#3b82f6',
  });
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await settingsAPI.getLocalization();
        if (res.data?.data) {
          const d = res.data.data;
          setSettings(prev => ({
            ...prev,
            pdfFont: d.pdfFont || 'Helvetica',
            pdfFontSize: d.pdfFontSize || '12',
            pdfOrientation: d.pdfOrientation || 'portrait',
            pdfHeaderColor: d.pdfHeaderColor || '#3b82f6',
          }));
        }
      } catch { /* defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateLocalization(settings);
      toast({ title: 'Success', description: 'PDF settings updated' });
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
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />PDF Fonts</CardTitle>
            <CardDescription>Configure font and layout settings for PDF exports</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="glow-button">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Font Family</Label>
            <Select value={settings.pdfFont} onValueChange={v => setSettings(p => ({ ...p, pdfFont: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Times-Roman">Times Roman</SelectItem>
                <SelectItem value="Courier">Courier</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
                <SelectItem value="Lato">Lato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Font Size</Label>
            <Select value={settings.pdfFontSize} onValueChange={v => setSettings(p => ({ ...p, pdfFontSize: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10pt</SelectItem>
                <SelectItem value="11">11pt</SelectItem>
                <SelectItem value="12">12pt</SelectItem>
                <SelectItem value="14">14pt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Orientation</Label>
            <Select value={settings.pdfOrientation} onValueChange={v => setSettings(p => ({ ...p, pdfOrientation: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Header Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.pdfHeaderColor}
                onChange={e => setSettings(p => ({ ...p, pdfHeaderColor: e.target.value }))}
                className="h-10 w-10 rounded border border-border cursor-pointer" />
              <span className="text-sm text-muted-foreground">{settings.pdfHeaderColor}</span>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <p className="text-sm text-muted-foreground mb-2">Preview</p>
          <div className="p-4 bg-white rounded" style={{ fontFamily: settings.pdfFont, fontSize: `${settings.pdfFontSize}px` }}>
            <div className="p-2 rounded mb-2 text-white" style={{ backgroundColor: settings.pdfHeaderColor }}>
              <span className="font-bold">Sample PDF Header</span>
            </div>
            <p className="text-gray-800">This is how your PDF exports will look with the selected font settings.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PdfFontsSettings;
