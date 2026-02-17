import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Search,
  Users,
  Plus,
  Paperclip,
  Image as ImageIcon,
  Mic,
  MicOff,
  MoreVertical,
  Loader2,
  X,
  UserPlus,
  LogOut,
  Trash2,
  FileText,
  Check,
  CheckCheck,
  Download,
  Play,
  Pause,
  MessageSquarePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { chatAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket, initSocket } from '@/lib/socket';
import type { ChatRoom, Message, User, OnlineUser, TypingUser } from '@/types/api';

interface ChatModuleProps {
  role: 'admin' | 'hr' | 'employee';
}

const ChatModule = ({ role }: ChatModuleProps) => {
  // State
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  
  // Media states
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Dialog states
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showGroupInfoDialog, setShowGroupInfoDialog] = useState(false);
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  
  // New group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const socket = getSocket();

  // Initialize socket and fetch initial data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !socket?.connected) {
      initSocket(token);
    }
    
    fetchRooms();
    fetchCompanyUsers();
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    const currentSocket = getSocket();
    if (!currentSocket) return;

    // New message handler
    const handleNewMessage = (newMessage: Message) => {
      // Update messages if in the same room
      if (selectedRoom && 
          (newMessage.chatRoom === selectedRoom._id || 
           (typeof newMessage.chatRoom === 'object' && newMessage.chatRoom._id === selectedRoom._id))) {
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
        
        // Mark as read if from others
        const senderId = typeof newMessage.sender === 'object' ? newMessage.sender._id : newMessage.sender;
        if (senderId !== user?._id) {
          currentSocket.emit('mark-read', { roomId: selectedRoom._id });
        }
      }
      
      // Update room list
      fetchRooms();
    };

    // Message sent confirmation
    const handleMessageSent = (data: { tempId: string; message: Message }) => {
      setMessages(prev => prev.map(m => 
        m._id === data.tempId ? data.message : m
      ));
    };

    // User typing
    const handleUserTyping = (data: TypingUser) => {
      if (data.roomId === selectedRoom?._id && data.userId !== user?._id) {
        setTypingUsers(prev => {
          if (!prev.find(u => u.userId === data.userId)) {
            return [...prev, data];
          }
          return prev;
        });
      }
    };

    // User stopped typing
    const handleUserStoppedTyping = (data: TypingUser) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    };

    // Online/offline status
    const handleUserOnline = (data: OnlineUser) => {
      setOnlineUsers(prev => {
        if (!prev.find(u => u.userId === data.userId)) {
          return [...prev, data];
        }
        return prev;
      });
    };

    const handleUserOffline = (data: { userId: string }) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
    };

    // Online users list
    const handleOnlineUsers = (users: OnlineUser[]) => {
      setOnlineUsers(users);
    };

    // Group events
    const handleGroupCreated = (group: ChatRoom) => {
      setRooms(prev => [group, ...prev]);
      toast({ title: 'Added to new group', description: group.name });
    };

    const handleAddedToGroup = (group: ChatRoom) => {
      setRooms(prev => [group, ...prev]);
      toast({ title: 'Added to group', description: group.name });
    };

    const handleRemovedFromGroup = (data: { groupId: string }) => {
      setRooms(prev => prev.filter(r => r._id !== data.groupId));
      if (selectedRoom?._id === data.groupId) {
        setSelectedRoom(null);
        setMessages([]);
      }
      toast({ title: 'Removed from group', variant: 'destructive' });
    };

    const handleGroupDeleted = (data: { groupId: string }) => {
      setRooms(prev => prev.filter(r => r._id !== data.groupId));
      if (selectedRoom?._id === data.groupId) {
        setSelectedRoom(null);
        setMessages([]);
      }
      toast({ title: 'Group was deleted', variant: 'destructive' });
    };

    // Messages read
    const handleMessagesRead = (data: { roomId: string; readBy: string }) => {
      if (data.roomId === selectedRoom?._id) {
        setMessages(prev => prev.map(m => {
          const senderId = typeof m.sender === 'object' ? m.sender._id : m.sender;
          if (senderId === user?._id) {
            return { ...m, isRead: true, status: 'read' as const };
          }
          return m;
        }));
      }
    };

    // Register listeners
    currentSocket.on('new-message', handleNewMessage);
    currentSocket.on('message-sent', handleMessageSent);
    currentSocket.on('user-typing', handleUserTyping);
    currentSocket.on('user-stopped-typing', handleUserStoppedTyping);
    currentSocket.on('user-online', handleUserOnline);
    currentSocket.on('user-offline', handleUserOffline);
    currentSocket.on('online-users', handleOnlineUsers);
    currentSocket.on('group-created', handleGroupCreated);
    currentSocket.on('added-to-group', handleAddedToGroup);
    currentSocket.on('removed-from-group', handleRemovedFromGroup);
    currentSocket.on('group-deleted', handleGroupDeleted);
    currentSocket.on('messages-read', handleMessagesRead);

    // Request online users
    currentSocket.emit('get-online-users');

    return () => {
      currentSocket.off('new-message', handleNewMessage);
      currentSocket.off('message-sent', handleMessageSent);
      currentSocket.off('user-typing', handleUserTyping);
      currentSocket.off('user-stopped-typing', handleUserStoppedTyping);
      currentSocket.off('user-online', handleUserOnline);
      currentSocket.off('user-offline', handleUserOffline);
      currentSocket.off('online-users', handleOnlineUsers);
      currentSocket.off('group-created', handleGroupCreated);
      currentSocket.off('added-to-group', handleAddedToGroup);
      currentSocket.off('removed-from-group', handleRemovedFromGroup);
      currentSocket.off('group-deleted', handleGroupDeleted);
      currentSocket.off('messages-read', handleMessagesRead);
    };
  }, [selectedRoom, user, toast]);

  // Fetch rooms on selection change
  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom._id);
      
      // Join room socket
      const currentSocket = getSocket();
      if (currentSocket) {
        currentSocket.emit('join-room', selectedRoom._id);
      }
    }
  }, [selectedRoom?._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // API Calls
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getRooms();
      if (response.data.success) {
        setRooms(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      setLoadingMessages(true);
      const response = await chatAPI.getRoomMessages(roomId);
      if (response.data.success) {
        setMessages(response.data.data);
        
        // Mark as read
        const currentSocket = getSocket();
        if (currentSocket) {
          currentSocket.emit('mark-read', { roomId });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch messages',
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchCompanyUsers = async () => {
    try {
      const response = await chatAPI.getCompanyUsers();
      if (response.data.success) {
        setCompanyUsers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // Send message via socket for real-time
  const handleSendMessage = async () => {
    if (!selectedRoom || !message.trim()) return;
    
    const currentSocket = getSocket();
    if (!currentSocket?.connected) {
      // Fallback to HTTP
      await sendMessageHTTP();
      return;
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      _id: tempId,
      chatRoom: selectedRoom._id,
      sender: user as User,
      content: message.trim(),
      messageType: 'text',
      isGroupMessage: selectedRoom.type === 'group',
      isRead: false,
      status: 'sending',
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setMessage('');
    scrollToBottom();

    // Send via socket
    currentSocket.emit('send-message', {
      roomId: selectedRoom._id,
      content: message.trim(),
      messageType: 'text',
      tempId,
    });

    // Stop typing indicator
    currentSocket.emit('stop-typing', { roomId: selectedRoom._id });
  };

  // HTTP fallback for sending messages
  const sendMessageHTTP = async () => {
    if (!selectedRoom || !message.trim()) return;
    
    try {
      setSendingMessage(true);
      const response = await chatAPI.sendRoomMessage(selectedRoom._id, message.trim());
      if (response.data.success) {
        setMessages(prev => [...prev, response.data.data]);
        setMessage('');
        fetchRooms();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    const currentSocket = getSocket();
    if (!currentSocket || !selectedRoom) return;

    currentSocket.emit('typing', { roomId: selectedRoom._id });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      currentSocket.emit('stop-typing', { roomId: selectedRoom._id });
    }, 2000);
  };

  // Start new personal chat
  const handleStartChat = async (userId: string) => {
    try {
      const response = await chatAPI.getOrCreatePersonalChat(userId);
      if (response.data.success) {
        const room = response.data.data;
        setRooms(prev => {
          if (!prev.find(r => r._id === room._id)) {
            return [room, ...prev];
          }
          return prev;
        });
        setSelectedRoom(room);
        setShowNewChatDialog(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to start chat',
        variant: 'destructive',
      });
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter group name and select members',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await chatAPI.createGroup(
        newGroupName.trim(),
        selectedMembers,
        newGroupDescription.trim()
      );
      if (response.data.success) {
        setRooms(prev => [response.data.data, ...prev]);
        setSelectedRoom(response.data.data);
        setShowCreateGroupDialog(false);
        setNewGroupName('');
        setNewGroupDescription('');
        setSelectedMembers([]);
        toast({ title: 'Success', description: 'Group created successfully' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create group',
        variant: 'destructive',
      });
    }
  };

  // Add members to group
  const handleAddMembers = async () => {
    if (!selectedRoom || selectedMembers.length === 0) return;

    try {
      const response = await chatAPI.addGroupMembers(selectedRoom._id, selectedMembers);
      if (response.data.success) {
        setSelectedRoom(response.data.data);
        fetchRooms();
        setShowAddMembersDialog(false);
        setSelectedMembers([]);
        toast({ title: 'Success', description: 'Members added successfully' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add members',
        variant: 'destructive',
      });
    }
  };

  // Remove member from group
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedRoom) return;

    try {
      await chatAPI.removeGroupMember(selectedRoom._id, memberId);
      // Refresh group details
      const response = await chatAPI.getGroupDetails(selectedRoom._id);
      if (response.data.success) {
        setSelectedRoom(response.data.data);
      }
      fetchRooms();
      toast({ title: 'Success', description: 'Member removed' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    if (!selectedRoom) return;

    try {
      await chatAPI.leaveGroup(selectedRoom._id);
      setRooms(prev => prev.filter(r => r._id !== selectedRoom._id));
      setSelectedRoom(null);
      setMessages([]);
      toast({ title: 'Left the group' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to leave group',
        variant: 'destructive',
      });
    }
  };

  // Delete group
  const handleDeleteGroup = async () => {
    if (!selectedRoom) return;

    try {
      await chatAPI.deleteGroup(selectedRoom._id);
      setRooms(prev => prev.filter(r => r._id !== selectedRoom._id));
      setSelectedRoom(null);
      setMessages([]);
      toast({ title: 'Group deleted' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete group',
        variant: 'destructive',
      });
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File, type: 'image' | 'document') => {
    if (!selectedRoom) return;

    console.log('📤 Uploading file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      roomId: selectedRoom._id
    });

    try {
      setUploadingMedia(true);
      const response = await chatAPI.uploadMedia(selectedRoom._id, file);
      
      console.log('✅ Upload response:', response.data);
      
      if (response.data.success) {
        // Add the new message to the UI
        setMessages(prev => [...prev, response.data.data]);
        fetchRooms();
        
        toast({
          title: 'Success',
          description: `${type === 'image' ? 'Photo' : 'File'} sent successfully`,
        });
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploadingMedia(false);
      setShowMediaMenu(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not access microphone',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !selectedRoom) return;

    const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
    await handleFileUpload(file, 'document'); // Will be detected as voice
    setAudioBlob(null);
  };

  const cancelVoiceMessage = () => {
    setAudioBlob(null);
  };

  // Check if user is online
  const isUserOnline = (userId: string) => {
    return onlineUsers.some(u => u.userId === userId);
  };

  // Check if user is admin of current group
  const isGroupAdmin = () => {
    if (!selectedRoom || selectedRoom.type !== 'group') return false;
    return selectedRoom.admins?.some(a => 
      (typeof a === 'object' ? a._id : a) === user?._id
    );
  };

  // Can manage group (admin/hr role or group admin)
  const canManageGroup = () => {
    return ['admin', 'hr'].includes(role) || isGroupAdmin();
  };

  // Filter rooms by search
  const filteredRooms = rooms.filter(room => {
    const searchLower = searchQuery.toLowerCase();
    if (room.type === 'personal' && room.otherUser) {
      return room.otherUser.name?.toLowerCase().includes(searchLower);
    }
    return room.name?.toLowerCase().includes(searchLower);
  });

  // Get display name for room
  const getRoomName = (room: ChatRoom) => {
    if (room.type === 'personal' && room.otherUser) {
      return room.otherUser.name || 'Unknown User';
    }
    return room.name || 'Group';
  };

  // Get avatar initials
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for message groups
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  // Render message content based on type
  const renderMessageContent = (msg: Message) => {
    switch (msg.messageType) {
      case 'image':
        return (
          <div className="space-y-2">
            {msg.attachment?.url && (
              <img 
                src={msg.attachment.url} 
                alt="Image" 
                className="max-w-[250px] rounded-lg cursor-pointer"
                onClick={() => window.open(msg.attachment?.url, '_blank')}
              />
            )}
            {msg.content && <p className="text-sm">{msg.content}</p>}
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-3 p-2 bg-background/20 rounded-lg">
            <FileText className="h-8 w-8" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.attachment?.name || 'Document'}</p>
              <p className="text-xs opacity-70">
                {msg.attachment?.size ? `${(msg.attachment.size / 1024).toFixed(1)} KB` : ''}
              </p>
            </div>
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => window.open(msg.attachment?.url, '_blank')}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );
      case 'voice':
        return (
          <div className="flex items-center gap-3">
            <Mic className="h-5 w-5" />
            <audio src={msg.attachment?.url} controls className="h-8" />
          </div>
        );
      default:
        return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-4 fade-in">
        {/* Chat List Sidebar */}
        <Card className="w-80 flex-shrink-0 glass-card flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Messages</CardTitle>
              <div className="flex gap-1">
                <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" title="New Chat">
                      <MessageSquarePlus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Start New Chat</DialogTitle>
                      <DialogDescription>Select a colleague to start a conversation</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-2">
                        {companyUsers.map((u) => (
                          <div
                            key={u._id}
                            onClick={() => handleStartChat(u._id)}
                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-secondary"
                          >
                            <Avatar>
                              <AvatarImage src={u.avatar} />
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {getInitials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.position || u.role}</p>
                            </div>
                            {isUserOnline(u._id) && (
                              <span className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                {['admin', 'hr'].includes(role) && (
                  <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" title="Create Group">
                        <Users className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create Group</DialogTitle>
                        <DialogDescription>Create a new group chat</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Group Name</Label>
                          <Input
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="Enter group name"
                          />
                        </div>
                        <div>
                          <Label>Description (optional)</Label>
                          <Textarea
                            value={newGroupDescription}
                            onChange={(e) => setNewGroupDescription(e.target.value)}
                            placeholder="Enter group description"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Select Members</Label>
                          <ScrollArea className="h-[200px] border rounded-lg p-2 mt-2">
                            {companyUsers.map((u) => (
                              <div key={u._id} className="flex items-center gap-3 p-2">
                                <Checkbox
                                  checked={selectedMembers.includes(u._id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMembers(prev => [...prev, u._id]);
                                    } else {
                                      setSelectedMembers(prev => prev.filter(id => id !== u._id));
                                    }
                                  }}
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                                    {getInitials(u.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{u.name}</span>
                              </div>
                            ))}
                          </ScrollArea>
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedMembers.length} member(s) selected
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateGroupDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateGroup}>Create Group</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            {loading && rooms.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No conversations yet</p>
                <p className="text-sm">Start a new chat!</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {filteredRooms.map((room) => {
                    const roomName = getRoomName(room);
                    const lastMsg = room.lastMessage?.content || 'No messages yet';
                    const timeAgo = room.lastMessage?.createdAt 
                      ? formatTime(room.lastMessage.createdAt)
                      : '';
                    const isOnline = room.type === 'personal' && room.otherUser 
                      ? isUserOnline(room.otherUser._id)
                      : false;
                    
                    return (
                      <div
                        key={room._id}
                        onClick={() => setSelectedRoom(room)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                          selectedRoom?._id === room._id
                            ? 'bg-primary/15 border border-primary/20'
                            : 'hover:bg-secondary'
                        )}
                      >
                        <div className="relative">
                          <Avatar>
                            {room.avatar?.url ? (
                              <AvatarImage src={room.avatar.url} />
                            ) : null}
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {room.type === 'group' ? (
                                <Users className="h-4 w-4" />
                              ) : (
                                getInitials(roomName)
                              )}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground truncate">{roomName}</p>
                            <span className="text-xs text-muted-foreground">{timeAgo}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{lastMsg}</p>
                        </div>
                        {(room.unreadCount || 0) > 0 && (
                          <Badge className="bg-primary text-primary-foreground h-5 min-w-[20px] p-0 flex items-center justify-center text-xs">
                            {room.unreadCount}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 glass-card flex flex-col">
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {selectedRoom.type === 'group' ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        getInitials(getRoomName(selectedRoom))
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{getRoomName(selectedRoom)}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRoom.type === 'group' ? (
                        `${selectedRoom.participants?.length || 0} members`
                      ) : selectedRoom.otherUser && isUserOnline(selectedRoom.otherUser._id) ? (
                        <span className="text-green-500">Online</span>
                      ) : (
                        'Offline'
                      )}
                      {typingUsers.length > 0 && (
                        <span className="ml-2 text-primary animate-pulse">
                          {typingUsers.map(u => u.userName).join(', ')} typing...
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRoom.type === 'group' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowGroupInfoDialog(true)}>
                          <Users className="h-4 w-4 mr-2" />
                          Group Info
                        </DropdownMenuItem>
                        {canManageGroup() && (
                          <>
                            <DropdownMenuItem onClick={() => {
                              setSelectedMembers([]);
                              setShowAddMembersDialog(true);
                            }}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add Members
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {role === 'admin' && (
                              <DropdownMenuItem 
                                onClick={handleDeleteGroup}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Group
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        <DropdownMenuItem onClick={handleLeaveGroup} className="text-destructive">
                          <LogOut className="h-4 w-4 mr-2" />
                          Leave Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, index) => {
                      const sender = typeof msg.sender === 'object' ? msg.sender : null;
                      const isMe = sender?._id === user?._id;
                      const showDate = index === 0 || 
                        formatDate(msg.createdAt) !== formatDate(messages[index - 1].createdAt);
                      
                      return (
                        <div key={msg._id || `temp-${index}`}>
                          {showDate && (
                            <div className="flex justify-center my-4">
                              <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                                {formatDate(msg.createdAt)}
                              </span>
                            </div>
                          )}
                          <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                            <div
                              className={cn(
                                'max-w-[70%] p-3 rounded-2xl',
                                isMe
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-secondary text-foreground rounded-bl-sm'
                              )}
                            >
                              {!isMe && selectedRoom.type === 'group' && (
                                <p className="text-xs font-medium mb-1 opacity-80">
                                  {sender?.name}
                                </p>
                              )}
                              {msg.isDeleted ? (
                                <p className="text-sm italic opacity-70">This message was deleted</p>
                              ) : (
                                renderMessageContent(msg)
                              )}
                              <div className={cn(
                                'flex items-center gap-1 mt-1',
                                isMe ? 'justify-end' : 'justify-start'
                              )}>
                                <span className={cn(
                                  'text-xs',
                                  isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                )}>
                                  {formatTime(msg.createdAt)}
                                </span>
                                {isMe && (
                                  <span className="text-primary-foreground/70">
                                    {msg.status === 'sending' ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : msg.isRead || msg.status === 'read' ? (
                                      <CheckCheck className="h-3 w-3" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                {audioBlob ? (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-secondary rounded-lg">
                    <Mic className="h-5 w-5 text-primary" />
                    <span className="flex-1 text-sm">Voice message ready</span>
                    <Button size="sm" variant="ghost" onClick={cancelVoiceMessage}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={sendVoiceMessage} disabled={uploadingMedia}>
                      {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                    </Button>
                  </div>
                ) : null}
                
                <div className="flex items-center gap-2">
                  {/* File attachments */}
                  <DropdownMenu open={showMediaMenu} onOpenChange={setShowMediaMenu}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={uploadingMedia}>
                        {uploadingMedia ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Photo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <FileText className="h-4 w-4 mr-2" />
                        Document
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Hidden file inputs */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'image');
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'document');
                      e.target.value = '';
                    }}
                  />

                  {/* Voice recording button */}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(isRecording && 'text-red-500')}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>

                  {/* Message input */}
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 bg-secondary border-border"
                    disabled={isRecording}
                  />

                  {/* Send button */}
                  <Button 
                    size="icon" 
                    className="glow-button"
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !message.trim() || isRecording}
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Users className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg">Select a conversation</p>
              <p className="text-sm">or start a new chat</p>
            </div>
          )}
        </Card>

        {/* Group Info Dialog */}
        <Dialog open={showGroupInfoDialog} onOpenChange={setShowGroupInfoDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedRoom?.name}</DialogTitle>
              <DialogDescription>{selectedRoom?.description || 'No description'}</DialogDescription>
            </DialogHeader>
            <div>
              <h4 className="font-medium mb-2">
                Members ({selectedRoom?.participants?.length || 0})
              </h4>
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {selectedRoom?.participants?.map((member) => {
                    const m = typeof member === 'object' ? member : null;
                    if (!m) return null;
                    const isAdmin = selectedRoom.admins?.some(a => 
                      (typeof a === 'object' ? a._id : a) === m._id
                    );
                    const isSelf = m._id === user?._id;
                    
                    return (
                      <div key={m._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={m.avatar} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {getInitials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">
                            {m.name} {isSelf && '(You)'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {m.position || m.role}
                            {isAdmin && ' • Admin'}
                          </p>
                        </div>
                        {canManageGroup() && !isSelf && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(m._id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Members Dialog */}
        <Dialog open={showAddMembersDialog} onOpenChange={setShowAddMembersDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Members</DialogTitle>
              <DialogDescription>Select users to add to the group</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[300px] pr-4">
              {companyUsers
                .filter(u => !selectedRoom?.participants?.some(p => 
                  (typeof p === 'object' ? p._id : p) === u._id
                ))
                .map((u) => (
                  <div key={u._id} className="flex items-center gap-3 p-2">
                    <Checkbox
                      checked={selectedMembers.includes(u._id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMembers(prev => [...prev, u._id]);
                        } else {
                          setSelectedMembers(prev => prev.filter(id => id !== u._id));
                        }
                      }}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{u.name}</span>
                  </div>
                ))}
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddMembersDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMembers} disabled={selectedMembers.length === 0}>
                Add {selectedMembers.length} Member(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ChatModule;
