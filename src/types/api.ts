// API Response Types

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'hr' | 'employee' | 'client';
  company?: Company | string;
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string;
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

export interface Task {
  _id: string;
  title: string;
  description?: string;
  assignedTo: User | string;
  assignedBy: User | string;
  company: Company | string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'completed';
  progress?: number;
  createdAt?: string;
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
