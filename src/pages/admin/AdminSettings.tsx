import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Building2,
  User,
  Languages,
  ShieldCheck,
  UserCheck,
  Coins,
  MapPin,
  Type,
  Settings,
  Wallet,
  UserCog,
  Mail,
  HardDrive,
  Lock,
  Users,
  LucideIcon,
} from 'lucide-react';

// Settings sub-pages
import CompanySettingsPage from '@/components/settings/CompanySettings';
import ProfileSettings from '@/components/settings/ProfileSettings';
import ChangePassword from '@/components/settings/ChangePassword';
import UserCredentials from '@/components/settings/UserCredentials';
import TranslationsSettings from '@/components/settings/TranslationsSettings';
import RolesPermissions from '@/components/settings/RolesPermissions';
import WorkStatusSettings from '@/components/settings/WorkStatusSettings';
import CurrenciesSettings from '@/components/settings/CurrenciesSettings';
import LocationsSettings from '@/components/settings/LocationsSettings';
import PdfFontsSettings from '@/components/settings/PdfFontsSettings';
import HRMSettings from '@/components/settings/HRMSettings';
import PayrollSettings from '@/components/settings/PayrollSettings';
import EmployeeIDSettings from '@/components/settings/EmployeeIDSettings';
import EmailSettingsPage from '@/components/settings/EmailSettings';
import StorageSettings from '@/components/settings/StorageSettings';

interface SettingsMenuItem {
  id: string;
  title: string;
  icon: LucideIcon;
}

const settingsMenu: SettingsMenuItem[] = [
  { id: 'company', title: 'Company Settings', icon: Building2 },
  { id: 'profile', title: 'Profile', icon: User },
  { id: 'change-password', title: 'Change Password', icon: Lock },
  { id: 'user-credentials', title: 'User Credentials', icon: Users },
  { id: 'translations', title: 'Translations', icon: Languages },
  { id: 'roles', title: 'Role & Permissions', icon: ShieldCheck },
  { id: 'work-status', title: 'Employee Work Status', icon: UserCheck },
  { id: 'currencies', title: 'Currencies', icon: Coins },
  { id: 'locations', title: 'Locations', icon: MapPin },
  { id: 'pdf-fonts', title: 'Pdf Fonts', icon: Type },
  { id: 'hrm', title: 'HRM Settings', icon: Settings },
  { id: 'payroll', title: 'Payroll Settings', icon: Wallet },
  { id: 'employee-id', title: 'Employee Custom Fields', icon: UserCog },
  { id: 'email', title: 'Email Settings', icon: Mail },
  { id: 'storage', title: 'Storage Settings', icon: HardDrive },
];

const AdminSettings = () => {
  const [activeSection, setActiveSection] = useState('hrm');

  const renderContent = () => {
    switch (activeSection) {
      case 'company': return <CompanySettingsPage />;
      case 'profile': return <ProfileSettings />;
      case 'change-password': return <ChangePassword />;
      case 'user-credentials': return <UserCredentials />;
      case 'translations': return <TranslationsSettings />;
      case 'roles': return <RolesPermissions />;
      case 'work-status': return <WorkStatusSettings />;
      case 'currencies': return <CurrenciesSettings />;
      case 'locations': return <LocationsSettings />;
      case 'pdf-fonts': return <PdfFontsSettings />;
      case 'hrm': return <HRMSettings />;
      case 'payroll': return <PayrollSettings />;
      case 'employee-id': return <EmployeeIDSettings />;
      case 'email': return <EmailSettingsPage />;
      case 'storage': return <StorageSettings />;
      default: return <HRMSettings />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage system configuration and preferences</p>
          </div>
        </div>

        {/* Settings Layout */}
        <div className="flex gap-6">
          {/* Left Menu */}
          <Card className="glass-card w-64 shrink-0 self-start sticky top-20">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {settingsMenu.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                        isActive
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>

          {/* Right Content */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
