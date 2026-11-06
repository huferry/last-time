import { useState, useEffect, useRef } from 'react';
import { db, auth, signInWithGoogle, signOutUser } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

const activitiesRef = collection(db, 'activities');

function formatTimeSince(isoDate) {
  const date = isoDate instanceof Timestamp ? isoDate.toDate() : new Date(isoDate);
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


export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not signed in
  const [authError, setAuthError] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [activityName, setActivityName] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [, forceUpdate] = useState(0);
  const inputRef = useRef(null);

  // Listen to auth state
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
  }, []);

  const handleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err.message);
    }
  };

  // Subscribe to Firestore activities in real time (only when signed in)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(activitiesRef, orderBy('lastTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActivities(snapshot.docs.map(d => ({ _id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Firestore listener error:', err);
      setLoading(false);
    });
    return unsubscribe;
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

  const openDialog = () => { setActivityName(''); setShowDialog(true); };
  const closeDialog = () => { setShowDialog(false); setActivityName(''); };

  const handleSave = async () => {
    const name = activityName.trim();
    if (!name) return;

    // Check if activity with same name already exists (case-insensitive)
    const q = query(activitiesRef, where('nameLower', '==', name.toLowerCase()));
    const existing = await getDocs(q);

    if (!existing.empty) {
      const existingDoc = existing.docs[0];
      await updateDoc(doc(db, 'activities', existingDoc.id), {
        lastTime: Timestamp.now(),
      });
    } else {
      await addDoc(activitiesRef, {
        name,
        nameLower: name.toLowerCase(),
        lastTime: Timestamp.now(),
      });
    }
    closeDialog();
  };

  const handleMarkDone = async (id) => {
    await updateDoc(doc(db, 'activities', id), {
      lastTime: Timestamp.now(),
    });
    setConfirmId(null);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'activities', id));
    setDeleteId(null);
  };

  // Auth loading
  if (user === undefined) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <i className="bi bi-clock-history text-primary" style={{ fontSize: '4rem' }}></i>
        <h1 className="fw-bold mt-3 mb-4">Last Time</h1>
        <button className="btn btn-dark btn-lg d-flex align-items-center gap-2 px-4" onClick={handleSignIn}>
          <i className="bi bi-google"></i> Sign in with Google
        </button>
        {authError && <div className="alert alert-danger mt-3 mx-3">{authError}</div>}
        <div className="text-muted mt-4" style={{ fontSize: '0.75rem' }}>
          v{__APP_VERSION__} &middot; {__BUILD_DATE__}
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Header */}
      <nav className="navbar navbar-dark bg-primary sticky-top shadow-sm">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold fs-5">
            <i className="bi bi-clock-history me-2"></i>Last Time
          </span>
          <button className="btn btn-sm btn-outline-light" onClick={signOutUser}>
            <i className="bi bi-box-arrow-right"></i>
          </button>
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

      {/* Version footer */}
      <div className="text-center text-muted py-3 mt-auto" style={{ fontSize: '0.75rem' }}>
        v{__APP_VERSION__} &middot; {__BUILD_DATE__}
      </div>
    </div>
  );
}
