// Simple notification assembly simulation based on NotificationContext logic
// Run with: node tools/notification-simulation.js

function safeArray(res, ...keys) {
  if (!res || !res.data) return [];
  for (const key of keys) if (Array.isArray(res.data[key])) return res.data[key];
  if (Array.isArray(res.data)) return res.data;
  return [];
}

function buildForRole(role) {
  const userRole = role;
  const readIds = new Set();
  const isRead = (id) => readIds.has(id);
  const result = [];

  // Mock data
  const announcements = [
    { _id: 'a1', title: 'Office closed Friday', createdAt: new Date().toISOString() },
  ];

  const chatUnreadCount = 3;

  const leaves = [
    { _id: 'l1', status: 'approved', user: { name: 'Alice' }, leaveType: 'Annual', startDate: '2026-03-05', updatedAt: new Date().toISOString() },
    { _id: 'l2', status: 'rejected', user: { name: 'Bob' }, leaveType: 'Sick', startDate: '2026-02-20', updatedAt: new Date().toISOString() },
  ];

  const expenses = [
    { _id: 'e1', status: 'approved', user: { name: 'Carol' }, title: 'Flight', updatedAt: new Date().toISOString() },
  ];

  const personalEdits = [
    { _id: 'ed1', status: 'approved', user: { name: 'Dave' }, reviewedAt: new Date().toISOString() },
  ];

  const pendingEdits = [
    { _id: 'p1', user: { name: 'Eve' }, createdAt: new Date().toISOString() },
  ];

  const tasks = [
    { _id: 't1', title: 'Prepare report', priority: 'High', createdAt: new Date().toISOString(), review: { comment: 'Looks good', reviewedAt: new Date().toISOString() }, progress: 20, updatedAt: new Date().toISOString(), assignedTo: { name: 'Frank' } },
  ];

  const leaveLink = userRole === 'admin' ? '/admin/leaves' : userRole === 'hr' ? '/hr/leaves' : userRole === 'client' ? '/client/leaves' : '/employee/leave';
  const expLink = userRole === 'admin' ? '/admin/expenses' : userRole === 'hr' ? '/hr/expenses' : userRole === 'client' ? '/client/expenses' : '/employee/expenses';
  const attLink = userRole === 'admin' ? '/admin/attendance' : userRole === 'hr' ? '/hr/attendance' : userRole === 'client' ? '/client/attendance' : '/employee/attendance';

  // Announcements
  announcements.slice(0,5).forEach(a => {
    const id = `ann_${a._id}`;
    const annLink = userRole === 'admin' ? '/admin/announcements' : userRole === 'hr' ? '/hr/announcements' : userRole === 'client' ? '/client/chat' : '/employee/announcements';
    result.push({ id, type: 'announcement', title: 'New Announcement', message: a.title, time: a.createdAt, read: isRead(id), link: annLink });
  });

  // Chat
  if (chatUnreadCount > 0) {
    const id = 'chat_unread_bulk';
    const chatLink = userRole === 'admin' ? '/admin/chat' : userRole === 'hr' ? '/hr/chat' : userRole === 'client' ? '/client/chat' : '/employee/chat';
    result.push({ id, type: 'chat', title: 'Unread Messages', message: `You have ${chatUnreadCount} unread message${chatUnreadCount>1?'s':''}`, time: new Date().toISOString(), read: isRead(id), link: chatLink });
  }

  // Leaves
  leaves.filter(l => l.status === 'approved' || l.status === 'rejected').slice(0,5).forEach(l => {
    const id = `leave_${l._id}_${l.status}`;
    result.push({ id, type: l.status === 'approved' ? 'leave_approved' : 'leave_rejected', title: l.status === 'approved' ? '✅ Leave Approved' : '❌ Leave Rejected', message: `${l.user?.name ? `${l.user.name}'s` : 'A'} ${l.leaveType || 'leave'} request was ${l.status}`, time: l.updatedAt, read: isRead(id), link: leaveLink });
  });

  // Expenses
  expenses.filter(e => e.status === 'approved' || e.status === 'rejected').slice(0,5).forEach(e => {
    const id = `exp_${e._id}_${e.status}`;
    result.push({ id, type: e.status === 'approved' ? 'expense_approved' : 'expense_rejected', title: e.status === 'approved' ? '✅ Expense Approved' : '❌ Expense Rejected', message: `${e.user?.name ? `${e.user.name}'s` : 'An'} expense "${e.title||e.description||'request'}" was ${e.status}`, time: e.updatedAt, read: isRead(id), link: expLink });
  });

  // Attendance edits
  personalEdits.filter(r => r.status === 'approved' || r.status === 'rejected').slice(0,5).forEach(r => {
    const id = `attedit_${r._id}_${r.status}`;
    result.push({ id, type: r.status === 'approved' ? 'attendance_edit_approved' : 'attendance_edit_rejected', title: r.status === 'approved' ? '✅ Attendance Edit Approved' : '❌ Attendance Edit Rejected', message: `${r.user?.name ? `${r.user.name}'s` : 'An'} attendance correction was ${r.status}`, time: r.reviewedAt || r.updatedAt || r.createdAt, read: isRead(id), link: attLink });
  });

  if (userRole === 'admin' || userRole === 'hr') {
    pendingEdits.slice(0,5).forEach(r => {
      const id = `pending_attedit_${r._id}`;
      result.push({ id, type: 'attendance_edit_pending', title: '📋 Attendance Edit Request', message: `${r.user?.name || 'An employee'} requested attendance correction`, time: r.createdAt, read: isRead(id), link: attLink });
    });
  }

  // Tasks
  tasks.slice(0,5).forEach(t => {
    const id = `task_assigned_${t._id}`;
    const taskLink = userRole === 'admin' ? '/admin/tasks' : userRole === 'hr' ? '/hr/tasks' : userRole === 'client' ? '/client/tasks' : '/employee/tasks';
    result.push({ id, type: 'task_assigned', title: '📋 Task', message: `"${t.title}" — Priority: ${t.priority||'N/A'}`, time: t.createdAt, read: isRead(id), link: taskLink });
  });

  // sort
  result.sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return result;
}

['admin','hr','client','employee'].forEach(role => {
  console.log(`\n=== Notifications for role: ${role} ===`);
  const list = buildForRole(role);
  console.log(`Total: ${list.length}`);
  list.forEach((n,i) => console.log(`${i+1}. [${n.type}] ${n.title} — ${n.message} (link: ${n.link})`));
});
