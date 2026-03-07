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
  
  resetPassword: (email: string, resetToken: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, resetToken, newPassword }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),

  adminResetPassword: (userId: string, newPassword?: string) =>
    api.put(`/auth/admin-reset-password/${userId}`, { newPassword }),

  generatePassword: () => api.get('/auth/generate-password'),

  getUserCredentials: (params?: any) =>
    api.get('/auth/user-credentials', { params }),
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
  submitHalfDay: (data: { leaveType: string; date: string; session: string; reason: string }) =>
    api.post('/leaves/half-day', data),
  getLeaveById: (id: string) => api.get(`/leaves/${id}`),
  approveLeave: (id: string, reviewNote?: string) => 
    api.put(`/leaves/${id}/approve`, { reviewNote }),
  rejectLeave: (id: string, reviewNote?: string) => 
    api.put(`/leaves/${id}/reject`, { reviewNote }),
  cancelLeave: (id: string) => api.put(`/leaves/${id}/cancel`),
  getBalance: () => api.get('/leaves/balance'),
  getStatistics: (params?: any) => api.get('/leaves/statistics', { params }),
};

// Leave Balance APIs (Admin-controlled)
export const leaveBalanceAPI = {
  getAll: (params?: any) => api.get('/leave-balance', { params }),
  getByUser: (userId: string) => api.get(`/leave-balance/${userId}`),
  getMyBalance: () => api.get('/leave-balance/me'),
  assign: (userId: string, data: { paid?: number; sick?: number; unpaid?: number }) =>
    api.put(`/leave-balance/${userId}`, data),
  bulkAssign: (data: { userIds: string[]; paid: number; sick: number; unpaid: number }) =>
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
      return api.post('/attendance/check-in', formData);
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

  // Half Day Request
  requestHalfDay: (data: { date: string; reason: string }) =>
    api.post('/attendance/half-day-request', data),

  // Re-submit selfie for re-verification after a failed check-in face verification
  resubmitSelfie: (photoFile: File) => {
    const formData = new FormData();
    formData.append('photo', photoFile);
    return api.post<{ success: boolean; similarityScore: number; matched: boolean; message: string }>(
      '/attendance/resend-selfie', formData
    );
  },
};

// Task APIs – Enterprise Task Management System
export const taskAPI = {
  // Tasks
  getTasks: (params?: any) => api.get('/tasks', { params }),
  getMyTasks: (params?: any) => api.get('/tasks/my', { params }),
  getTeamTasks: (params?: any) => api.get('/tasks/team', { params }),
  getAllTasks: (params?: any) => api.get('/tasks/all', { params }),
  createTask: (data: any) => api.post('/tasks', data),
  getTaskById: (id: string) => api.get(`/tasks/${id}`),
  updateTask: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/tasks/${id}`),
  updateProgress: (id: string, progress: number) =>
    api.put(`/tasks/${id}/progress`, { progress }),

  // Projects
  getProjects: (params?: any) => api.get('/tasks/projects', { params }),
  createProject: (data: any) => api.post('/tasks/projects', data),
  getProjectById: (id: string) => api.get(`/tasks/projects/${id}`),
  updateProject: (id: string, data: any) => api.put(`/tasks/projects/${id}`, data),
  deleteProject: (id: string) => api.delete(`/tasks/projects/${id}`),

  // Milestones
  getMilestones: (projectId: string) => api.get(`/tasks/milestones/project/${projectId}`),
  createMilestone: (data: any) => api.post('/tasks/milestones', data),
  updateMilestone: (id: string, data: any) => api.put(`/tasks/milestones/${id}`, data),
  deleteMilestone: (id: string) => api.delete(`/tasks/milestones/${id}`),

  // Comments
  addComment: (taskId: string, data: { content: string; mentions?: string[] }) =>
    api.post(`/tasks/${taskId}/comments`, data),

  // Attachments
  addAttachment: (id: string, file: File, fileType: string) => {
    const formData = new FormData();
    formData.append('attachment', file);
    formData.append('fileType', fileType);
    return api.post(`/tasks/${id}/attachments`, formData);
  },
  deleteAttachment: (taskId: string, attachmentId: string) =>
    api.delete(`/tasks/${taskId}/attachments/${attachmentId}`),

  // Review
  addReview: (id: string, data: { comment: string; rating?: number }) =>
    api.put(`/tasks/${id}/review`, data),

  // Workflow Transitions
  transitionTask: (id: string, data: { action: string; comment?: string; overrideStatus?: string }) =>
    api.put(`/tasks/${id}/transition`, data),
  getAvailableTransitions: (id: string) =>
    api.get(`/tasks/${id}/transitions`),

  // Dependencies
  addDependency: (taskId: string, data: { dependsOnId: string; type?: string }) =>
    api.post(`/tasks/${taskId}/dependencies`, data),
  removeDependency: (depId: string) =>
    api.delete(`/tasks/dependencies/${depId}`),
  getTaskDependencies: (taskId: string) =>
    api.get(`/tasks/${taskId}/dependencies`),

  // Time Tracking
  logTime: (data: { taskId: string; duration: number; description?: string; date?: string }) =>
    api.post('/tasks/timelog', data),
  getTimeLogs: (params?: any) => api.get('/tasks/timelog', { params }),
  startTimer: (taskId: string) => api.post('/tasks/timer/start', { taskId }),
  stopTimer: (logId: string) => api.put(`/tasks/timer/stop/${logId}`),
  getRunningTimer: () => api.get('/tasks/timer/running'),

  // Analytics
  getStatistics: (params?: any) => api.get('/tasks/statistics', { params }),
  getProductivityAnalytics: (params?: any) => api.get('/tasks/analytics/productivity', { params }),
  getWorkloadDistribution: (params?: any) => api.get('/tasks/analytics/workload', { params }),
};

// ─── Workflow Template APIs ────────────────────────────────────────────────
export const workflowAPI = {
  // Template CRUD
  getTemplates: ()                       => api.get('/workflow-templates'),
  getTemplateById: (id: string)          => api.get(`/workflow-templates/${id}`),
  createTemplate: (data: any)            => api.post('/workflow-templates', data),
  updateTemplate: (id: string, data: any) => api.put(`/workflow-templates/${id}`, data),
  deleteTemplate: (id: string)           => api.delete(`/workflow-templates/${id}`),
  duplicateTemplate: (id: string)        => api.post(`/workflow-templates/${id}/duplicate`),

  // Task workflow operations
  assignToTask: (taskId: string, data: { templateId?: string; workflowName: string; steps?: any[] }) =>
    api.put(`/workflow-templates/task/${taskId}/assign`, data),
  completeStep: (taskId: string, stepIndex: number, comment?: string) =>
    api.put(`/workflow-templates/task/${taskId}/step/${stepIndex}/complete`, { comment }),
  removeFromTask: (taskId: string) =>
    api.delete(`/workflow-templates/task/${taskId}/workflow`),
};

// Expense APIs
export const expenseAPI = {
  getExpenses: (params?: any) => api.get('/expenses', { params }),
  createExpense: (data: any) => api.post('/expenses', data),
  getExpenseById: (id: string) => api.get(`/expenses/${id}`),
  updateExpense: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id: string) => api.delete(`/expenses/${id}`),
  approveExpense: (id: string) => api.put(`/expenses/${id}/approve`),
  rejectExpense: (id: string, reviewNote?: string) =>
    api.put(`/expenses/${id}/reject`, { reviewNote }),
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
    return api.post(`/chat/rooms/${roomId}/upload`, formData);
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
      return api.post('/clients', formData);
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

// Policy APIs
export const policyAPI = {
  getPolicies: (params?: any) => api.get('/policies', { params }),
  getPolicyById: (id: string) => api.get(`/policies/${id}`),
  createPolicy: (data: FormData) =>
    api.post('/policies', data),
  deletePolicy: (id: string) => api.delete(`/policies/${id}`),
  // Fetches file as blob so JWT auth header is included automatically
  downloadFile: (id: string) =>
    api.get(`/policies/${id}/download`, { responseType: 'blob' }),
};

// Payroll APIs
export const payrollAPI = {
  // Employee Salaries
  getSalaries: (params?: any) => api.get('/payroll/salaries', { params }),
  getMySalary: () => api.get('/payroll/salaries/me'),
  getSalaryById: (id: string) => api.get(`/payroll/salaries/${id}`),
  createSalary: (data: any) => api.post('/payroll/salaries', data),
  updateSalary: (id: string, data: any) => api.put(`/payroll/salaries/${id}`, data),
  deleteSalary: (id: string) => api.delete(`/payroll/salaries/${id}`),

  // Pre-Payments
  getPrePayments: (params?: any) => api.get('/payroll/pre-payments', { params }),
  getPrePaymentById: (id: string) => api.get(`/payroll/pre-payments/${id}`),
  createPrePayment: (data: any) => api.post('/payroll/pre-payments', data),
  updatePrePayment: (id: string, data: any) => api.put(`/payroll/pre-payments/${id}`, data),
  deletePrePayment: (id: string) => api.delete(`/payroll/pre-payments/${id}`),

  // Increment/Promotion
  getIncrements: (params?: any) => api.get('/payroll/increments', { params }),
  getIncrementById: (id: string) => api.get(`/payroll/increments/${id}`),
  createIncrement: (data: any) => api.post('/payroll/increments', data),
  updateIncrement: (id: string, data: any) => api.put(`/payroll/increments/${id}`, data),
  deleteIncrement: (id: string) => api.delete(`/payroll/increments/${id}`),

  // Payroll
  getPayrolls: (params?: any) => api.get('/payroll', { params }),
  getMyPayrolls: (params?: any) => api.get('/payroll/my-payrolls', { params }),
  getPayrollById: (id: string) => api.get(`/payroll/${id}`),
  generatePayroll: (data: any) => api.post('/payroll/generate', data),
  updatePayroll: (id: string, data: any) => api.put(`/payroll/${id}`, data),
  deletePayroll: (id: string) => api.delete(`/payroll/${id}`),
};

// Notification APIs
export const notificationsAPI = {
  // FCM token management
  saveToken: (data: { token: string; device?: string }) =>
    api.post('/notifications/save-token', data),
  removeToken: (data: { token: string }) =>
    api.delete('/notifications/remove-token', { data }),

  // Notification queries
  getNotifications: (userId: string) => api.get(`/notifications/${userId}`),
  getUnreadCount: (userId: string) => api.get(`/notifications/unread-count/${userId}`),
  markAsRead: (id: string) => api.put(`/notifications/read/${id}`),
  markAllAsRead: (userId: string) => api.put(`/notifications/read-all/${userId}`),

  // Admin/HR: send push notification
  send: (data: { userId: string; title: string; body: string; data?: Record<string, string> }) =>
    api.post('/notifications/send', data),
};

// User APIs
export const userAPI = {
  getUsers: (params?: any) => api.get('/user', { params }),
  getUserById: (id: string) => api.get(`/user/${id}`),
  updateUser: (id: string, data: any) => api.put(`/user/${id}`, data),
  deleteUser: (id: string) => api.delete(`/user/${id}`),
};

// Settings APIs (Admin only)
export const settingsAPI = {
  // System settings
  getAll: (params?: any) => api.get('/settings', { params }),
  updateSetting: (data: { key: string; value: any; category: string; description?: string }) =>
    api.put('/settings/update', data),
  updateCategory: (category: string, settings: Record<string, any>) =>
    api.put(`/settings/category/${category}`, { settings }),

  // HRM Settings
  getHRM: () => api.get('/settings/hrm'),
  updateHRM: (data: any) => api.put('/settings/hrm', data),

  // Company Settings
  getCompany: () => api.get('/settings/company'),
  updateCompany: (data: any) => api.put('/settings/company', data),

  // Employee ID Config
  getEmployeeIDConfig: () => api.get('/settings/employee-id'),
  updateEmployeeIDConfig: (data: any) => api.put('/settings/employee-id', data),
  assignEmployeeID: (data: { userId: string; customId?: string }) =>
    api.post('/settings/employee-id/assign', data),
  getEmployeeID: (userId: string) => api.get(`/settings/employee-id/${userId}`),

  // Permission Modules
  getPermissionModules: () => api.get('/settings/modules'),
  createPermissionModule: (data: { name: string; label: string; description?: string }) =>
    api.post('/settings/modules', data),
  seedPermissionModules: () => api.post('/settings/modules/seed'),
  updatePermissionModule: (id: string, data: any) => api.put(`/settings/modules/${id}`, data),
  deletePermissionModule: (id: string) => api.delete(`/settings/modules/${id}`),

  // Roles & Permissions
  getMyPermissions: () => api.get('/settings/roles/my-permissions'),
  getRoles: () => api.get('/settings/roles'),
  createRole: (data: any) => api.post('/settings/roles', data),
  seedRoles: () => api.post('/settings/roles/seed'),
  updateRole: (id: string, data: any) => api.put(`/settings/roles/${id}`, data),
  deleteRole: (id: string, body?: { force?: boolean; confirmRoleName?: string; reassignUsersTo?: string }) =>
    api.delete(`/settings/roles/${id}`, body ? { data: body } : undefined),
  getRolePermissions: (id: string) => api.get(`/settings/roles/${id}/permissions`),
  assignPermissions: (id: string, permissions: any[]) =>
    api.put(`/settings/roles/${id}/permissions`, { permissions }),

  // Email Settings
  getEmail: () => api.get('/settings/email'),
  updateEmail: (data: any) => api.put('/settings/email', data),
  sendTestEmail: (to: string) => api.post('/settings/email/test', { to }),
  sendBulkEmail: (data: { recipients?: string[]; subject: string; body: string; targetRole?: string }) =>
    api.post('/settings/email/send', data),
  getEmailLogs: (params?: any) => api.get('/settings/email/logs', { params }),

  // Email Templates
  getEmailTemplates: (params?: any) => api.get('/settings/email/templates', { params }),
  getEmailTemplate: (id: string) => api.get(`/settings/email/templates/${id}`),
  createEmailTemplate: (data: any) => api.post('/settings/email/templates', data),
  updateEmailTemplate: (id: string, data: any) => api.put(`/settings/email/templates/${id}`, data),
  deleteEmailTemplate: (id: string) => api.delete(`/settings/email/templates/${id}`),
  seedEmailTemplates: () => api.post('/settings/email/templates/seed'),
  sendFromTemplate: (id: string, data: { recipients: string[]; customVariables?: Record<string, string> }) =>
    api.post(`/settings/email/templates/${id}/send`, data),

  // Storage Settings
  getStorage: () => api.get('/settings/storage'),
  updateStorage: (data: any) => api.put('/settings/storage', data),

  // Localization
  getLocalization: () => api.get('/settings/localization'),
  updateLocalization: (data: any) => api.put('/settings/localization', data),

  // Payroll Settings
  getPayroll: () => api.get('/settings/payroll'),
  updatePayroll: (data: any) => api.put('/settings/payroll', data),

  // Work Status
  getWorkStatus: () => api.get('/settings/work-status'),
  updateWorkStatus: (statuses: string[]) => api.put('/settings/work-status', { statuses }),
};

// Export all APIs
export default {
  auth: authAPI,
  admin: adminAPI,
  hr: hrAPI,
  employee: employeeAPI,
  leave: leaveAPI,
  attendance: attendanceAPI,
  task: taskAPI,
  expense: expenseAPI,
  chat: chatAPI,
  company: companyAPI,
  announcement: announcementAPI,
  user: userAPI,
  policy: policyAPI,
  payroll: payrollAPI,
  settings: settingsAPI,
  notifications: notificationsAPI,
};
