import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, UserCheck, Plus, X } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const WorkStatusSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await settingsAPI.getWorkStatus();
        if (res.data?.data) setStatuses(res.data.data);
      } catch { setStatuses(['active', 'on-leave', 'inactive', 'probation', 'notice-period', 'terminated']); }
      finally { setLoading(false); }
    })();
  }, []);

  const addStatus = () => {
    if (newStatus && !statuses.includes(newStatus.toLowerCase())) {
      setStatuses(prev => [...prev, newStatus.toLowerCase()]);
      setNewStatus('');
    }
  };

  const removeStatus = (s: string) => {
    setStatuses(prev => prev.filter(x => x !== s));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateWorkStatus(statuses);
      toast({ title: 'Success', description: 'Work statuses updated' });
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
            <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" />Employee Work Status</CardTitle>
            <CardDescription>Configure the available work statuses for employees</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="glow-button">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2">
          <Input className="bg-secondary border-border" placeholder="Add new work status" value={newStatus}
            onChange={e => setNewStatus(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStatus()} />
          <Button size="sm" onClick={addStatus}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {statuses.map(status => (
            <Badge key={status} variant="secondary" className="flex items-center gap-1 px-3 py-2 text-sm capitalize">
              {status.replace(/-/g, ' ')}
              <button onClick={() => removeStatus(status)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkStatusSettings;
