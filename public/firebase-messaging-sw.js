// Firebase Messaging Service Worker
// This file MUST stay at /firebase-messaging-sw.js (root of public dir)
// It handles background push messages when the app tab is not focused.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// NOTE: Replace the placeholder values below with your actual Firebase web
//       app config or inject them at build time.
// Embedded Firebase config (from provided web app settings)
firebase.initializeApp({
  apiKey:            'AIzaSyCYWsNbc0I9_SqrO87yWkTPETpqtg3Efb0',
  authDomain:        'hrms-app-c251b.firebaseapp.com',
  projectId:         'hrms-app-c251b',
  storageBucket:     'hrms-app-c251b.firebasestorage.app',
  messagingSenderId: '23625991695',
  appId:             '1:23625991695:web:20053ee3b001cd7fe3c57a',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title = 'New Notification', body = '' } = payload.notification ?? {};
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    data: payload.data ?? {},
  });
});
