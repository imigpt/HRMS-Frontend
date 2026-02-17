/**
 * EmployeeChatContent - View employee's chat history (HR monitoring)
 * 
 * This component is used by HR to view an employee's chat conversations.
 * It fetches real data from the backend.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Users,
  Loader2,
  FileText,
  Mic,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { chatAPI } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import type { ChatRoom, Message } from '@/types/api';

interface EmployeeChatContentProps {
  employeeId?: string;
  employeeName?: string;
}

const EmployeeChatContent = ({ employeeId, employeeName }: EmployeeChatContentProps) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom._id);
    }
  }, [selectedRoom?._id]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      // Fetch chat rooms - this shows all rooms the logged-in user can see
      // In a real HR monitoring scenario, you'd have a separate API endpoint
      // that fetches an employee's chat history with proper authorization
      const response = await chatAPI.getRooms();
      if (response.data.success) {
        setRooms(response.data.data);
        if (response.data.data.length > 0 && !selectedRoom) {
          setSelectedRoom(response.data.data[0]);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch chat conversations',
        variant: 'destructive',
      });
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

  // Format date
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

  // Filter rooms by search
  const filteredRooms = rooms.filter(room => {
    const searchLower = searchQuery.toLowerCase();
    if (room.type === 'personal' && room.otherUser) {
      return room.otherUser.name?.toLowerCase().includes(searchLower);
    }
    return room.name?.toLowerCase().includes(searchLower);
  });

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
                className="max-w-[200px] rounded-lg"
              />
            )}
            {msg.content && <p className="text-sm">{msg.content}</p>}
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-2 p-2 bg-background/20 rounded-lg">
            <FileText className="h-6 w-6" />
            <span className="text-sm truncate">{msg.attachment?.name || 'Document'}</span>
          </div>
        );
      case 'voice':
        return (
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            <audio src={msg.attachment?.url} controls className="h-8" />
          </div>
        );
      default:
        return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
    }
  };

  return (
    <div className="h-[calc(100vh-20rem)] flex gap-4 fade-in">
      {/* Chat List Sidebar */}
      <Card className="w-80 flex-shrink-0 glass-card flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {employeeName ? `${employeeName}'s Messages` : 'Messages'}
          </CardTitle>
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
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No conversations found</p>
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
                      <Avatar>
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {room.type === 'group' ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            getInitials(roomName)
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">{roomName}</p>
                          <span className="text-xs text-muted-foreground">{timeAgo}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{lastMsg}</p>
                      </div>
                      {(room.unreadCount || 0) > 0 && (
                        <Badge className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center text-xs">
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
            <div className="p-4 border-b border-border flex items-center gap-3">
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
                  {selectedRoom.type === 'group'
                    ? `${selectedRoom.participants?.length || 0} members`
                    : 'Personal chat'}
                </p>
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
                  No messages in this conversation
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const sender = typeof msg.sender === 'object' ? msg.sender : null;
                    // In monitoring view, determine "isMe" based on the employee being viewed
                    const isFromEmployee = sender?._id === employeeId;
                    const showDate = index === 0 || 
                      formatDate(msg.createdAt) !== formatDate(messages[index - 1].createdAt);
                    
                    return (
                      <div key={msg._id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={cn('flex', isFromEmployee ? 'justify-end' : 'justify-start')}>
                          <div
                            className={cn(
                              'max-w-[70%] p-3 rounded-2xl',
                              isFromEmployee
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-secondary text-foreground rounded-bl-sm'
                            )}
                          >
                            {!isFromEmployee && selectedRoom.type === 'group' && (
                              <p className="text-xs font-medium mb-1">{sender?.name}</p>
                            )}
                            {msg.isDeleted ? (
                              <p className="text-sm italic opacity-70">This message was deleted</p>
                            ) : (
                              renderMessageContent(msg)
                            )}
                            <p className={cn(
                              'text-xs mt-1',
                              isFromEmployee ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            )}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Read-only notice */}
            <div className="p-3 bg-secondary/50 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                📋 Read-only monitoring view
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
            <p>Select a conversation to view</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmployeeChatContent;
