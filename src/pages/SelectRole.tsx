import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, User } from 'lucide-react';
import aseleaLogo from '@/assets/aselea-logo.png';

const roles = [
  {
    id: 'admin' as UserRole,
    title: 'Admin',
    description: 'Full system access with read-only overview of all operations',
    icon: Shield,
    gradient: 'from-primary/20 to-primary/5',
  },
  {
    id: 'hr' as UserRole,
    title: 'HR Manager',
    description: 'Manage employees, attendance, leaves, and daily operations',
    icon: Users,
    gradient: 'from-primary/15 to-primary/5',
  },
  {
    id: 'employee' as UserRole,
    title: 'Employee',
    description: 'Access personal dashboard, attendance, and tasks',
    icon: User,
    gradient: 'from-primary/10 to-primary/5',
  },
];

const SelectRole = () => {
  const navigate = useNavigate();
  const { selectRole, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleRoleSelect = (role: UserRole) => {
    selectRole(role);
    navigate(`/${role}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background gradient effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        <div className="text-center mb-10 fade-in">
          <img 
            src={aseleaLogo} 
            alt="Aselea Network" 
            className="h-14 w-auto mx-auto mb-6 object-contain"
          />
          <h1 className="text-3xl font-bold text-foreground mb-2">Select Your Role</h1>
          <p className="text-muted-foreground">Choose how you want to access the HRMS</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <Card
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              className={`glass-card card-hover cursor-pointer group fade-in stagger-${index + 1}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <role.icon className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors">
                  {role.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-foreground">
                  {role.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectRole;
