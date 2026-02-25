import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES } from './TaskModal';

function getCategoryEmoji(cat) {
  const found = CATEGORIES.find(c => c.value === cat);
  return found ? found.emoji : '\uD83D\uDCCC';
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(d) {
  const now = new Date();
  const then = new Date(d);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return formatDate(d);
}

export default function TaskDetail({ task, onClose }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [task.id]);

  const loadComments = async () => {
    try {
      const data = await api.getComments(task.id);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const comment = await api.addComment(task.id, newComment.trim());
      setComments([...comments, comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{getCategoryEmoji(task.category)} Task Details</h2>
          <button className="btn-icon" onClick={onClose}>{'\u2715'}</button>
        </div>

        <div className="modal-body">
          <h3 style={{ fontSize: '1.15rem', marginBottom: 8, fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            {task.title}
          </h3>

          {task.description && (
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.92rem', lineHeight: 1.6 }}>
              {task.description}
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <span className={`task-badge badge-priority-${task.priority}`}>
              {task.priority}
            </span>
            <span className="task-badge badge-category">
              {getCategoryEmoji(task.category)} {task.category}
            </span>
            {task.assignee_name && (
              <span className="task-badge badge-assignee">
                {task.assignee_emoji} {task.assignee_name}
              </span>
            )}
            {task.due_date && (
              <span className="task-badge badge-due">
                {'\uD83D\uDCC5'} {formatDate(task.due_date)}
              </span>
            )}
            <span className="task-badge badge-points">
              {'\u2B50'} {task.points_value} pts
            </span>
            {task.recurrence && task.recurrence !== 'none' && (
              <span className="task-badge badge-recurrence">
                {'\uD83D\uDD01'} {task.recurrence}
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Created by {task.creator_name || 'Unknown'} {'\u00B7'} {timeAgo(task.created_at)}
            {task.completed_at && (
              <span> {'\u00B7'} Completed {timeAgo(task.completed_at)}</span>
            )}
          </div>

          {/* Comments */}
          <div className="comments-section">
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>
              {'\uD83D\uDCAC'} Comments ({comments.length})
            </h4>

            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading comments...</p>
            ) : comments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No comments yet. Start the conversation!</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="comment">
                  <div className="comment-avatar">{c.avatar_emoji || '\uD83D\uDE0A'}</div>
                  <div className="comment-body">
                    <div className="comment-author">{c.display_name}</div>
                    <div className="comment-text">{c.content}</div>
                    <div className="comment-time">{timeAgo(c.created_at)}</div>
                  </div>
                </div>
              ))
            )}

            <form className="comment-input-row" onSubmit={handleAddComment}>
              <input
                className="form-input"
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={!newComment.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
