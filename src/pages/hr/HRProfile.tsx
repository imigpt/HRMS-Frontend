import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Edit,
  Save,
  X,
  Upload,
  Shield,
  Loader2,
} from 'lucide-react';
import { hrAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const HRProfile = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    joinDate: '',
    employeeId: '',
    department: '',
    position: '',
    profilePhoto: '',
    status: 'active',
    company: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await hrAPI.getProfile();
      const data = response.data.user;
      setProfileData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        dateOfBirth: data.dateOfBirth || '',
        joinDate: data.joinDate || '',
        employeeId: data.employeeId || '',
        department: data.department || '',
        position: data.position || '',
        profilePhoto: (typeof data.profilePhoto === 'string' ? data.profilePhoto : data.profilePhoto?.url) || '',
        status: data.status || 'active',
        company: data.company?.name || '',
      });
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a photo under 5MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append('name', profileData.name);
      formData.append('phone', profileData.phone);
      formData.append('address', profileData.address);
      
      if (selectedPhoto) {
        formData.append('profilePhoto', selectedPhoto);
      }

      await hrAPI.updateProfile(formData);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      setIsEditing(false);
      setSelectedPhoto(null);
      setPhotoPreview('');
      fetchProfile();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedPhoto(null);
    setPhotoPreview('');
    fetchProfile();
  };

  const handleChange = (field: string, value: string) => {
    setProfileData({ ...profileData, [field]: value });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Profile Header */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar Section */}
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-primary/20">
                  {photoPreview || profileData.profilePhoto ? (
                    <AvatarImage src={photoPreview || profileData.profilePhoto} alt={profileData.name} />
                  ) : (
                    <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                      {profileData.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  )}
                </Avatar>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <Button
                      size="sm"
                      className="rounded-full h-10 w-10 p-0"
                      variant="secondary"
                      type="button"
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4" />
                      </span>
                    </Button>
                  </label>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">{profileData.name}</h1>
                    <p className="text-lg text-muted-foreground mt-1">{profileData.position || 'HR Manager'}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="bg-primary/10">
                        <Shield className="h-3 w-3 mr-1" />
                        {profileData.department || 'Human Resources'}
                      </Badge>
                      <Badge variant="outline">ID: {profileData.employeeId}</Badge>
                      {profileData.company && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400">
                          {profileData.company}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <Button onClick={() => setIsEditing(true)} className="glow-button">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    ) : (
                      <>
                        <Button onClick={handleSave} className="glow-button">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button onClick={handleCancel} variant="outline">
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Full Name</Label>
                {isEditing ? (
                  <Input
                    value={profileData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="bg-secondary border-border"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{profileData.name || 'Not set'}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">{profileData.email || 'Not set'}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Phone Number</Label>
                {isEditing ? (
                  <Input
                    value={profileData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="bg-secondary border-border"
                    type="tel"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{profileData.phone || 'Not set'}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Address</Label>
                {isEditing ? (
                  <Textarea
                    value={profileData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="bg-secondary border-border"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{profileData.address || 'Not set'}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Date of Birth</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">
                    {profileData.dateOfBirth
                      ? new Date(profileData.dateOfBirth).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Not set'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Information */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Employment Information
              </CardTitle>
              <CardDescription>Your work-related details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Employee ID</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10">
                    {profileData.employeeId || 'Not set'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Department</Label>
                <p className="text-foreground">{profileData.department || 'Not set'}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Position</Label>
                <p className="text-foreground">{profileData.position || 'Not set'}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Company</Label>
                <p className="text-foreground">{profileData.company || 'Not set'}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Join Date</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">
                    {profileData.joinDate
                      ? new Date(profileData.joinDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Not set'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <Badge 
                  variant="outline" 
                  className={profileData.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}
                >
                  {profileData.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HRProfile;
