// API Response Types

export interface User {
  _id: string;
  name: string;
  email: string;
  employeeId?: string;
  role: 'admin' | 'hr' | 'employee' | 'client';
  company?: Company | string;
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string;
  profilePhoto?: { url: string; publicId: string };
  companyName?: string; // For clients - their external company name
  clientNotes?: string; // Notes about the client
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  _id: string;
  name: string;
  industry?: string;
  address?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Leave {
  _id: string;
  employee: User | string;
  company: Company | string;
  leaveType: 'sick' | 'casual' | 'annual' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
}

// ── Enterprise Task Management Types ──

export interface Project {
  _id: string;
  name: string;
  description?: string;
  company: Company | string;
  department?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  owner: User | string;
  members: { user: User | string; role: string; addedAt: string }[];
  tags: string[];
  color?: string;
  createdBy: User | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Milestone {
  _id: string;
  title: string;
  description?: string;
  project: Project | string;
  company: Company | string;
  status: 'pending' | 'in-progress' | 'completed';
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  progress: number;
  createdBy: User | string;
  createdAt?: string;
}

export interface TaskComment {
  _id?: string;
  user: User | string;
  content: string;
  mentions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskAttachment {
  _id?: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'api';
  url: string;
  publicId?: string;
  size?: number;
  uploadedBy: User | string;
  createdAt?: string;
}

export interface TaskActivity {
  _id?: string;
  user: User | string;
  action: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
  createdAt?: string;
}

export interface TaskReview {
  comment: string;
  rating?: number;
  reviewedBy?: User | string;
  reviewedAt?: string;
}

export type TaskStatus = 'draft' | 'pending-approval' | 'assigned' | 'in-progress' | 'under-review' | 'completed' | 'closed' | 'rejected';

export interface WorkflowHistoryEntry {
  _id?: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  performedBy: User | string;
  performedByRole?: string;
  comment?: string;
  timestamp?: string;
}

export interface WorkflowTransition {
  action: string;
  label: string;
  toStatus: string | null;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  project?: Project | string;
  milestone?: Milestone | string;
  parentTask?: Task | string;
  assignedTo: User | string;
  assignedBy: User | string;
  company: Company | string;
  department?: string;
  dueDate?: string;
  startDate?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: TaskStatus;
  progress: number;
  tags: string[];
  estimatedTime?: number;
  actualTime?: number;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  activityLog: TaskActivity[];
  review?: TaskReview;
  childTasks?: Task[];
  // Workflow fields
  workflowHistory?: WorkflowHistoryEntry[];
  approvedBy?: User | string;
  reviewedBy?: User | string;
  submittedAt?: string;
  approvedAt?: string;
  assignedAt?: string;
  workStartedAt?: string;
  reviewSubmittedAt?: string;
  reviewCompletedAt?: string;
  closedAt?: string;
  rejectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeLog {
  _id: string;
  task: Task | string;
  user: User | string;
  company: Company | string;
  description?: string;
  duration: number;
  date: string;
  startTime?: string;
  endTime?: string;
  isRunning: boolean;
  logType: 'manual' | 'timer';
  createdAt?: string;
}

export interface TaskDependency {
  _id: string;
  task: Task | string;
  dependsOn: Task | string;
  type: 'finish-to-start' | 'start-to-start';
  company: Company | string;
  createdBy: User | string;
}

export interface ProductivityScore {
  _id: string;
  user: User | string;
  company: Company | string;
  period: 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  scores: {
    completionRate: number;
    onTimeDelivery: number;
    timeEfficiency: number;
    qualityScore: number;
  };
  overallScore: number;
  stats: {
    tasksAssigned: number;
    tasksCompleted: number;
    tasksOverdue: number;
    totalEstimatedMinutes: number;
    totalActualMinutes: number;
  };
}

export interface Expense {
  _id: string;
  employee: User | string;
  company: Company | string;
  amount: number;
  category: string;
  description: string;
  date: string;
  receipt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt?: string;
}

export interface Attendance {
  _id: string;
  employee: User | string;
  company: Company | string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'on-leave';
  workHours?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

// Chat Types
export interface ChatRoom {
  _id: string;
  name?: string;
  type: 'personal' | 'group';
  participants: User[];
  admins?: User[];
  company: Company | string;
  createdBy?: User | string;
  lastMessage?: {
    content: string;
    sender: User | string;
    messageType: 'text' | 'image' | 'document' | 'voice';
    createdAt: string;
  };
  avatar?: {
    url: string;
    publicId: string;
  };
  description?: string;
  isActive: boolean;
  settings?: {
    onlyAdminsCanMessage: boolean;
    isMuted: boolean;
  };
  unreadCount?: number;
  otherUser?: User; // For personal chats
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  chatRoom: ChatRoom | string;
  sender: User | string;
  receiver?: User | string;
  company?: Company | string;
  content: string;
  messageType: 'text' | 'image' | 'document' | 'voice';
  attachment?: {
    url: string;
    publicId: string;
    name: string;
    size: number;
    mimeType: string;
    duration?: number; // For voice messages
  };
  isGroupMessage: boolean;
  groupId?: string;
  isRead: boolean;
  readAt?: string;
  readBy?: { user: User | string; readAt: string }[];
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyTo?: Message | string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface OnlineUser {
  userId: string;
  userName: string;
  role?: string;
}

export interface TypingUser {
  userId: string;
  userName: string;
  roomId: string;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: 'general' | 'urgent' | 'holiday';
  author: User | string;
  company?: Company | string;
  createdAt: string;
}
