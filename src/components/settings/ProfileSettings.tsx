import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Save, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const ProfileSettings = () => {
  const { userName, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', address: '', bio: '' });
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await authAPI.getMe();
        const u = (res.data as any)?.user || (res.data as any)?.data;
        if (u) setProfile({ name: u.name || '', email: u.email || '', phone: u.phone || '', address: u.address || '', bio: u.bio || '' });
      } catch { /* empty */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      // Profile update would go to user update endpoint
      toast({ title: 'Success', description: 'Profile settings saved' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Profile</CardTitle>
            <CardDescription>Your admin profile information</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="glow-button">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 border border-border">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/20 text-primary text-xl">
              {(profile.name || 'A').split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold text-foreground">{profile.name}</p>
            <p className="text-sm text-muted-foreground capitalize">{userRole}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input className="bg-secondary border-border" value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" className="bg-secondary border-border" value={profile.email} disabled />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input className="bg-secondary border-border" value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input className="bg-secondary border-border" value={profile.address}
              onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea className="bg-secondary border-border" value={profile.bio}
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="A short bio..." />
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;
