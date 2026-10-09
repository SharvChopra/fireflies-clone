import Link from "next/link";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">F</div>
        <span>Fireflies</span>
      </div>

      <div className="nav-section">
        <div className="nav-label">Workspace</div>
        <Link className="nav-item active" href="/">
          <span>Meetings</span>
          <span>•</span>
        </Link>
        <Link className="nav-item" href="/search">
          <span>Search</span>
          <span>⌕</span>
        </Link>
        <button className="nav-item" type="button">
          <span>Notes</span>
          <span>✦</span>
        </button>
      </div>

      <div className="nav-section">
        <div className="nav-label">Account</div>
        <button className="nav-item" type="button">
          <span>Profile</span>
          <span>↗</span>
        </button>
        <button className="nav-item" type="button">
          <span>Settings</span>
          <span>⚙</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="profile-card">
          <div className="avatar">AS</div>
          <div>
            <div style={{ fontWeight: 700 }}>Ava Smith</div>
            <div
              style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.85rem" }}
            >
              Workspace admin
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
