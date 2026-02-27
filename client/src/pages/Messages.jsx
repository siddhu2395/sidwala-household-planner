import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function timeLabel(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null); // { other_id, display_name, avatar_emoji }
  const [messages, setMessages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Load conversations error:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const openConversation = useCallback(async (conv) => {
    setActiveConv(conv);
    setLoadingMsgs(true);
    try {
      const data = await api.getMessagesWith(conv.other_id);
      setMessages(data);
      // Refresh conversation list so unread counts update
      loadConversations();
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setLoadingMsgs(false);
    }
  }, [loadConversations]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 5s when a conversation is open
  useEffect(() => {
    if (!activeConv) return;
    pollRef.current = setInterval(async () => {
      try {
        const data = await api.getMessagesWith(activeConv.other_id);
        setMessages(data);
        loadConversations();
      } catch (err) { /* silent */ }
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [activeConv, loadConversations]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConv) return;
    setSending(true);
    try {
      await api.sendMessage(activeConv.other_id, text.trim());
      setText('');
      const data = await api.getMessagesWith(activeConv.other_id);
      setMessages(data);
      loadConversations();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const startNewConversation = async (u) => {
    setShowNewConv(false);
    const conv = { other_id: u.id, display_name: u.display_name, avatar_emoji: u.avatar_emoji, username: u.username };
    setActiveConv(conv);
    setLoadingMsgs(true);
    try {
      const data = await api.getMessagesWith(u.id);
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const openNewConvModal = async () => {
    try {
      const users = await api.getUsers();
      setAllUsers(users.filter(u => u.id !== user.id));
    } catch (err) { console.error(err); }
    setShowNewConv(true);
  };

  const hasActiveConv = !!activeConv;

  return (
    <div className="messages-page">
      {/* Conversations panel */}
      <div className={`conversations-panel ${hasActiveConv ? 'hidden-mobile' : ''}`}>
        <div className="conversations-header">
          <h2>{'\uD83D\uDCAC'} Messages</h2>
          <button className="btn btn-primary btn-sm" onClick={openNewConvModal}>+ New</button>
        </div>

        {loadingConvs ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="conv-empty">
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{'\uD83D\uDCEC'}</div>
            <p>No messages yet</p>
            <p style={{ fontSize: '0.82rem' }}>Start a conversation!</p>
          </div>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.other_id}
              className={`conv-item ${activeConv?.other_id === conv.other_id ? 'active' : ''}`}
              onClick={() => openConversation(conv)}
            >
              <div className="conv-avatar">{conv.avatar_emoji || '\uD83D\uDE0A'}</div>
              <div className="conv-info">
                <div className="conv-name">{conv.display_name}</div>
                <div className="conv-last">{conv.last_message}</div>
              </div>
              <div className="conv-meta">
                <div className="conv-time">{timeLabel(conv.last_message_at)}</div>
                {conv.unread_count > 0 && (
                  <div className="conv-unread">{conv.unread_count}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat panel */}
      <div className={`chat-panel ${!hasActiveConv ? 'hidden-mobile' : ''}`}>
        {!activeConv ? (
          <div className="chat-empty">
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>{'\uD83D\uDCAC'}</div>
            <h3>Select a conversation</h3>
            <p>Choose someone from the list or start a new one.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <button className="btn-icon chat-back-btn" onClick={() => setActiveConv(null)}>
                {'\u2190'}
              </button>
              <div className="chat-header-avatar">{activeConv.avatar_emoji || '\uD83D\uDE0A'}</div>
              <div>
                <div className="chat-header-name">{activeConv.display_name}</div>
                <div className="chat-header-username">@{activeConv.username}</div>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Loading...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  No messages yet — say hello!
                </div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={`msg-row ${isOwn ? 'own' : 'other'}`}>
                      {!isOwn && (
                        <div className="msg-avatar">{msg.sender_emoji || '\uD83D\uDE0A'}</div>
                      )}
                      <div className="msg-bubble-wrap">
                        {msg.note_id ? (
                          <div className={`msg-note-card ${isOwn ? 'own' : 'other'}`}>
                            <div className="msg-note-header">{'\uD83D\uDCDD'} Shared a note</div>
                            <div className="msg-note-title">{msg.note_title || 'Untitled Note'}</div>
                            {msg.note_content && (
                              <div className="msg-note-preview">{msg.note_content}</div>
                            )}
                            <Link to={`/notes?open=${msg.note_id}`} className="msg-note-link">
                              View Note {'\u2192'}
                            </Link>
                          </div>
                        ) : (
                          <div className={`msg-bubble ${isOwn ? 'own' : 'other'}`}>
                            {msg.content}
                          </div>
                        )}
                        <div className="msg-time">{timeLabel(msg.created_at)}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form className="chat-input-row" onSubmit={handleSend}>
              <textarea
                className="chat-input"
                placeholder="Type a message… (Enter to send)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={sending}
              />
              <button
                type="submit"
                className="btn btn-primary chat-send-btn"
                disabled={sending || !text.trim()}
              >
                {'\u27A4'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* New conversation modal */}
      {showNewConv && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowNewConv(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{'\uD83D\uDCAC'} New Message</h2>
              <button className="btn-icon" onClick={() => setShowNewConv(false)}>{'\u2715'}</button>
            </div>
            <div className="modal-body">
              {allUsers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No other household members yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allUsers.map(u => (
                    <button
                      key={u.id}
                      className="new-conv-user-btn"
                      onClick={() => startNewConversation(u)}
                    >
                      <span className="new-conv-avatar">{u.avatar_emoji || '\uD83D\uDE0A'}</span>
                      <span>
                        <span className="new-conv-name">{u.display_name}</span>
                        <span className="new-conv-username"> @{u.username}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
