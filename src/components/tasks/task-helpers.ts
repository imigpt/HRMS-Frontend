// Shared task helper utilities - color mappings, formatters, etc.

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical': return 'bg-red-600 text-white';
    case 'high': return 'status-rejected';
    case 'medium': return 'status-pending';
    case 'low': return 'status-approved';
    default: return 'bg-muted';
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    case 'pending-approval': return 'status-pending';
    case 'assigned': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'in-progress': return 'status-in-progress';
    case 'under-review': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'completed': return 'status-approved';
    case 'closed': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    case 'rejected': return 'status-rejected';
    default: return 'bg-muted';
  }
};

export const getProjectStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'status-approved';
    case 'planning': return 'status-pending';
    case 'on-hold': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'completed': return 'status-in-progress';
    case 'cancelled': return 'status-rejected';
    default: return 'bg-muted';
  }
};

export const formatDate = (date?: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
};

export const formatDuration = (minutes?: number) => {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

export const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

export const getUserName = (user: any): string => {
  if (!user) return 'Unknown';
  if (typeof user === 'string') return user;
  return user.name || 'Unknown';
};

export const getUserId = (user: any): string => {
  if (!user) return '';
  if (typeof user === 'string') return user;
  return user._id || '';
};

export const statusLabels: Record<string, string> = {
  'draft': 'Draft',
  'pending-approval': 'Pending Approval',
  'assigned': 'Assigned',
  'in-progress': 'In Progress',
  'under-review': 'Under Review',
  'completed': 'Completed',
  'closed': 'Closed',
  'rejected': 'Rejected',
};

export const priorityLabels: Record<string, string> = {
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'critical': 'Critical',
};

export const isOverdue = (dueDate?: string, status?: string) => {
  if (!dueDate || status === 'completed' || status === 'closed' || status === 'rejected') return false;
  return new Date(dueDate) < new Date();
};
