import api from './api';
import type { AuthResponse, User, ApiResponse } from '@/types/api';

// Authentication APIs
export const authAPI = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  logout: () => api.post('/auth/logout'),
  
  getMe: () => api.get<{ success: boolean; user: User }>('/auth/me'),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// Admin APIs
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getActivity: () => api.get('/admin/activity'),
  getCompanies: (params?: any) => api.get('/admin/companies', { params }),
  createCompany: (data: any) => api.post('/admin/companies', data),
  getHRAccounts: (params?: any) => api.get('/admin/hr-accounts', { params }),
  createHR: (data: any) => api.post('/auth/register', data),
  updateHR: (id: string, data: any) => api.put(`/users/${id}`, data),
  getHRDetail: (id: string) => api.get(`/admin/hr/${id}`),
  resetHRPassword: (hrId: string) => api.post(`/admin/hr/${hrId}/reset-password`),
  getEmployees: (params?: any) => api.get('/admin/employees', { params }),
  createEmployee: (data: any) => api.post('/auth/register', data),
  updateEmployee: (id: string, data: any) => api.put(`/users/${id}`, data),
  getEmployeeDetail: (id: string) => api.get(`/users/${id}`),
  getLeaves: (params?: any) => api.get('/admin/leaves', { params }),
  getTasks: (params?: any) => api.get('/admin/tasks', { params }),
};

// HR APIs
export const hrAPI = {
  getDashboard: () => api.get('/hr/dashboard'),
  getDepartmentStats: () => api.get('/hr/departments/stats'),
  getEmployees: (params?: any) => api.get('/hr/employees', { params }),
  createEmployee: (data: any) => api.post('/hr/employees', data),
  getEmployeeDetail: (id: string) => api.get(`/hr/employees/${id}`),
  updateEmployee: (id: string, data: any) => api.put(`/hr/employees/${id}`, data),
  deleteEmployee: (id: string) => api.delete(`/hr/employees/${id}`),
  getPendingLeaves: (params?: any) => api.get('/hr/leaves/pending', { params }),
  getPendingExpenses: (params?: any) => api.get('/hr/expenses/pending', { params }),
  getTodayAttendance: () => api.get('/hr/attendance/today'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/users/profile', data),
};

// Employee APIs
export const employeeAPI = {
  getDashboard: () => api.get('/employees/dashboard'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/employees/change-password', { currentPassword, newPassword }),
  getMyTasks: (params?: any) => api.get('/employees/tasks', { params }),
  getMyLeaves: (params?: any) => api.get('/employees/leaves', { params }),
  getMyExpenses: (params?: any) => api.get('/employees/expenses', { params }),
  getMyAttendance: (params?: any) => api.get('/employees/attendance', { params }),
  getLeaveBalance: () => api.get('/employees/leave-balance'),
  getTeam: () => api.get('/employees/team'),
};

// Leave APIs
export const leaveAPI = {
  getLeaves: (params?: any) => api.get('/leaves', { params }),
  createLeave: (data: any) => api.post('/leaves', data),
  getLeaveById: (id: string) => api.get(`/leaves/${id}`),
  approveLeave: (id: string, reviewNote?: string) => 
    api.put(`/leaves/${id}/approve`, { reviewNote }),
  rejectLeave: (id: string, reviewNote?: string) => 
    api.put(`/leaves/${id}/reject`, { reviewNote }),
  cancelLeave: (id: string) => api.put(`/leaves/${id}/cancel`),
  getBalance: () => api.get('/leaves/balance'),
  getStatistics: (params?: any) => api.get('/leaves/statistics', { params }),
};

// Leave Balance APIs
export const leaveBalanceAPI = {
  getAll: () => api.get('/leave-balance'),
  getByUser: (userId: string) => api.get(`/leave-balance/${userId}`),
  getMyBalance: () => api.get('/leave-balance/me'),
  assign: (userId: string, data: { paid: number; sick: number; unpaid: number }) =>
    api.put(`/leave-balance/${userId}`, data),
  bulkAssign: (data: { paid: number; sick: number; unpaid: number }) =>
    api.post('/leave-balance/bulk', data),
};

// Attendance APIs
export const attendanceAPI = {
  // Check in with optional photo (FormData for photo upload)
  checkIn: (location?: any, photoFile?: File) => {
    // If photo is provided, use FormData
    if (photoFile) {
      const formData = new FormData();
      formData.append('photo', photoFile);
      if (location) {
        formData.append('location', JSON.stringify(location));
      }
      return api.post('/attendance/check-in', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    // Otherwise, just send location as JSON
    return api.post('/attendance/check-in', { location });
  },
  checkOut: (location?: any) => api.post('/attendance/check-out', { location }),
  getToday: () => api.get('/attendance/today'),
  getMyAttendance: (params?: any) => api.get('/attendance/my-attendance', { params }),
  getAllAttendance: (params?: any) => api.get('/attendance', { params }),
  getSummary: (params?: any) => api.get('/attendance/summary', { params }),
  getEmployeeAttendance: (employeeId: string, params?: any) => 
    api.get(`/attendance/employee/${employeeId}`, { params }),
  getCompanySummary: (params?: any) => api.get('/attendance/company-summary', { params }),
  
  // Attendance Edit Requests
  createEditRequest: (data: {
    attendanceId: string;
    requestedCheckIn: string;
    requestedCheckOut: string;
    reason: string;
  }) => api.post('/attendance/edit-request', data),
  getMyEditRequests: () => api.get('/attendance/edit-requests'),
  getPendingEditRequests: () => api.get('/attendance/edit-requests/pending'),
  reviewEditRequest: (requestId: string, action: 'approved' | 'rejected', reviewNote?: string) =>
    api.put(`/attendance/edit-requests/${requestId}`, { action, reviewNote }),
};

// Task APIs
export const taskAPI = {
  getTasks: (params?: any) => api.get('/tasks', { params }),
  createTask: (data: any) => api.post('/tasks', data),
  getTaskById: (id: string) => api.get(`/tasks/${id}`),
  updateTask: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/tasks/${id}`),
  updateProgress: (id: string, progress: number) =>
    api.put(`/tasks/${id}/progress`, { progress }),
  getStatistics: (params?: any) => api.get('/tasks/statistics', { params }),
  addAttachment: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('attachment', file);
    return api.post(`/tasks/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Expense APIs
export const expenseAPI = {
  getExpenses: (params?: any) => api.get('/expenses', { params }),
  createExpense: (data: any) => api.post('/expenses', data),
  getExpenseById: (id: string) => api.get(`/expenses/${id}`),
  updateExpense: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id: string) => api.delete(`/expenses/${id}`),
  approveExpense: (id: string) => api.put(`/expenses/${id}/approve`),
  rejectExpense: (id: string, reason?: string) =>
    api.put(`/expenses/${id}/reject`, { reason }),
  getStatistics: (params?: any) => api.get('/expenses/statistics', { params }),
};

// Chat APIs - Complete WhatsApp-like functionality
export const chatAPI = {
  // Chat Rooms
  getRooms: () => api.get('/chat/rooms'),
  getOrCreatePersonalChat: (userId: string) => 
    api.post('/chat/rooms/personal', { userId }),
  getRoomMessages: (roomId: string, params?: { limit?: number; before?: string }) => 
    api.get(`/chat/rooms/${roomId}/messages`, { params }),
  sendRoomMessage: (roomId: string, content: string, messageType = 'text', replyTo?: string) =>
    api.post(`/chat/rooms/${roomId}/messages`, { content, messageType, replyTo }),
  markRoomAsRead: (roomId: string) => 
    api.put(`/chat/rooms/${roomId}/read`),
  
  // Media Upload
  uploadMedia: (roomId: string, file: File, caption?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    return api.post(`/chat/rooms/${roomId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Groups
  createGroup: (name: string, members: string[], description?: string) =>
    api.post('/chat/groups', { name, members, description }),
  getGroupDetails: (groupId: string) => 
    api.get(`/chat/groups/${groupId}`),
  updateGroup: (groupId: string, data: { name?: string; description?: string }) =>
    api.put(`/chat/groups/${groupId}`, data),
  deleteGroup: (groupId: string) => 
    api.delete(`/chat/groups/${groupId}`),
  addGroupMembers: (groupId: string, memberIds: string[]) =>
    api.post(`/chat/groups/${groupId}/members`, { memberIds }),
  removeGroupMember: (groupId: string, memberId: string) =>
    api.delete(`/chat/groups/${groupId}/members/${memberId}`),
  leaveGroup: (groupId: string) => 
    api.post(`/chat/groups/${groupId}/leave`),
  getGroupMessages: (groupId: string, params?: { limit?: number; before?: string }) =>
    api.get(`/chat/groups/${groupId}/messages`, { params }),
  
  // Users
  getCompanyUsers: () => api.get('/chat/users'),
  searchUsers: (query: string) => 
    api.get('/chat/users/search', { params: { q: query } }),
  
  // Messages
  deleteMessage: (messageId: string) => 
    api.delete(`/chat/messages/${messageId}`),
  getUnreadCount: () => api.get('/chat/unread'),
  
  // Legacy API (backward compatibility)
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (userId: string, params?: { limit?: number; before?: string }) => 
    api.get(`/chat/messages/${userId}`, { params }),
  sendMessage: (receiver: string, content: string, isGroupMessage = false, groupId?: string) =>
    api.post('/chat/send', { receiver, content, isGroupMessage, groupId }),
  markAsRead: (userId: string) => api.put(`/chat/read/${userId}`),
};

// Client APIs (Admin/HR manage clients)
export const clientAPI = {
  getClients: (params?: any) => api.get('/clients', { params }),
  createClient: (data: any) => {
    // Use FormData if profilePhoto is included
    if (data.profilePhoto instanceof File) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value as any);
        }
      });
      return api.post('/clients', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/clients', data);
  },
  getClientById: (id: string) => api.get(`/clients/${id}`),
  updateClient: (id: string, data: any) => api.put(`/clients/${id}`, data),
  deleteClient: (id: string) => api.delete(`/clients/${id}`),
  getDashboard: () => api.get('/clients/dashboard'),
};

// Company APIs
export const companyAPI = {
  getCompanies: (params?: any) => api.get('/companies', { params }),
  createCompany: (data: any) => api.post('/companies', data),
  getCompanyById: (id: string) => api.get(`/companies/${id}`),
  updateCompany: (id: string, data: any) => api.put(`/companies/${id}`, data),
  deleteCompany: (id: string) => api.delete(`/companies/${id}`),
  updateStatus: (id: string, status: 'active' | 'inactive') =>
    api.put(`/companies/${id}/status`, { status }),
  getStats: (id: string) => api.get(`/companies/${id}/stats`),
};

// Announcement APIs
export const announcementAPI = {
  getAnnouncements: (params?: any) => api.get('/announcements', { params }),
  createAnnouncement: (data: any) => api.post('/announcements', data),
  getAnnouncementById: (id: string) => api.get(`/announcements/${id}`),
  updateAnnouncement: (id: string, data: any) => api.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => api.delete(`/announcements/${id}`),
  markAsRead: (id: string) => api.put(`/announcements/${id}/read`),
  getUnreadCount: () => api.get('/announcements/unread/count'),
};

// User APIs
export const userAPI = {
  getUsers: (params?: any) => api.get('/user', { params }),
  getUserById: (id: string) => api.get(`/user/${id}`),
  updateUser: (id: string, data: any) => api.put(`/user/${id}`, data),
  deleteUser: (id: string) => api.delete(`/user/${id}`),
};

// Export all APIs
export default {
  auth: authAPI,
  admin: adminAPI,
  hr: hrAPI,
  employee: employeeAPI,
  leave: leaveAPI,
  leaveBalance: leaveBalanceAPI,
  attendance: attendanceAPI,
  task: taskAPI,
  expense: expenseAPI,
  chat: chatAPI,
  company: companyAPI,
  announcement: announcementAPI,
  user: userAPI,
};
