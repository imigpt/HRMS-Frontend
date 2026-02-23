import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, HardDrive } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const StorageSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    storageDriver: 'cloudinary',
    cloudinaryCloudName: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: '',
    awsBucket: '',
    awsRegion: '',
    awsAccessKey: '',
    awsSecretKey: '',
    maxUploadSize: 10,
    allowedExtensions: 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,ppt,pptx,csv,txt',
  });
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await settingsAPI.getStorage();
        if (res.data?.data) setSettings(prev => ({ ...prev, ...res.data.data }));
      } catch { /* defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateStorage(settings);
      toast({ title: 'Success', description: 'Storage settings updated' });
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
            <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5 text-primary" />Storage Settings</CardTitle>
            <CardDescription>Configure file storage provider and upload limits</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="glow-button">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Storage Driver</Label>
            <Select value={settings.storageDriver} onValueChange={v => setSettings(p => ({ ...p, storageDriver: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cloudinary">Cloudinary</SelectItem>
                <SelectItem value="aws-s3">AWS S3</SelectItem>
                <SelectItem value="local">Local Storage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Max Upload Size (MB)</Label>
            <Input type="number" className="bg-secondary border-border" value={settings.maxUploadSize}
              onChange={e => setSettings(p => ({ ...p, maxUploadSize: parseInt(e.target.value) || 10 }))} />
          </div>
        </div>

        {settings.storageDriver === 'cloudinary' && (
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-sm font-medium text-foreground">Cloudinary Configuration</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cloud Name</Label>
                <Input className="bg-secondary border-border" value={settings.cloudinaryCloudName}
                  onChange={e => setSettings(p => ({ ...p, cloudinaryCloudName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input className="bg-secondary border-border" value={settings.cloudinaryApiKey}
                  onChange={e => setSettings(p => ({ ...p, cloudinaryApiKey: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>API Secret</Label>
                <Input type="password" className="bg-secondary border-border" value={settings.cloudinaryApiSecret}
                  onChange={e => setSettings(p => ({ ...p, cloudinaryApiSecret: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {settings.storageDriver === 'aws-s3' && (
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
            <p className="text-sm font-medium text-foreground">AWS S3 Configuration</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bucket Name</Label>
                <Input className="bg-secondary border-border" value={settings.awsBucket}
                  onChange={e => setSettings(p => ({ ...p, awsBucket: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input className="bg-secondary border-border" value={settings.awsRegion}
                  onChange={e => setSettings(p => ({ ...p, awsRegion: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Access Key</Label>
                <Input className="bg-secondary border-border" value={settings.awsAccessKey}
                  onChange={e => setSettings(p => ({ ...p, awsAccessKey: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <Input type="password" className="bg-secondary border-border" value={settings.awsSecretKey}
                  onChange={e => setSettings(p => ({ ...p, awsSecretKey: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Allowed File Extensions</Label>
          <Input className="bg-secondary border-border" value={settings.allowedExtensions}
            onChange={e => setSettings(p => ({ ...p, allowedExtensions: e.target.value }))} placeholder="jpg,png,pdf,doc" />
          <p className="text-xs text-muted-foreground">Comma-separated list of allowed file extensions</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageSettings;
