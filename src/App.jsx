import { useState, useEffect, useRef } from 'react';

function formatTimeSince(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) return 'less than an hour ago';
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  if (diffDays < 70) {
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    const wStr = `${weeks} week${weeks === 1 ? '' : 's'}`;
    if (days === 0) return `${wStr} ago`;
    return `${wStr} and ${days} day${days === 1 ? '' : 's'} ago`;
  }

  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    const mStr = `${months} month${months === 1 ? '' : 's'}`;
    if (days === 0) return `${mStr} ago`;
    return `${mStr} and ${days} day${days === 1 ? '' : 's'} ago`;
  }

  const years = Math.floor(diffDays / 365);
  const days = diffDays % 365;
  const yStr = `${years} year${years === 1 ? '' : 's'}`;
  if (days === 0) return `${yStr} ago`;
  return `${yStr} and ${days} day${days === 1 ? '' : 's'} ago`;
}

function LoginScreen() {
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light px-4">
      <i className="bi bi-clock-history text-primary mb-3" style={{ fontSize: '4rem' }}></i>
      <h1 className="fw-bold mb-1">Last Time</h1>
      <p className="text-muted mb-4 text-center">Track when you last did anything.</p>
      <a
        href="/auth/google"
        className="btn btn-outline-dark btn-lg d-flex align-items-center gap-2 px-4"
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Sign in with Google
      </a>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [activityName, setActivityName] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [, forceUpdate] = useState(0);
  const inputRef = useRef(null);

  // Check login state on mount
  useEffect(() => {
    fetch('/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(u => setUser(u))
      .catch(() => setUser(null));
  }, []);

  // Load activities once logged in
  useEffect(() => {
    if (!user) return;
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => { setActivities(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  // Refresh time labels every minute
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (showDialog) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showDialog]);

  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST' });
    setUser(null);
    setActivities([]);
  };

  const openDialog = () => { setActivityName(''); setShowDialog(true); };
  const closeDialog = () => { setShowDialog(false); setActivityName(''); };

  const handleSave = async () => {
    const name = activityName.trim();
    if (!name) return;
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const doc = await res.json();
    setActivities(prev => {
      const exists = prev.find(a => a._id === doc._id);
      if (exists) return prev.map(a => a._id === doc._id ? doc : a);
      return [doc, ...prev];
    });
    closeDialog();
  };

  const handleMarkDone = async (id) => {
    const res = await fetch(`/api/activities/${id}`, { method: 'PATCH' });
    const doc = await res.json();
    setActivities(prev => prev.map(a => a._id === doc._id ? doc : a));
    setConfirmId(null);
  };

  const handleDelete = async (id) => {
    await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    setActivities(prev => prev.filter(a => a._id !== id));
    setDeleteId(null);
  };

  // Still checking auth
  if (user === undefined) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  // Not logged in
  if (!user) return <LoginScreen />;

  return (
    <div className="min-vh-100">
      {/* Header */}
      <nav className="navbar navbar-dark bg-primary sticky-top shadow-sm">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold fs-5">
            <i className="bi bi-clock-history me-2"></i>Last Time
          </span>
          <div className="d-flex align-items-center gap-2">
            {user.photo && (
              <img
                src={user.photo}
                alt={user.name}
                className="rounded-circle"
                style={{ width: '2rem', height: '2rem', objectFit: 'cover' }}
              />
            )}
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Activity list */}
      <div className="container-fluid px-3 py-3 pb-5 mb-4">
        {loading ? (
          <div className="text-center text-muted mt-5 pt-4">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-muted mt-5 pt-4">
            <i className="bi bi-journal-plus" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
            <p className="mt-3 mb-0">No activities yet.</p>
            <p className="text-muted small">Tap <strong>+</strong> to add your first one.</p>
          </div>
        ) : (
          <div className="list-group shadow-sm">
            {activities.map((activity, index) => (
              <div
                key={activity._id}
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center activity-item${index === 0 ? ' rounded-top' : ''}${index === activities.length - 1 ? ' rounded-bottom' : ''}`}
                style={{ padding: '0.875rem 1rem' }}
              >
                <div className="flex-grow-1">
                  <div className="fw-semibold lh-sm">{activity.name}</div>
                  <small className="text-muted">{formatTimeSince(activity.lastTime)}</small>
                </div>
                <div className="d-flex gap-2 ms-3 flex-shrink-0">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => setConfirmId(activity._id)}
                  >
                    Update
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary rounded-circle"
                    style={{ width: '2.25rem', height: '2.25rem' }}
                    onClick={() => setDeleteId(activity._id)}
                    title="Delete"
                  >
                    <i className="bi bi-trash3"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB — bottom left */}
      <button
        className="btn btn-primary shadow"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          left: '1.5rem',
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '50%',
          fontSize: '1.75rem',
          lineHeight: 1,
          zIndex: 1000,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={openDialog}
        aria-label="Add activity"
      >
        <i className="bi bi-plus"></i>
      </button>

      {/* Confirm Update Dialog */}
      {confirmId !== null && (
        <>
          <div className="modal-backdrop show" style={{ zIndex: 1040 }} onClick={() => setConfirmId(null)} />
          <div className="modal show d-block" style={{ zIndex: 1050 }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered mx-3">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-semibold">Update Time</h5>
                  <button type="button" className="btn-close" onClick={() => setConfirmId(null)} />
                </div>
                <div className="modal-body pt-2">
                  <p className="mb-0">Have you just done this activity?</p>
                </div>
                <div className="modal-footer border-0 pt-0 gap-2">
                  <button type="button" className="btn btn-light flex-fill" onClick={() => setConfirmId(null)}>No</button>
                  <button type="button" className="btn btn-primary flex-fill" onClick={() => handleMarkDone(confirmId)}>Yes</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirm Delete Dialog */}
      {deleteId !== null && (
        <>
          <div className="modal-backdrop show" style={{ zIndex: 1040 }} onClick={() => setDeleteId(null)} />
          <div className="modal show d-block" style={{ zIndex: 1050 }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered mx-3">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-semibold">Delete Activity</h5>
                  <button type="button" className="btn-close" onClick={() => setDeleteId(null)} />
                </div>
                <div className="modal-body pt-2">
                  <p className="mb-0">Are you sure you want to delete this activity?</p>
                </div>
                <div className="modal-footer border-0 pt-0 gap-2">
                  <button type="button" className="btn btn-light flex-fill" onClick={() => setDeleteId(null)}>No</button>
                  <button type="button" className="btn btn-danger flex-fill" onClick={() => handleDelete(deleteId)}>Yes, Delete</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Activity Dialog */}
      {showDialog && (
        <>
          <div className="modal-backdrop show" style={{ zIndex: 1040 }} onClick={closeDialog} />
          <div className="modal show d-block" style={{ zIndex: 1050 }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered mx-3">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-semibold">New Activity</h5>
                  <button type="button" className="btn-close" onClick={closeDialog} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <input
                    ref={inputRef}
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="e.g. Watered plants"
                    value={activityName}
                    onChange={e => setActivityName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    maxLength={80}
                  />
                </div>
                <div className="modal-footer border-0 pt-0 gap-2">
                  <button type="button" className="btn btn-light flex-fill" onClick={closeDialog}>Cancel</button>
                  <button type="button" className="btn btn-primary flex-fill" onClick={handleSave} disabled={!activityName.trim()}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
