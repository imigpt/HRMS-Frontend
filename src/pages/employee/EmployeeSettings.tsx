import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { User, Lock, LucideIcon } from 'lucide-react';

import ProfileSettings from '@/components/settings/ProfileSettings';
import ChangePassword from '@/components/settings/ChangePassword';

interface SettingsMenuItem {
  id: string;
  title: string;
  icon: LucideIcon;
}

const employeeSettingsMenu: SettingsMenuItem[] = [
  { id: 'profile', title: 'Profile', icon: User },
  { id: 'change-password', title: 'Change Password', icon: Lock },
];

const EmployeeSettings = () => {
  const [activeSection, setActiveSection] = useState('profile');

  const renderContent = () => {
    switch (activeSection) {
      case 'profile': return <ProfileSettings />;
      case 'change-password': return <ChangePassword />;
      default: return <ProfileSettings />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
          </div>
        </div>

        <div className="flex gap-6">
          <Card className="glass-card w-64 shrink-0 self-start sticky top-20">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {employeeSettingsMenu.map((item) => {
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

          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeSettings;
