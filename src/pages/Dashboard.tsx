import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useSession } from "../lib/useSession";
import "./admin.css";

type Status = "new" | "contacted" | "closed";
type DemoRequest = {
  id: string;
  name: string;
  venue: string | null;
  email: string;
  message: string | null;
  plan: string | null;
  status: Status;
  notification_sent: boolean;
  created_at: string;
};

const STATUSES: Status[] = ["new", "contacted", "closed"];

export default function Dashboard() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [rows, setRows] = useState<DemoRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [updating, setUpdating] = useState<string[]>([]);
  const [authorizedToken, setAuthorizedToken] = useState("");
  const [checking, setChecking] = useState(true);

  const email = session?.user?.email?.toLowerCase();
  const isOwner = Boolean(session && authorizedToken === session.access_token);
  useEffect(() => {
    let live = true;
    setChecking(true);
    setAuthorizedToken("");
    setRows([]);
    if (!session || !supabase) {
      setChecking(false);
      return;
    }
    supabase.rpc("is_admin_session").then(
      ({ data, error }) => {
        if (!live) return;
        if (!error && data === true) setAuthorizedToken(session.access_token);
        setChecking(false);
      },
      () => {
        if (live) setChecking(false);
      },
    );
    return () => {
      live = false;
    };
  }, [session]);

  useEffect(() => {
    const sb = supabase;
    if (!sb || !session || !isOwner) return;
    let live = true;
    const load = async () => {
      setFetching(true);
      setErr("");
      let query = sb
        .from("demo_requests")
        .select(
          "id,name,venue,email,message,plan,status,created_at,notification_sent",
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(page * 25, page * 25 + 25);
      if (filter !== "all") query = query.eq("status", filter);
      try {
        const { data, error } = await query;
        if (!live) return;
        if (error) {
          setRows([]);
          setErr("Could not load requests. Please refresh or sign in again.");
        } else {
          setRows(((data as DemoRequest[]) || []).slice(0, 25));
          setHasMore((data?.length || 0) > 25);
        }
      } catch {
        if (live) {
          setRows([]);
          setErr("Could not load requests. Please retry.");
        }
      } finally {
        if (live) setFetching(false);
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [session, isOwner, filter, page, refresh]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 864e5;
    return {
      total: rows.length,
      newCount: rows.filter((r) => r.status === "new").length,
      week: rows.filter((r) => new Date(r.created_at).getTime() > weekAgo)
        .length,
    };
  }, [rows]);

  const shown =
    filter === "all" ? rows : rows.filter((r) => r.status === filter);

  async function setStatus(id: string, status: Status) {
    if (!supabase || !isOwner || updating.includes(id)) return;
    setUpdating((ids) => [...ids, id]);
    setErr("");
    try {
      const { data, error } = await supabase
        .from("demo_requests")
        .update({ status })
        .eq("id", id)
        .select("id")
        .single();
      if (error || !data) throw new Error("Update failed");
      setRefresh((value) => value + 1);
    } catch {
      setErr("Status was not saved. Please retry or sign in again.");
    } finally {
      setUpdating((ids) => ids.filter((value) => value !== id));
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    navigate("/login");
  }

  // ---- gating ----
  if (!supabaseConfigured) {
    return (
      <AdminShell>
        <div className="dash__notice">
          <h1>Backend not connected</h1>
          <p>Owner access is currently unavailable.</p>
          <Link to="/" className="btn btn-ghost">
            ← Back to site
          </Link>
        </div>
      </AdminShell>
    );
  }
  if (loading || checking)
    return (
      <AdminShell>
        <div className="dash__notice">
          <p className="mono">Loading…</p>
        </div>
      </AdminShell>
    );
  if (!session) return <Navigate to="/login" replace />;
  if (!isOwner) {
    return (
      <AdminShell>
        <div className="dash__notice">
          <h1>Admin verification required</h1>
          <p>
            This account needs admin approval and authenticator verification.
          </p>
          <Link to="/login" className="btn btn-primary">
            Verify sign in
          </Link>
          <button className="btn btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="dash__topbar">
        <Link to="/" className="auth__brand">
          <span className="auth__mark" aria-hidden="true" />
          <span className="auth__wm">REVORA</span>
        </Link>
        <Link to="/" className="dash__siteLink">
          Visit website
        </Link>
      </div>
      <header className="dash__head">
        <div>
          <span className="eyebrow">Owner console</span>
          <h1 className="dash__title">Demo requests</h1>
          <p className="dash__intro">
            A clear place to follow up with your next venues.
          </p>
        </div>
        <div className="dash__headActions">
          <span className="mono dash__who">{email}</span>
          <button className="btn btn-ghost dash__signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <div className="dash__stats">
        <Stat label="Requests on this page" value={stats.total} />
        <Stat label="New on this page" value={stats.newCount} accent />
        <Stat label="This week on this page" value={stats.week} />
      </div>

      <div className="dash__toolbar">
        <div className="dash__filters">
          {(["all", ...STATUSES] as const).map((f) => (
            <button
              key={f}
              className={`dash__filter ${filter === f ? "is-active" : ""}`}
              onClick={() => {
                setFilter(f);
                setPage(0);
              }}
              aria-pressed={filter === f}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          className="btn btn-ghost dash__refresh"
          onClick={() => setRefresh((value) => value + 1)}
          disabled={fetching}
        >
          Refresh requests
        </button>
      </div>
      {err && (
        <p className="auth__error" role="alert">
          {err}
        </p>
      )}

      {fetching ? (
        <div className="dash__empty" role="status">
          <span className="dash__emptyIcon" aria-hidden="true">
            …
          </span>
          <h2>Loading requests</h2>
          <p>Getting your latest conversations.</p>
        </div>
      ) : err && rows.length === 0 ? (
        <div className="dash__empty">
          <h2>Requests couldn’t be loaded.</h2>
          <p>
            Use Refresh requests to try again, or sign in again if your session
            has expired.
          </p>
        </div>
      ) : shown.length === 0 ? (
        <div className="dash__empty">
          <span className="dash__emptyIcon" aria-hidden="true">
            +
          </span>
          <h2>No requests here yet.</h2>
          <p>
            {filter === "all"
              ? "New demo requests will appear here when they arrive."
              : `No ${filter} requests on this page. Try another filter or return to the previous page.`}
          </p>
          <Link to="/" className="btn btn-ghost">
            View your website
          </Link>
        </div>
      ) : (
        <div className="dash__tableWrap">
          <table className="dash__table">
            <caption className="sr-only">
              Venue demo requests and follow-up status
            </caption>
            <thead>
              <tr>
                <th>Name</th>
                <th>Venue</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Message</th>
                <th>When</th>
                <th>Email notification</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td data-th="Name">{r.name}</td>
                  <td data-th="Venue">{r.venue || "—"}</td>
                  <td data-th="Email">
                    <a href={`mailto:${r.email}`}>{r.email}</a>
                  </td>
                  <td data-th="Plan">{r.plan || "—"}</td>
                  <td data-th="Message" className="dash__msg">
                    {r.message || "—"}
                  </td>
                  <td data-th="When" className="mono">
                    {new Date(r.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td data-th="Email notification">
                    {r.notification_sent
                      ? "Accepted by email service"
                      : "Pending — check delivery"}
                  </td>
                  <td data-th="Status">
                    <select
                      className={`dash__status is-${r.status}`}
                      value={r.status}
                      aria-label={`Status for ${r.name}`}
                      disabled={updating.includes(r.id)}
                      onChange={(e) =>
                        setStatus(r.id, e.target.value as Status)
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div
        className="dash__toolbar dash__pagination"
        aria-label="Request pages"
      >
        <button
          className="btn btn-ghost"
          disabled={page === 0 || fetching}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          className="btn btn-ghost"
          disabled={!hasMore || fetching}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </div>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin">
      <div className="admin__inner">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className={`dash__stat ${accent ? "is-accent" : ""}`}>
      <span className="dash__statValue">{value}</span>
      <span className="dash__statLabel mono">{label}</span>
    </div>
  );
}
