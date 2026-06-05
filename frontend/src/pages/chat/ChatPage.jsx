import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Paperclip, Send } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import {
  createCloudinaryChatUploadSignature,
  getConversationMessages,
  markConversationAsRead,
  saveCloudinaryFileMessage
} from '../../services/chatService';
import { getSocket } from '../../services/socketService';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typingText, setTypingText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getConversationMessages(conversationId);
      setMessages(data.messages || []);

      await markConversationAsRead(conversationId);
      scrollToBottom();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    const socket = getSocket();

    if (!socket) {
      setError('Socket connection failed. Please login again.');
      return;
    }

    socket.emit('join_conversation', { conversationId });

    socket.on('new_message', (message) => {
      if (message.conversationId?.toString() === conversationId) {
        setMessages((prev) => {
          const exists = prev.some((item) => item._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });

        scrollToBottom();
      }
    });

    socket.on('typing', (payload) => {
      if (
        payload.conversationId === conversationId &&
        payload.userId !== user?.id
      ) {
        setTypingText(`${payload.name} is typing...`);
      }
    });

    socket.on('stop_typing', (payload) => {
      if (payload.conversationId === conversationId) {
        setTypingText('');
      }
    });

    socket.on('chat_error', (payload) => {
      setError(payload.message || 'Chat error');
    });

    return () => {
      socket.off('new_message');
      socket.off('typing');
      socket.off('stop_typing');
      socket.off('chat_error');
    };
  }, [conversationId, user?.id]);

  const handleSend = async (e) => {
    e.preventDefault();

    if (!text.trim()) return;

    try {
      setSending(true);
      setError('');

      const socket = getSocket();

      if (!socket) {
        setError('Socket not connected');
        return;
      }

      socket.emit('send_message', {
        conversationId,
        text: text.trim(),
        attachments: []
      });

      socket.emit('stop_typing', { conversationId });
      setText('');
    } catch {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setText(e.target.value);

    const socket = getSocket();

    if (socket) {
      socket.emit('typing', { conversationId });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { conversationId });
      }, 800);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    try {
      setSending(true);
      setError('');

      const signature = await createCloudinaryChatUploadSignature(
        conversationId,
        {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        }
      );

      const uploaded = await uploadToCloudinary({
        file,
        upload: signature.upload
      });

      await saveCloudinaryFileMessage(conversationId, {
        text: '',
        attachment: uploaded,
        fileName: file.name,
        mimeType: file.type
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'File upload failed');
    } finally {
      setSending(false);
    }
  };

  const isMine = (message) => {
    const senderId = message.senderId?._id || message.senderId;
    return senderId?.toString() === user?.id?.toString();
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="text-right">
            <h1 className="text-lg font-bold text-slate-950">Secure Chat</h1>
            <p className="text-xs text-slate-500">
              Founder-investor conversation
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-6">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex flex-1 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <p className="text-center text-sm text-slate-500">
                Loading messages...
              </p>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                No messages yet. Start the conversation.
              </p>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${
                      isMine(message) ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                        isMine(message)
                          ? 'bg-slate-950 text-white'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <p className="mb-1 text-xs opacity-70">
                        {message.senderId?.name || 'User'}
                      </p>

                      {message.text && (
                        <p className="whitespace-pre-line">{message.text}</p>
                      )}

                      {message.attachments?.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((file, index) => (
                            <a
                              key={index}
                              href={file.secureUrl || file.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`block rounded-xl px-3 py-2 text-xs font-semibold ${
                                isMine(message)
                                  ? 'bg-white/10 text-white'
                                  : 'bg-white text-slate-700'
                              }`}
                            >
                              📎 {file.originalFileName || file.fileName}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {typingText && (
            <div className="px-6 pb-2 text-xs font-medium text-slate-500">
              {typingText}
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="flex items-center gap-3 border-t border-slate-200 p-4"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files[0])}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="rounded-xl border border-slate-200 p-3 text-slate-700 hover:bg-slate-50"
            >
              <Paperclip size={18} />
            </button>

            <input
              value={text}
              onChange={handleTyping}
              placeholder="Write your message..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
            />

            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <Send size={18} />
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ChatPage;