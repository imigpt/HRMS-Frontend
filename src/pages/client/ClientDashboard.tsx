import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Bell, ArrowRight } from 'lucide-react';
import { clientAPI } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  personalChats: number;
  groupChats: number;
  unreadMessages: number;
}

const ClientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await clientAPI.getDashboard();
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load client dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Direct Chats',
      value: stats?.personalChats ?? 0,
      icon: MessageSquare,
      description: 'Active conversations with Admin / HR',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Group Chats',
      value: stats?.groupChats ?? 0,
      icon: Users,
      description: 'Groups you are a member of',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Unread Messages',
      value: stats?.unreadMessages ?? 0,
      icon: Bell,
      description: 'Messages waiting for your response',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 p-6">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {user?.name} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Your client communication portal. Chat with our team anytime.
          </p>
          <Button
            className="mt-4"
            onClick={() => navigate('/client/chat')}
          >
            Open Chat <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((card) => (
            <Card key={card.title} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`${card.bg} p-2 rounded-lg`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold">{card.value}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="glass-card border-primary/20">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">How to use this portal</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                  <li>You can message Admin or HR directly from the Chat section.</li>
                  <li>If you've been added to a group, you can chat with all group members.</li>
                  <li>Contact your Admin or HR if you need assistance.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;
