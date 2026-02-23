import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, MapPin, Plus, X } from 'lucide-react';
import { settingsAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

interface Location {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

const LocationsSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocation, setNewLocation] = useState<Location>({ name: '', address: '', city: '', state: '', country: '' });
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await settingsAPI.getCompany();
        if (res.data?.data?.locations) setLocations(res.data.data.locations);
      } catch { /* defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const addLocation = () => {
    if (!newLocation.name || !newLocation.city) return;
    setLocations(prev => [...prev, { ...newLocation }]);
    setNewLocation({ name: '', address: '', city: '', state: '', country: '' });
  };

  const removeLocation = (i: number) => {
    setLocations(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateCompany({ locations });
      toast({ title: 'Success', description: 'Locations updated' });
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
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Locations</CardTitle>
            <CardDescription>Define office locations for your organization</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="glow-button">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
          <p className="text-sm font-medium text-foreground">Add New Location</p>
          <div className="grid grid-cols-2 gap-3">
            <Input className="bg-secondary border-border" placeholder="Location Name *" value={newLocation.name}
              onChange={e => setNewLocation(p => ({ ...p, name: e.target.value }))} />
            <Input className="bg-secondary border-border" placeholder="Address" value={newLocation.address}
              onChange={e => setNewLocation(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input className="bg-secondary border-border" placeholder="City *" value={newLocation.city}
              onChange={e => setNewLocation(p => ({ ...p, city: e.target.value }))} />
            <Input className="bg-secondary border-border" placeholder="State" value={newLocation.state}
              onChange={e => setNewLocation(p => ({ ...p, state: e.target.value }))} />
            <Input className="bg-secondary border-border" placeholder="Country" value={newLocation.country}
              onChange={e => setNewLocation(p => ({ ...p, country: e.target.value }))} />
          </div>
          <Button size="sm" onClick={addLocation}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>

        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No locations defined yet</p>
        ) : (
          <div className="space-y-2">
            {locations.map((loc, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <div>
                  <p className="font-medium text-foreground">{loc.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[loc.address, loc.city, loc.state, loc.country].filter(Boolean).join(', ')}
                  </p>
                </div>
                <button onClick={() => removeLocation(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationsSettings;
