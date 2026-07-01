import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Smile, Hash, Users, ChevronDown,
  X, Loader2
} from 'lucide-react';
import { api } from '../lib/axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

// ─── Types ───────────────────────────────────────────────────────
interface ChatUser {
  id: string;
  name: string;
  avatar?: string | null;
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: ChatUser;
}

interface ChatMessage {
  id: string;
  text: string;
  createdAt: string;
  user: ChatUser;
  reactions: Reaction[];
}

interface OnlineUser {
  id: string;
  name: string;
  avatar?: string | null;
}

// ─── Emoji Data ──────────────────────────────────────────────────
const EMOJI_LIST = [
  '😀','😂','😍','🥳','🤩','😎','🤔','😢','😡','🔥',
  '❤️','👍','👎','👏','🎉','🚀','💯','✅','❌','⚡',
  '🌟','💜','💙','💚','🧡','😇','🤗','😏','🙌','💪',
];

// ─── Helpers ─────────────────────────────────────────────────────
const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateDivider = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const avatarColors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
const getAvatarColor = (id: string) => avatarColors[id.charCodeAt(0) % avatarColors.length];

// Check if two messages should be grouped (same user, within 5 min)
const shouldGroup = (prev: ChatMessage | null, curr: ChatMessage) => {
  if (!prev) return false;
  if (prev.user.id !== curr.user.id) return false;
  const diff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return diff < 5 * 60 * 1000;
};

const isSameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

// ─── Avatar Component ────────────────────────────────────────────
const Avatar: React.FC<{ user: ChatUser; size?: number }> = ({ user, size = 40 }) => {
  if (user.avatar) {
    return <img src={user.avatar} alt={user.name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, backgroundColor: getAvatarColor(user.id), fontSize: size * 0.35 }}
    >
      {getInitials(user.name)}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────
export const EventChatPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { user: currentUser } = useAuth();

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any | null>(null);

  // Fetch event details
  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data } = await api.get(`/events/${eventId}`);
      return data.data;
    },
    enabled: !!eventId,
  });

  // ─── Load Initial Messages ────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    setIsLoadingMessages(true);
    api.get(`/events/${eventId}/messages?limit=100`)
      .then(res => {
        setMessages(res.data.data || []);
      })
      .catch(() => {})
      .finally(() => setIsLoadingMessages(false));
  }, [eventId]);

  // ─── Socket.io Events ─────────────────────────────────────────
  useEffect(() => {
    if (!socket || !eventId || !isConnected) return;

    // Join the event room
    socket.emit('join:event', eventId);

    // Listen for new messages
    const handleNewMessage = (msg: ChatMessage) => {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    // Listen for typing
    const handleTypingStart = (data: { userId: string; userName: string }) => {
      if (data.userId === currentUser?.id) return;
      setTypingUsers(prev => prev.includes(data.userName) ? prev : [...prev, data.userName]);
    };

    const handleTypingStop = (data: { userId: string; userName: string }) => {
      setTypingUsers(prev => prev.filter(n => n !== data.userName));
    };

    // Listen for user join/leave
    const handleUserJoined = (data: { userId: string; userName: string }) => {
      setOnlineUsers(prev => {
        if (prev.find(u => u.id === data.userId)) return prev;
        return [...prev, { id: data.userId, name: data.userName }];
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== data.userId));
    };

    // Listen for reaction updates
    const handleReactionUpdate = (data: { messageId: string; reactions: Reaction[] }) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('user:joined', handleUserJoined);
    socket.on('user:left', handleUserLeft);
    socket.on('reaction:updated', handleReactionUpdate);

    return () => {
      socket.emit('leave:event', eventId);
      socket.off('message:new', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('user:joined', handleUserJoined);
      socket.off('user:left', handleUserLeft);
      socket.off('reaction:updated', handleReactionUpdate);
    };
  }, [socket, eventId, isConnected, currentUser?.id]);

  // ─── Auto-scroll ──────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom('smooth');
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Initial scroll
  useEffect(() => {
    if (!isLoadingMessages && messages.length > 0) {
      scrollToBottom('auto');
    }
  }, [isLoadingMessages]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 100;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
  };

  // ─── Send Message ─────────────────────────────────────────────
  const sendMessage = () => {
    const text = inputText.trim();
    if (!text || !socket || !eventId) return;

    socket.emit('message:send', { eventId, text });
    setInputText('');
    setShowEmojiPicker(false);
    inputRef.current?.focus();

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socket.emit('typing:stop', { eventId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Typing Indicator ─────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socket || !eventId) return;

    socket.emit('typing:start', { eventId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { eventId });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  // ─── Emoji / Reactions ────────────────────────────────────────
  const insertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!eventId) return;
    try {
      const { data } = await api.post(`/events/${eventId}/messages/${messageId}/reactions`, { emoji });
      // Update message reactions locally
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find(r => r.emoji === emoji && r.userId === currentUser?.id);
        if (existing) {
          return { ...m, reactions: m.reactions.filter(r => r.id !== existing.id) };
        }
        return { ...m, reactions: [...m.reactions, data.data] };
      }));
    } catch {
      // Ignore
    }
    setReactionPickerMsgId(null);
  };

  // Group reactions by emoji
  const groupReactions = (reactions: Reaction[]) => {
    const grouped: Record<string, { emoji: string; count: number; users: string[]; hasCurrentUser: boolean }> = {};
    reactions.forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [], hasCurrentUser: false };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user?.name || 'User');
      if (r.userId === currentUser?.id) grouped[r.emoji].hasCurrentUser = true;
    });
    return Object.values(grouped);
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-0px)] bg-[#1e1f22] text-gray-100 overflow-hidden">
      {/* ── Left: Channel Info Bar ── */}
      <div className="hidden md:flex flex-col w-60 bg-[#2b2d31] border-r border-[#1e1f22]">
        {/* Server Header */}
        <div className="p-4 border-b border-[#1e1f22] shadow-sm">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="font-bold text-white text-sm truncate">{event?.title || 'Event Chat'}</h2>
          <p className="text-[11px] text-gray-400 mt-1 truncate">{event?.category} · {event?.city}</p>
        </div>

        {/* Channel List */}
        <div className="flex-1 px-2 py-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">Text Channels</p>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#404249] text-white text-sm">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="font-medium">general</span>
          </div>
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="p-3 bg-[#232428] flex items-center gap-2 border-t border-[#1e1f22]">
            <div className="relative">
              <Avatar user={{ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }} size={32} />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#232428] ${isConnected ? 'bg-emerald-500' : 'bg-gray-500'}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-gray-400">{isConnected ? 'Online' : 'Offline'}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Center: Messages ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[#1e1f22] bg-[#313338] shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="md:hidden text-gray-400 hover:text-white mr-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Hash className="w-5 h-5 text-gray-400" />
            <span className="font-bold text-white text-sm">general</span>
            <div className="hidden sm:block w-px h-5 bg-[#3f4147] mx-2" />
            <span className="hidden sm:block text-xs text-gray-400 truncate">{event?.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-1.5 rounded-md transition-colors ${showSidebar ? 'bg-[#404249] text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-0 scroll-smooth"
          style={{ overscrollBehavior: 'contain' }}
        >
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-[#5865f2] flex items-center justify-center mb-4">
                <Hash className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Welcome to #general!</h3>
              <p className="text-sm text-gray-400 max-w-md">This is the start of the <strong className="text-white">#general</strong> channel for {event?.title}. Say hello! 👋</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const grouped = shouldGroup(prev, msg);
              const showDateDivider = !prev || !isSameDay(prev.createdAt, msg.createdAt);
              const reactions = groupReactions(msg.reactions || []);

              return (
                <React.Fragment key={msg.id}>
                  {/* Date Divider */}
                  {showDateDivider && (
                    <div className="flex items-center gap-2 my-4">
                      <div className="flex-1 h-px bg-[#3f4147]" />
                      <span className="text-[11px] font-bold text-gray-400 px-2">{formatDateDivider(msg.createdAt)}</span>
                      <div className="flex-1 h-px bg-[#3f4147]" />
                    </div>
                  )}

                  {/* Message Row */}
                  <div className={`group relative flex items-start gap-4 px-2 py-0.5 hover:bg-[#2e3035] rounded-md transition-colors ${grouped ? 'mt-0' : 'mt-4'}`}>
                    {/* Avatar column */}
                    <div className="w-10 shrink-0">
                      {!grouped && <Avatar user={msg.user} size={40} />}
                      {grouped && (
                        <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity pt-1 block text-right">
                          {formatTime(msg.createdAt)}
                        </span>
                      )}
                    </div>

                    {/* Content column */}
                    <div className="min-w-0 flex-1">
                      {!grouped && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-white hover:underline cursor-pointer">{msg.user.name}</span>
                          <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                        </div>
                      )}
                      <p className="text-[15px] text-gray-300 leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>

                      {/* Reactions */}
                      {reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {reactions.map((r) => (
                            <button
                              key={r.emoji}
                              onClick={() => toggleReaction(msg.id, r.emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                r.hasCurrentUser
                                  ? 'bg-[#5865f2]/20 border-[#5865f2]/50 text-[#dee0fc]'
                                  : 'bg-[#2b2d31] border-[#3f4147] text-gray-400 hover:border-[#5865f2]/40'
                              }`}
                              title={r.users.join(', ')}
                            >
                              <span>{r.emoji}</span>
                              <span className="font-medium">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute -top-3 right-2 hidden group-hover:flex items-center gap-0.5 bg-[#2b2d31] border border-[#3f4147] rounded-md shadow-lg p-0.5">
                      <button
                        onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)}
                        className="p-1 hover:bg-[#404249] rounded text-gray-400 hover:text-white transition-colors"
                        title="Add Reaction"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Reaction Picker Popover */}
                    <AnimatePresence>
                      {reactionPickerMsgId === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute -top-16 right-2 bg-[#2b2d31] border border-[#3f4147] rounded-lg shadow-xl p-2 z-50"
                        >
                          <div className="grid grid-cols-10 gap-1">
                            {EMOJI_LIST.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-[#404249] rounded transition-colors text-base"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll-to-Bottom FAB */}
        <AnimatePresence>
          {!isAtBottom && messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-24 right-8 w-9 h-9 rounded-full bg-[#313338] border border-[#3f4147] flex items-center justify-center text-gray-400 hover:text-white shadow-lg z-20"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Typing Indicator */}
        <div className="h-6 px-4 flex items-center shrink-0">
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                <strong className="text-white">{typingUsers.join(', ')}</strong>
                {typingUsers.length === 1 ? ' is typing...' : ' are typing...'}
              </span>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="px-4 pb-6 pt-0 shrink-0">
          <div className="relative flex items-center bg-[#383a40] rounded-lg">
            {/* Emoji Button */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-3 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Emoji Picker */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-12 left-0 bg-[#2b2d31] border border-[#3f4147] rounded-xl shadow-2xl p-3 z-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">Emoji</span>
                      <button onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-10 gap-1">
                      {EMOJI_LIST.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => insertEmoji(emoji)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#404249] rounded-md transition-colors text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message #general`}
              className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 py-3 outline-none"
              autoComplete="off"
            />

            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={!inputText.trim()}
              className="p-3 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Online Users Sidebar ── */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="hidden md:flex flex-col bg-[#2b2d31] border-l border-[#1e1f22] overflow-hidden"
          >
            <div className="p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                Online — {onlineUsers.length || 1}
              </p>
              <div className="space-y-1">
                {/* Current user always shows */}
                {currentUser && (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#35373c] transition-colors">
                    <div className="relative">
                      <Avatar user={{ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }} size={32} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2b2d31] bg-emerald-500" />
                    </div>
                    <span className="text-sm text-gray-300 font-medium truncate">{currentUser.name}</span>
                  </div>
                )}
                {/* Other online users */}
                {onlineUsers.filter(u => u.id !== currentUser?.id).map(user => (
                  <div key={user.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#35373c] transition-colors">
                    <div className="relative">
                      <Avatar user={user} size={32} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2b2d31] bg-emerald-500" />
                    </div>
                    <span className="text-sm text-gray-300 font-medium truncate">{user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
