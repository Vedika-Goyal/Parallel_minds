import { useState, useEffect, useRef } from 'react';
import ResumePacket from './components/ResumePacket';

// --- HELPER FUNCTIONS ---
function fmt(secs) {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function isUrl(s) {
  try { new URL(s.startsWith('http') ? s : 'https://' + s); return true; } catch { return false; }
}

function getDomain(url) {
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace('www.', ''); } catch { return url; }
}

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [showResume, setShowResume] = useState(null);
  const [form, setForm] = useState({ title: '', project: '' });
  const [newItem, setNewItem] = useState('');
  const [newLink, setNewLink] = useState('');
  const [tick, setTick] = useState(0);

  // --- 1. NOTIFICATION & FOCUS SHIELD LOGIC ---
  useEffect(() => {
    // Request Permission on Load
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const sendNotify = (title, body) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: '◈' });
    }
  };

  // Detect Tab Switching (The "Context-Switch" Guard)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && activeId) {
        const activeSession = sessions.find(s => s.id === activeId);
        sendNotify(
          "Focus Shield Active ◈", 
          `Don't drift! You were in the middle of: ${activeSession.title}`
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [activeId, sessions]);

  // --- 2. TIMER & CORE LOGIC ---
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  function liveElapsed(s) {
    if (s.status !== 'active') return s.elapsed;
    return s.elapsed + Math.floor((Date.now() - s.startedAt) / 1000);
  }

  function createSession() {
    if (!form.title.trim()) return;
    const s = {
      id: Date.now(), title: form.title,
      project: form.project || 'General',
      notes: '', checklist: [], links: [],
      elapsed: 0, status: 'active', startedAt: Date.now(),
    };
    setSessions(prev => [s, ...prev]);
    setActiveId(s.id);
    setShowResume(null);
    setForm({ title: '', project: '' });
    sendNotify("Session Started", `Tracking focus for ${s.title}`);
  }

  function pauseSession(id) {
    const session = sessions.find(s => s.id === id);
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'paused', elapsed: s.elapsed + Math.floor((Date.now() - s.startedAt) / 1000) } : s
    ));
    setActiveId(null);
    sendNotify("Session Paused", `Context saved. Check your AI Brief when you're ready.`);
  }

  function resumeSession(id) {
    setSessions(prev => prev.map(s => {
      if (s.id === activeId && activeId !== id)
        return { ...s, status: 'paused', elapsed: s.elapsed + Math.floor((Date.now() - s.startedAt) / 1000) };
      if (s.id === id) return { ...s, status: 'active', startedAt: Date.now() };
      return s;
    }));
    setActiveId(id);
    setShowResume(null);
  }

  // --- 3. HELPER UPDATES ---
  function updateNotes(id, notes) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, notes } : s));
  }

  function addCheckItem(id) {
    if (!newItem.trim()) return;
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, checklist: [...s.checklist, { id: Date.now(), label: newItem, done: false }] } : s
    ));
    setNewItem('');
  }

  function toggleCheck(sid, iid) {
    setSessions(prev => prev.map(s =>
      s.id === sid ? { ...s, checklist: s.checklist.map(i => i.id === iid ? { ...i, done: !i.done } : i) } : s
    ));
  }

  function deleteCheck(sid, iid) {
    setSessions(prev => prev.map(s =>
      s.id === sid ? { ...s, checklist: s.checklist.filter(i => i.id !== iid) } : s
    ));
  }

  function addLink(id) {
    if (!newLink.trim() || !isUrl(newLink)) return;
    const url = newLink.startsWith('http') ? newLink : 'https://' + newLink;
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, links: [...s.links, { id: Date.now(), url, label: getDomain(url) }] } : s
    ));
    setNewLink('');
  }

  function removeLink(sid, lid) {
    setSessions(prev => prev.map(s =>
      s.id === sid ? { ...s, links: s.links.filter(l => l.id !== lid) } : s
    ));
  }

  const active = sessions.find(s => s.id === activeId);
  const paused = sessions.filter(s => s.status === 'paused');
  const elapsed = active ? liveElapsed(active) : 0;
  const checkDone = active ? active.checklist.filter(i => i.done).length : 0;
  const checkTotal = active ? active.checklist.length : 0;

  return (
    <div style={styles.page}>
      {/* Dynamic Keyframes for the "Breathe" Dot */}
      <style>{`
        @keyframes breathe {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      
      <div style={styles.dotGrid} />

      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={{ color: '#c4607e' }}>◈</span> Mission Control
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {active && (
            <div style={styles.liveTimer}>
              <div style={styles.liveDot} />
              {fmt(elapsed)}
            </div>
          )}
          <div style={{ ...styles.statusDot, background: active ? '#2d8c66' : '#d4cdc6' }} />
        </div>
      </header>

      <div style={styles.body}>
        <div style={styles.col}>
          {!active && (
            <div style={styles.card}>
              <div style={styles.label}>New Session</div>
              <input style={styles.input} placeholder="Task title…" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && createSession()} />
              <input style={styles.input} placeholder="Project (optional)" value={form.project}
                onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && createSession()} />
              <button style={styles.btnPrimary} onClick={createSession}>+ Start Session</button>
            </div>
          )}

          {active && (
            <div style={styles.card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={styles.sessionTitle}>{active.title}</div>
                  <div style={styles.sessionMeta}>{active.project} · {fmt(elapsed)} logged</div>
                </div>
                {checkTotal > 0 && (
                  <div style={styles.progressWrap}>
                    <div style={styles.progressBg}>
                      <div style={{ ...styles.progressFill, width: `${(checkDone / checkTotal) * 100}%` }} />
                    </div>
                    <div style={styles.progressLabel}>{checkDone}/{checkTotal}</div>
                  </div>
                )}
              </div>

              <textarea style={styles.textarea} placeholder="Notes-in-progress…"
                value={active.notes} onChange={e => updateNotes(active.id, e.target.value)} />

              <div style={styles.label}>Checklist</div>
              {active.checklist.map(item => (
                <div key={item.id} style={styles.checkItem}>
                  <div
                    style={{ ...styles.customCheck, ...(item.done ? styles.customCheckDone : {}) }}
                    onClick={() => toggleCheck(active.id, item.id)}
                  >
                    {item.done && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ ...styles.checkLabel, ...(item.done ? styles.checkLabelDone : {}) }}>
                    {item.label}
                  </span>
                  <button style={styles.deleteBtn} onClick={() => deleteCheck(active.id, item.id)}>×</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...styles.input, flex: 1 }} placeholder="Add item…"
                  value={newItem} onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCheckItem(active.id)} />
                <button style={styles.btnSm} onClick={() => addCheckItem(active.id)}>+</button>
              </div>

              <div style={styles.label}>Links</div>
              {active.links.length > 0 && (
                <div style={styles.linksWrap}>
                  {active.links.map(link => (
                    <div key={link.id} style={styles.linkChip}>
                      <a href={link.url} target="_blank" rel="noreferrer" style={styles.linkAnchor}>{link.label}</a>
                      <button style={styles.chipDel} onClick={() => removeLink(active.id, link.id)}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...styles.input, flex: 1 }} placeholder="Paste URL…"
                  value={newLink} onChange={e => setNewLink(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLink(active.id)} />
                <button style={styles.btnSm} onClick={() => addLink(active.id)}>+</button>
              </div>

              <button style={styles.btnPause} onClick={() => pauseSession(active.id)}>⏸ Pause Session</button>
            </div>
          )}

          {paused.length > 0 && (
            <div style={styles.card}>
              <div style={styles.label}>Paused Sessions</div>
              {paused.map(ps => {
                const pendingCount = ps.checklist.filter(i => !i.done).length;
                return (
                  <div key={ps.id} style={styles.pausedRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.pausedTitle}>{ps.title}</div>
                      <div style={styles.pausedMeta}>
                        {ps.project} · {fmt(ps.elapsed)}
                        {pendingCount > 0 && <span style={{ color: '#b86820' }}> · {pendingCount} pending</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button style={styles.btnResume} onClick={() => resumeSession(ps.id)}>Resume</button>
                      <button style={styles.btnBrief} onClick={() => setShowResume(ps)}>AI Brief</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.col}>
          {showResume ? (
            <ResumePacket
              session={showResume}
              onResume={() => resumeSession(showResume.id)}
            />
          ) : (
            <div style={styles.emptyRight}>
              <div style={{ fontSize: 28, opacity: 0.35 }}>◈</div>
              <div style={{ fontSize: 12, color: '#9b9189', textAlign: 'center', lineHeight: 1.7 }}>
                Pause a session and click<br />"AI Brief" to generate<br />your resume packet
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:         { minHeight: '100vh', background: '#f5f0eb', color: '#2d2a26', fontFamily: "'DM Sans', sans-serif", position: 'relative' },
  dotGrid:      { position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(circle, #c8bfb5 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.35, pointerEvents: 'none', zIndex: 0 },
  header:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 32px', background: 'rgba(245,240,235,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e0d8cf', position: 'sticky', top: 0, zIndex: 100 },
  brand:        { fontWeight: '700', fontSize: 20, color: '#2d2a26', display: 'flex', alignItems: 'center', gap: 10 },
  liveTimer:    { display: 'flex', alignItems: 'center', gap: 7, background: '#f0fdf8', border: '1px solid #b8e8d4', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#2d8c66', fontWeight: 600 },
  liveDot:      { width: 6, height: 6, borderRadius: '50%', background: '#2d8c66', animation: 'breathe 2s ease-in-out infinite' },
  statusDot:    { width: 8, height: 8, borderRadius: '50%', transition: 'background 0.4s' },
  body:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: '28px 32px', maxWidth: 1060, margin: '0 auto', position: 'relative', zIndex: 1 },
  col:          { display: 'flex', flexDirection: 'column', gap: 16 },
  card:         { background: '#faf7f4', border: '1px solid #e0d8cf', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' },
  label:        { fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9b9189' },
  input:        { background: '#efe9e2', border: '1px solid #e0d8cf', borderRadius: 12, color: '#2d2a26', fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: '10px 14px', outline: 'none' },
  textarea:     { background: '#efe9e2', border: '1px solid #e0d8cf', borderRadius: 12, color: '#2d2a26', fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: '10px 14px', minHeight: 120, resize: 'vertical', outline: 'none', lineHeight: 1.6 },
  sessionTitle: { fontWeight: '700', fontSize: 18, color: '#2d2a26', lineHeight: 1.2 },
  sessionMeta:  { fontSize: 11, color: '#9b9189', marginTop: 4 },
  progressWrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  progressBg:   { width: 56, height: 6, background: '#efe9e2', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #b8e8d4, #2d8c66)', borderRadius: 99, transition: 'width 0.4s' },
  progressLabel:{ fontSize: 10, color: '#9b9189' },
  checkItem:    { display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderBottom: '1px solid #efe9e2' },
  customCheck:  { width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #e0d8cf', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  customCheckDone: { background: '#2d8c66', borderColor: '#2d8c66' },
  checkLabel:   { flex: 1, fontSize: 13, color: '#2d2a26', transition: 'all 0.2s' },
  checkLabelDone:{ textDecoration: 'line-through', color: '#9b9189' },
  deleteBtn:    { background: 'none', border: 'none', color: '#d4cdc6', cursor: 'pointer', fontSize: 18, padding: '0 2px' },
  linksWrap:    { display: 'flex', flexWrap: 'wrap', gap: 6 },
  linkChip:     { display: 'flex', alignItems: 'center', gap: 5, background: '#f0f7fd', border: '1px solid #b8d8f2', borderRadius: 20, padding: '3px 10px', fontSize: 11 },
  linkAnchor:   { color: '#2d6c9e', textDecoration: 'none', fontWeight: 600 },
  chipDel:      { background: 'none', border: 'none', color: '#9b9189', cursor: 'pointer', fontSize: 13 },
  pausedRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #efe9e2' },
  pausedTitle:  { fontSize: 13, fontWeight: 600, color: '#2d2a26', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pausedMeta:   { fontSize: 11, color: '#9b9189', marginTop: 2 },
  btnPrimary:   { width: '100%', background: '#2d2a26', color: '#f5f0eb', border: 'none', borderRadius: 12, padding: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnPause:     { width: '100%', background: '#fdf0f4', color: '#c4607e', border: '1px solid #f2b8c6', borderRadius: 12, padding: 11, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSm:        { background: '#efe9e2', border: '1px solid #e0d8cf', borderRadius: 8, color: '#2d2a26', fontFamily: "'DM Sans', sans-serif", fontSize: 12, padding: '5px 12px', cursor: 'pointer' },
  btnResume:    { background: '#f0fdf8', border: '1px solid #b8e8d4', borderRadius: 8, color: '#2d8c66', fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, padding: '6px 12px', cursor: 'pointer' },
  btnBrief:     { background: '#f7f0fd', border: '1px solid #d4b8f2', borderRadius: 8, color: '#7c4db8', fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, padding: '6px 12px', cursor: 'pointer' },
  emptyRight:   { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, border: '2px dashed #e0d8cf', borderRadius: 20, gap: 12 },
};