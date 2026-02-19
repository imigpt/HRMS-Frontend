import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import NotificationsPage from "./pages/NotificationsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminHRAccounts from "./pages/admin/AdminHRAccounts";
import AdminEmployees from "./pages/admin/AdminEmployees";
import AdminLeaves from "./pages/admin/AdminLeaves";
import AdminLeaveManagement from "./pages/admin/AdminLeaveManagement";
import AdminTasks from "./pages/admin/AdminTasks";
import HRDetail from "./pages/admin/HRDetail";import AdminClients from './pages/admin/AdminClients';import HRDashboard from "./pages/hr/HRDashboard";
import HREmployees from "./pages/hr/HREmployees";
import HRProfile from "./pages/hr/HRProfile";
import HRTasks from "./pages/hr/HRTasks";
import HRAttendanceRequests from "./pages/hr/HRAttendanceRequests";
import HRAttendance from "./pages/hr/HRAttendance";import HRClients from './pages/hr/HRClients';import EmployeeDetail from "./pages/hr/EmployeeDetail";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeProfile from "./pages/employee/EmployeeProfile";
import EmployeeAttendance from "./pages/employee/EmployeeAttendance";
import EmployeeTasks from "./pages/employee/EmployeeTasks";
import CompanyPolicies from './pages/CompanyPolicies';
import ClientDashboard from './pages/client/ClientDashboard';
// Modules
import ChatModule from "./components/modules/ChatModule";
import AttendanceModule from "./components/modules/AttendanceModule";
import LeaveModule from "./components/modules/LeaveModule";
import TasksModule from "./components/modules/TasksModule";
import ExpensesModule from "./components/modules/ExpensesModule";
import AnnouncementsModule from "./components/modules/AnnouncementsModule";
import CalendarModule from "./components/modules/CalendarModule";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth Routes */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />

            {/* Admin Routes - Protected */}
            <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/companies" element={<ProtectedRoute allowedRole="admin"><AdminCompanies /></ProtectedRoute>} />
            <Route path="/admin/hr-accounts" element={<ProtectedRoute allowedRole="admin"><AdminHRAccounts /></ProtectedRoute>} />
            <Route path="/admin/hr-accounts/:hrId" element={<ProtectedRoute allowedRole="admin"><HRDetail /></ProtectedRoute>} />
            <Route path="/admin/employees" element={<ProtectedRoute allowedRole="admin"><AdminEmployees /></ProtectedRoute>} />
            <Route path="/admin/employees/:employeeId" element={<ProtectedRoute allowedRole="admin"><EmployeeDetail /></ProtectedRoute>} />
            <Route path="/admin/leaves" element={<ProtectedRoute allowedRole="admin"><AdminLeaves /></ProtectedRoute>} />
            <Route path="/admin/leave-management" element={<ProtectedRoute allowedRole="admin"><AdminLeaveManagement /></ProtectedRoute>} />
            <Route path="/admin/tasks" element={<ProtectedRoute allowedRole="admin"><AdminTasks /></ProtectedRoute>} />
            <Route path="/admin/clients" element={<ProtectedRoute allowedRole="admin"><AdminClients /></ProtectedRoute>} />
            <Route path="/admin/chat" element={<ProtectedRoute allowedRole="admin"><ChatModule role="admin" /></ProtectedRoute>} />
            <Route path="/admin/attendance" element={<ProtectedRoute allowedRole="admin"><AttendanceModule role="admin" /></ProtectedRoute>} />
            <Route path="/admin/attendance-requests" element={<ProtectedRoute allowedRole="admin"><HRAttendanceRequests /></ProtectedRoute>} />
            <Route path="/admin/expenses" element={<ProtectedRoute allowedRole="admin"><ExpensesModule role="admin" /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute allowedRole="admin"><AnnouncementsModule role="admin" /></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute allowedRole="admin"><NotificationsPage /></ProtectedRoute>} />
            <Route path="/admin/policies" element={<ProtectedRoute allowedRole="admin"><CompanyPolicies /></ProtectedRoute>} />
            <Route path="/admin/*" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />

            {/* HR Routes - Protected */}
            <Route path="/hr" element={<ProtectedRoute allowedRole="hr"><HRDashboard /></ProtectedRoute>} />
            <Route path="/hr/profile" element={<ProtectedRoute allowedRole="hr"><HRProfile /></ProtectedRoute>} />
            <Route path="/hr/employees" element={<ProtectedRoute allowedRole="hr"><HREmployees /></ProtectedRoute>} />
            <Route path="/hr/employees/:employeeId" element={<ProtectedRoute allowedRole="hr"><EmployeeDetail /></ProtectedRoute>} />
            <Route path="/hr/chat" element={<ProtectedRoute allowedRole="hr"><ChatModule role="hr" /></ProtectedRoute>} />
            <Route path="/hr/my-attendance" element={<ProtectedRoute allowedRole="hr"><HRAttendance /></ProtectedRoute>} />
            <Route path="/hr/attendance" element={<ProtectedRoute allowedRole="hr"><AttendanceModule role="hr" /></ProtectedRoute>} />
            <Route path="/hr/attendance-requests" element={<ProtectedRoute allowedRole="hr"><HRAttendanceRequests /></ProtectedRoute>} />
            <Route path="/hr/leaves" element={<ProtectedRoute allowedRole="hr"><LeaveModule role="hr" /></ProtectedRoute>} />
            <Route path="/hr/tasks" element={<ProtectedRoute allowedRole="hr"><HRTasks /></ProtectedRoute>} />
            <Route path="/hr/clients" element={<ProtectedRoute allowedRole="hr"><HRClients /></ProtectedRoute>} />
            <Route path="/hr/expenses" element={<ProtectedRoute allowedRole="hr"><ExpensesModule role="hr" /></ProtectedRoute>} />
            <Route path="/hr/announcements" element={<ProtectedRoute allowedRole="hr"><AnnouncementsModule role="hr" /></ProtectedRoute>} />
            <Route path="/hr/notifications" element={<ProtectedRoute allowedRole="hr"><NotificationsPage /></ProtectedRoute>} />
            <Route path="/hr/policies" element={<ProtectedRoute allowedRole="hr"><CompanyPolicies /></ProtectedRoute>} />
            <Route path="/hr/*" element={<ProtectedRoute allowedRole="hr"><HRDashboard /></ProtectedRoute>} />

            {/* Employee Routes - Protected */}
            <Route path="/employee" element={<ProtectedRoute allowedRole="employee"><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="/employee/profile" element={<ProtectedRoute allowedRole="employee"><EmployeeProfile /></ProtectedRoute>} />
            <Route path="/employee/chat" element={<ProtectedRoute allowedRole="employee"><ChatModule role="employee" /></ProtectedRoute>} />
            <Route path="/employee/attendance" element={<ProtectedRoute allowedRole="employee"><EmployeeAttendance /></ProtectedRoute>} />
            <Route path="/employee/calendar" element={<ProtectedRoute allowedRole="employee"><CalendarModule role="employee" /></ProtectedRoute>} />
            <Route path="/employee/leave" element={<ProtectedRoute allowedRole="employee"><LeaveModule role="employee" /></ProtectedRoute>} />
            <Route path="/employee/tasks" element={<ProtectedRoute allowedRole="employee"><EmployeeTasks /></ProtectedRoute>} />
            <Route path="/employee/expenses" element={<ProtectedRoute allowedRole="employee"><ExpensesModule role="employee" /></ProtectedRoute>} />
            <Route path="/employee/announcements" element={<ProtectedRoute allowedRole="employee"><AnnouncementsModule role="employee" /></ProtectedRoute>} />
            <Route path="/employee/notifications" element={<ProtectedRoute allowedRole="employee"><NotificationsPage /></ProtectedRoute>} />
            <Route path="/employee/policies" element={<ProtectedRoute allowedRole="employee"><CompanyPolicies /></ProtectedRoute>} />
            <Route path="/employee/*" element={<ProtectedRoute allowedRole="employee"><EmployeeDashboard /></ProtectedRoute>} />

            {/* Client Routes - Protected */}
            <Route path="/client" element={<ProtectedRoute allowedRole="client"><ClientDashboard /></ProtectedRoute>} />
            <Route path="/client/chat" element={<ProtectedRoute allowedRole="client"><ChatModule role="client" /></ProtectedRoute>} />
            <Route path="/client/notifications" element={<ProtectedRoute allowedRole="client"><NotificationsPage /></ProtectedRoute>} />
            <Route path="/client/*" element={<ProtectedRoute allowedRole="client"><ClientDashboard /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </NotificationProvider>
  </AuthProvider>
</QueryClientProvider>
);

export default App;
