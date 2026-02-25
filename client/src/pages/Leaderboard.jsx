import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [achievements, setAchievements] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const lb = await api.getLeaderboard();
      setLeaderboard(lb);

      // Load achievements for all users
      const achMap = {};
      for (const u of lb) {
        try {
          const achs = await api.getAchievements(u.id);
          achMap[u.id] = achs;
        } catch (e) { achMap[u.id] = []; }
      }
      setAchievements(achMap);
    } catch (err) {
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="loader" /><p>Loading leaderboard...</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>{'\uD83C\uDFC6'} Leaderboard</h1>
      </div>

      <div className="leaderboard-list">
        {leaderboard.map((entry, index) => {
          const rank = index + 1;
          const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'other';
          const isMe = entry.id === user?.id;
          const userAch = achievements[entry.id] || [];

          return (
            <div
              key={entry.id}
              className="lb-row"
              style={isMe ? { borderColor: 'var(--lavender)', background: 'var(--lavender-light)' } : {}}
            >
              <div className={`lb-rank ${rankClass}`}>
                {rank === 1 ? '\uD83E\uDD47' : rank === 2 ? '\uD83E\uDD48' : rank === 3 ? '\uD83E\uDD49' : rank}
              </div>

              <div className="lb-user">
                <div className="lb-avatar">{entry.avatar_emoji || '\uD83D\uDE0A'}</div>
                <div>
                  <div className="lb-name">
                    {entry.display_name}
                    {isMe && <span style={{ fontSize: '0.78rem', color: 'var(--lavender-deep)', marginLeft: 6 }}>(you)</span>}
                  </div>
                  {userAch.length > 0 && (
                    <div className="badges-row">
                      {userAch.map(a => (
                        <span key={a.id} className="badge-item" title={a.badge_name}>
                          {a.badge_emoji} {a.badge_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lb-stats">
                <div className="lb-stat">
                  <div className="lb-stat-value">{entry.points}</div>
                  <div className="lb-stat-label">Points</div>
                </div>
                <div className="lb-stat">
                  <div className="lb-stat-value">{entry.tasks_completed}</div>
                  <div className="lb-stat-label">Done</div>
                </div>
                <div className="lb-stat">
                  <div className="lb-stat-value">{entry.streak_days}</div>
                  <div className="lb-stat-label">{'\uD83D\uDD25'} Streak</div>
                </div>
                <div className="lb-stat">
                  <div className="lb-stat-value">{entry.completed_this_week}</div>
                  <div className="lb-stat-label">This Week</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {leaderboard.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">{'\uD83C\uDFC6'}</div>
          <h3>No scores yet</h3>
          <p>Complete tasks to earn points and climb the leaderboard!</p>
        </div>
      )}
    </div>
  );
}
