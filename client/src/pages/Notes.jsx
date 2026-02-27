import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Notes() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewNote, setViewNote] = useState(null);

  // Create/edit form
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Share modal
  const [shareNote, setShareNote] = useState(null);
  const [shares, setShares] = useState([]);
  const [shareUserId, setShareUserId] = useState('');
  const [shareCanEdit, setShareCanEdit] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');

  // Send-via-message (inside share modal)
  const [msgRecipient, setMsgRecipient] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  // Filter
  const [filter, setFilter] = useState('all');

  const loadNotes = useCallback(async () => {
    try {
      const [notesData, usersData] = await Promise.all([api.getNotes(), api.getUsers()]);
      setNotes(notesData);
      setAllUsers(usersData.filter(u => u.id !== user.id));
    } catch (err) {
      console.error('Load notes error:', err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // Auto-open note when ?open=<noteId> is present in URL
  useEffect(() => {
    if (loading || notes.length === 0) return;
    const openId = parseInt(searchParams.get('open'));
    if (!openId) return;
    const note = notes.find(n => n.id === openId);
    if (!note) return;
    if (note.can_edit) {
      openEdit(note);
    } else {
      setViewNote(note);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // ---- Create / edit form ----
  const openCreate = () => {
    setEditNote(null);
    setForm({ title: '', content: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (note) => {
    if (!note.can_edit) return;
    setEditNote(note);
    setForm({ title: note.title, content: note.content });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditNote(null);
    setForm({ title: '', content: '' });
    setFormError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() && !form.content.trim()) { setFormError('Add a title or some content'); return; }
    setSaving(true);
    setFormError('');
    try {
      editNote ? await api.updateNote(editNote.id, form) : await api.createNote(form);
      closeForm();
      loadNotes();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${note.title || 'this note'}"?`)) return;
    try {
      await api.deleteNote(note.id);
      loadNotes();
    } catch (err) {
      alert(err.message);
    }
  };

  // ---- Share modal ----
  const openShare = async (note, e) => {
    e.stopPropagation();
    setShareNote(note);
    setShareUserId('');
    setShareCanEdit(false);
    setShareError('');
    setMsgRecipient('');
    setMsgSent(false);
    setShareLoading(true);
    try {
      const data = await api.getNoteShares(note.id);
      setShares(data);
    } catch (err) {
      setShareError(err.message);
    } finally {
      setShareLoading(false);
    }
  };

  const closeShare = () => { setShareNote(null); setShares([]); setShareError(''); };

  const handleAddShare = async (e) => {
    e.preventDefault();
    if (!shareUserId) { setShareError('Select a user'); return; }
    setShareError('');
    try {
      await api.shareNote(shareNote.id, parseInt(shareUserId), shareCanEdit);
      const data = await api.getNoteShares(shareNote.id);
      setShares(data);
      setShareUserId('');
      setShareCanEdit(false);
    } catch (err) {
      setShareError(err.message);
    }
  };

  const handleRemoveShare = async (targetUserId) => {
    try {
      await api.removeNoteShare(shareNote.id, targetUserId);
      setShares(prev => prev.filter(s => s.user_id !== targetUserId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSendViaMessage = async (e) => {
    e.preventDefault();
    if (!msgRecipient) return;
    setMsgSending(true);
    try {
      const content = shareNote.title
        ? `Shared a note with you: "${shareNote.title}"`
        : 'Shared a note with you';
      await api.sendMessage(parseInt(msgRecipient), content, shareNote.id);
      setMsgSent(true);
      setMsgRecipient('');
    } catch (err) {
      alert(err.message);
    } finally {
      setMsgSending(false);
    }
  };

  const visible = notes.filter(n => {
    if (filter === 'mine') return n.is_owner;
    if (filter === 'shared') return !n.is_owner;
    return true;
  });

  const shareableUsers = allUsers.filter(u => !shares.some(s => s.user_id === u.id));

  if (loading) return <div className="loading-screen"><div className="loader" /><p>Loading notes...</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>{'\uD83D\uDCDD'} Notes</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Note</button>
      </div>

      {/* Filter tabs */}
      {notes.length > 0 && (
        <div className="filter-group" style={{ marginBottom: 20 }}>
          {[['all', 'All'], ['mine', 'My Notes'], ['shared', 'Shared with Me']].map(([val, label]) => (
            <button
              key={val}
              className={`filter-chip ${filter === val ? 'active' : ''}`}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Empty states */}
      {notes.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-emoji">{'\uD83D\uDCDD'}</div>
          <h3>No notes yet</h3>
          <p>Jot down anything — shopping lists, ideas, reminders.</p>
          <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 16 }}>
            Create your first note
          </button>
        </div>
      )}
      {visible.length === 0 && notes.length > 0 && (
        <div className="empty-state">
          <div className="empty-emoji">{filter === 'shared' ? '\uD83E\uDD1D' : '\uD83D\uDCDD'}</div>
          <h3>{filter === 'shared' ? 'No notes shared with you yet' : 'No notes here'}</h3>
        </div>
      )}

      {/* Inline create / edit form */}
      {showForm && (
        <div className="note-form-card">
          <form onSubmit={handleSave}>
            <input
              className="note-form-title"
              type="text"
              placeholder="Title (optional)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
            <textarea
              className="note-form-body"
              placeholder="Write your note here..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={5}
            />
            {formError && <div className="error-msg" style={{ marginBottom: 8 }}>{formError}</div>}
            <div className="note-form-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Saving...' : editNote ? 'Save Changes' : 'Add Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes grid */}
      {visible.length > 0 && (
        <div className="notes-grid">
          {visible.map(note => (
            <div
              key={note.id}
              className={`note-card ${!note.is_owner ? 'note-card--shared' : ''} ${note.can_edit ? 'note-card--editable' : 'note-card--readonly'}`}
              onClick={() => openEdit(note)}
              title={!note.can_edit ? "View only — you don't have edit access" : undefined}
            >
              <div className="note-card-header">
                {note.title
                  ? <div className="note-card-title">{note.title}</div>
                  : <div className="note-card-title note-card-title--empty">Untitled</div>
                }
                <div className="note-card-icons" onClick={e => e.stopPropagation()}>
                  {note.is_owner && (
                    <button className="btn-icon note-share-btn" title="Share / Collaborate" onClick={e => openShare(note, e)}>
                      {'\uD83E\uDD1D'}
                    </button>
                  )}
                  {note.is_owner && (
                    <button className="btn-icon note-delete-btn" title="Delete" onClick={e => handleDelete(note, e)}>
                      {'\uD83D\uDDD1\uFE0F'}
                    </button>
                  )}
                </div>
              </div>

              {!note.is_owner && (
                <div className="note-shared-by">
                  {note.owner_emoji} {note.owner_name}
                  {!note.can_edit && <span className="note-readonly-badge">view only</span>}
                </div>
              )}

              {note.content && <div className="note-card-body">{note.content}</div>}
              <div className="note-card-date">{timeAgo(note.updated_at)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Share / Collaborate Modal */}
      {shareNote && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeShare()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{'\uD83E\uDD1D'} Share Note</h2>
              <button className="btn-icon" onClick={closeShare}>{'\u2715'}</button>
            </div>
            <div className="modal-body">
              <p className="share-note-name">{shareNote.title || <em>Untitled note</em>}</p>

              {shareError && <div className="error-msg">{shareError}</div>}

              {/* Collaborators list */}
              <div className="share-section-label">{'\uD83D\uDC65'} Collaborators</div>
              {shareLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 12 }}>Loading...</div>
              ) : shares.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 12 }}>
                  Not shared with anyone yet.
                </div>
              ) : (
                <div className="share-list">
                  {shares.map(s => (
                    <div key={s.user_id} className="share-row">
                      <span className="share-avatar">{s.avatar_emoji || '\uD83D\uDE0A'}</span>
                      <span className="share-name">{s.display_name}</span>
                      <span className={`share-access-badge ${s.can_edit ? 'edit' : 'view'}`}>
                        {s.can_edit ? 'Can edit' : 'View only'}
                      </span>
                      <button className="btn-icon" style={{ fontSize: '0.8rem' }} onClick={() => handleRemoveShare(s.user_id)} title="Remove">
                        {'\u2715'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add collaborator */}
              {shareableUsers.length > 0 && (
                <>
                  <div className="share-section-label">{'\u2795'} Add Collaborator</div>
                  <form onSubmit={handleAddShare} className="share-add-form">
                    <select className="form-input" value={shareUserId} onChange={e => setShareUserId(e.target.value)}>
                      <option value="">Select a person...</option>
                      {shareableUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.avatar_emoji} {u.display_name}</option>
                      ))}
                    </select>
                    <label className="share-can-edit-label">
                      <input type="checkbox" checked={shareCanEdit} onChange={e => setShareCanEdit(e.target.checked)} />
                      Can edit
                    </label>
                    <button type="submit" className="btn btn-primary btn-sm">Add</button>
                  </form>
                </>
              )}

              {/* Send via message */}
              <div className="share-section-label">{'\uD83D\uDCAC'} Send via Message</div>
              {msgSent ? (
                <div className="success-msg" style={{ marginBottom: 0 }}>Note sent as a message!</div>
              ) : (
                <form onSubmit={handleSendViaMessage} className="share-add-form">
                  <select className="form-input" value={msgRecipient} onChange={e => { setMsgRecipient(e.target.value); setMsgSent(false); }}>
                    <option value="">Send to...</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.avatar_emoji} {u.display_name}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!msgRecipient || msgSending}>
                    {msgSending ? '...' : 'Send'}
                  </button>
                </form>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeShare}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only note view modal (for view-only shared notes opened via URL param) */}
      {viewNote && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewNote(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{'\uD83D\uDCDD'} {viewNote.title || 'Untitled Note'}</h2>
              <button className="btn-icon" onClick={() => setViewNote(null)}>{'\u2715'}</button>
            </div>
            <div className="modal-body">
              {!viewNote.is_owner && (
                <div className="note-shared-by" style={{ marginBottom: 12 }}>
                  {viewNote.owner_emoji} Shared by {viewNote.owner_name}
                  <span className="note-readonly-badge">view only</span>
                </div>
              )}
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-secondary)', minHeight: 80 }}>
                {viewNote.content || <em style={{ color: 'var(--text-muted)' }}>Empty note</em>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setViewNote(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
