import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

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
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState(null); // note being edited inline
  const [form, setForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadNotes = useCallback(async () => {
    try {
      const data = await api.getNotes();
      setNotes(data);
    } catch (err) {
      console.error('Load notes error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const openCreate = () => {
    setEditNote(null);
    setForm({ title: '', content: '' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (note) => {
    setEditNote(note);
    setForm({ title: note.title, content: note.content });
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditNote(null);
    setForm({ title: '', content: '' });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() && !form.content.trim()) {
      setError('Add a title or some content');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editNote) {
        await api.updateNote(editNote.id, form);
      } else {
        await api.createNote(form);
      }
      closeForm();
      loadNotes();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note) => {
    if (!window.confirm(`Delete "${note.title || 'this note'}"?`)) return;
    try {
      await api.deleteNote(note.id);
      loadNotes();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading-screen"><div className="loader" /><p>Loading notes...</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>{'\uD83D\uDCDD'} My Notes</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Note</button>
      </div>

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
            {error && <div className="error-msg" style={{ marginBottom: 8 }}>{error}</div>}
            <div className="note-form-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Saving...' : editNote ? 'Save Changes' : 'Add Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes grid */}
      {notes.length > 0 && (
        <div className="notes-grid">
          {notes.map(note => (
            <div key={note.id} className="note-card" onClick={() => openEdit(note)}>
              <div className="note-card-header">
                {note.title
                  ? <div className="note-card-title">{note.title}</div>
                  : <div className="note-card-title note-card-title--empty">Untitled</div>
                }
                <button
                  className="btn-icon note-delete-btn"
                  title="Delete note"
                  onClick={(e) => { e.stopPropagation(); handleDelete(note); }}
                >
                  {'\uD83D\uDDD1\uFE0F'}
                </button>
              </div>
              {note.content && (
                <div className="note-card-body">{note.content}</div>
              )}
              <div className="note-card-date">{timeAgo(note.updated_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
