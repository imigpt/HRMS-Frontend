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
  Loader2,
} from 'lucide-react';
import { employeeAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const EmployeeProfile = () => {
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
    bio: '',
    profilePhoto: '',
    status: 'active',
    reportingTo: '',
    emergencyContactName: '',
    emergencyContact: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getProfile();
      const data = response.data.user;  // Changed from response.data.data to response.data.user
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
        bio: data.bio || '',
          profilePhoto: (typeof data.profilePhoto === 'string' ? data.profilePhoto : data.profilePhoto?.url) || '',
        status: data.status || 'active',
        reportingTo: data.reportingTo || '',
        emergencyContactName: data.emergencyContactName || '',
        emergencyContact: data.emergencyContact || '',
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
      Object.entries(profileData).forEach(([key, val]) => {
        // Skip profilePhoto (we upload file separately) and empty values
        if (key === 'profilePhoto' || val === undefined || val === null || val === '') return;
        if (typeof val === 'object') {
          formData.append(key, JSON.stringify(val));
        } else {
          formData.append(key, String(val));
        }
      });
      
      if (selectedPhoto) {
        formData.append('profilePhoto', selectedPhoto);
      }

      await employeeAPI.updateProfile(formData);
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
                    <AvatarImage src={String(photoPreview || profileData.profilePhoto)} alt={profileData.name} />
                  ) : (
                    <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                      {profileData.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  )}
                </Avatar>
                {isEditing && (
                  <>
                    <input
                      type="file"
                      id="profile-photo"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handlePhotoChange}
                    />
                    <label
                      htmlFor="profile-photo"
                      className="absolute bottom-0 right-0 rounded-full h-10 w-10 p-0 bg-secondary hover:bg-secondary/80 flex items-center justify-center cursor-pointer border-2 border-background"
                    >
                      <Upload className="h-4 w-4" />
                    </label>
                  </>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">{profileData.name}</h1>
                    <p className="text-lg text-muted-foreground mt-1">{profileData.position}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-primary/10">
                        {profileData.department}
                      </Badge>
                      <Badge variant="outline">ID: {profileData.employeeId}</Badge>
                      <Badge className={profileData.status === 'active' ? 'status-approved' : 'status-rejected'}>
                        {profileData.status}
                      </Badge>
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

                {isEditing ? (
                  <div className="mt-4">
                    <Textarea
                      value={profileData.bio}
                      onChange={(e) => handleChange('bio', e.target.value)}
                      placeholder="Brief bio..."
                      className="bg-secondary border-border min-h-[80px]"
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-4">{profileData.bio}</p>
                )}
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
                    <p className="text-foreground">{profileData.name}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Email Address</Label>
                {isEditing ? (
                  <Input
                    value={profileData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="bg-secondary border-border"
                    type="email"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{profileData.email}</p>
                  </div>
                )}
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
                    <p className="text-foreground">{profileData.phone}</p>
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
                    <p className="text-foreground">{profileData.address}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Date of Birth</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().slice(0, 10) : ''}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    className="bg-secondary border-border"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">
                      {profileData.dateOfBirth
                        ? new Date(profileData.dateOfBirth).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </p>
                  </div>
                )}
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
              <CardDescription>Your work-related details (read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Employee ID</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10">
                    {profileData.employeeId}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Department</Label>
                <p className="text-foreground">{profileData.department}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Position</Label>
                <p className="text-foreground">{profileData.position}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Reporting To</Label>
                <p className="text-foreground">{profileData.reportingTo}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Join Date</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-foreground">
                    {new Date(profileData.joinDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-muted-foreground">Years of Service</Label>
                <p className="text-foreground">
                  {Math.floor(
                    (new Date().getTime() - new Date(profileData.joinDate).getTime()) /
                      (1000 * 60 * 60 * 24 * 365)
                  )}{' '}
                  years
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Emergency Contact
              </CardTitle>
              <CardDescription>Contact information for emergencies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Contact Name</Label>
                  {isEditing ? (
                    <Input
                      value={profileData.emergencyContactName}
                      onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                      className="bg-secondary border-border"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="text-foreground">{profileData.emergencyContactName}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Contact Number</Label>
                  {isEditing ? (
                    <Input
                      value={profileData.emergencyContact}
                      onChange={(e) => handleChange('emergencyContact', e.target.value)}
                      className="bg-secondary border-border"
                      type="tel"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-foreground">{profileData.emergencyContact}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeProfile;
