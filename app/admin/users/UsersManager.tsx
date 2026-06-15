"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUser,
  updateUser,
  deleteUser,
  setUserStatus,
  setUserRole,
  createOrganization,
  resetUserDevice,
} from "@/lib/actions/users";
import { formatDateTime } from "@/lib/format";
import UsersImport from "./UsersImport";
import type { Organization, Profile } from "@/lib/types";

type UserRow = Profile & { organization: { id: string; name: string } | null };

export default function UsersManager({
  users,
  organizations,
  lastLogin = {},
  currentUserId,
}: {
  users: UserRow[];
  organizations: Pick<Organization, "id" | "name">[];
  lastLogin?: Record<string, string | null>;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [newOrg, setNewOrg] = useState("");

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await createUser(fd);
    setPending(false);
    if (!res.ok) return setError(res.error);
    (e.target as HTMLFormElement).reset();
    setShowCreate(false);
    router.refresh();
  }

  async function addOrg() {
    if (!newOrg.trim()) return;
    setError(null);
    const res = await createOrganization(newOrg);
    if (!res.ok) return setError(res.error);
    setNewOrg("");
    router.refresh();
  }

  async function onEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await updateUser(new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  async function onDelete(u: UserRow) {
    if (!confirm(`למחוק את "${u.full_name}"? הפעולה בלתי הפיכה.`)) return;
    setError(null);
    const res = await deleteUser(u.id);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  async function toggleStatus(u: UserRow) {
    const res = await setUserStatus(u.id, u.status === "active" ? "blocked" : "active");
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  async function toggleRole(u: UserRow) {
    const res = await setUserRole(u.id, u.role === "admin" ? "user" : "admin");
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  async function resetDevice(u: UserRow) {
    if (!confirm(`לאפס את קשירת המכשיר של "${u.full_name}"? המשתמש יוכל להתחבר ממכשיר חדש.`)) return;
    const res = await resetUserDevice(u.id);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-ink">ניהול משתמשים</h1>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
        >
          {showCreate ? "סגירה" : "+ משתמש חדש"}
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-brand-danger/10 px-4 py-2 text-sm text-brand-danger">{error}</p>
      )}

      {showCreate && (
        <form
          onSubmit={onCreate}
          className="grid gap-3 rounded-2xl border border-brand-line bg-brand-surface p-5 sm:grid-cols-2"
        >
          <Field name="full_name" label="שם מלא" required />
          <Field name="email" label="אימייל" type="email" dir="ltr" required />
          <Field name="phone" label="טלפון" dir="ltr" required />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-brand-ink">סוג משתמש</span>
            <select name="role" className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5">
              <option value="user">משתמש רגיל</option>
              <option value="admin">מנהל מערכת</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-brand-ink">ארגון</span>
            <select
              name="organization_id"
              className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5"
            >
              <option value="">— ללא —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "יוצר..." : "יצירת משתמש"}
            </button>
          </div>
        </form>
      )}

      {editing && (
        <form
          key={editing.id}
          onSubmit={onEdit}
          className="grid gap-3 rounded-2xl border border-brand-primary bg-brand-surface p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-brand-ink">
              עריכת משתמש: {editing.full_name}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-sm text-brand-muted underline"
            >
              ביטול
            </button>
          </div>
          <input type="hidden" name="id" value={editing.id} />
          <Field name="full_name" label="שם מלא" required defaultValue={editing.full_name} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-brand-ink">אימייל (קבוע)</span>
            <input
              value={editing.email}
              readOnly
              dir="ltr"
              className="w-full cursor-not-allowed rounded-xl border border-brand-line bg-brand-bg px-3 py-2.5 text-brand-muted"
            />
          </label>
          <Field name="phone" label="טלפון" dir="ltr" required defaultValue={editing.phone} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-brand-ink">סוג משתמש</span>
            <select
              name="role"
              defaultValue={editing.role}
              className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5"
            >
              <option value="user">משתמש רגיל</option>
              <option value="admin">מנהל מערכת</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-brand-ink">ארגון</span>
            <select
              name="organization_id"
              defaultValue={editing.organization_id ?? ""}
              className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5"
            >
              <option value="">— ללא —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 space-y-2 rounded-xl border border-brand-line bg-brand-bg p-3">
            <span className="block text-sm font-medium text-brand-ink">הרשאות תצוגה</span>
            <label className="flex items-center gap-2">
              <input
                name="show_purchases"
                type="checkbox"
                defaultChecked={editing.show_purchases}
                className="h-5 w-5 accent-brand-primary"
              />
              <span className="text-sm text-brand-ink">הצגת הרכישות במסך החיפוש</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                name="show_my_purchases"
                type="checkbox"
                defaultChecked={editing.show_my_purchases}
                className="h-5 w-5 accent-brand-primary"
              />
              <span className="text-sm text-brand-ink">הצגת מסך &quot;הרכישות שלי&quot;</span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "שומר..." : "שמירת שינויים"}
            </button>
          </div>
        </form>
      )}

      {/* טעינת משתמשים מאקסל (סעיף 5) */}
      <UsersImport />

      {/* יצירת ארגון מהיר */}
      <div className="flex items-end gap-2 rounded-2xl border border-brand-line bg-brand-surface p-4">
        <label className="flex-1">
          <span className="mb-1 block text-sm font-medium text-brand-ink">הוספת ארגון</span>
          <input
            value={newOrg}
            onChange={(e) => setNewOrg(e.target.value)}
            placeholder="שם הארגון (כפי שמופיע בעמודת הלקוח)"
            className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5"
          />
        </label>
        <button
          onClick={addOrg}
          className="rounded-xl border border-brand-primary px-4 py-2.5 text-sm font-semibold text-brand-primary"
        >
          הוספה
        </button>
      </div>

      <div className="table-scroll rounded-2xl border border-brand-line bg-brand-surface">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-brand-primary-light text-brand-primary-dark">
            <tr>
              <th className="px-3 py-2 text-right">שם</th>
              <th className="px-3 py-2 text-right">אימייל</th>
              <th className="px-3 py-2 text-right">ארגון</th>
              <th className="px-3 py-2 text-right">תפקיד</th>
              <th className="px-3 py-2 text-right">כניסה אחרונה</th>
              <th className="px-3 py-2 text-right">סטטוס</th>
              <th className="px-3 py-2 text-right">מכשיר</th>
              <th className="px-3 py-2 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-brand-line/60">
                <td className="px-3 py-2 text-brand-ink">{u.full_name}</td>
                <td className="px-3 py-2 text-brand-muted" dir="ltr">
                  {u.email}
                </td>
                <td className="px-3 py-2 text-brand-ink">{u.organization?.name ?? "—"}</td>
                <td className="px-3 py-2">{u.role === "admin" ? "מנהל" : "רגיל"}</td>
                <td className="px-3 py-2 text-brand-muted" dir="ltr">
                  {lastLogin[u.id] ? formatDateTime(lastLogin[u.id]) : "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.status === "active"
                        ? "bg-brand-primary-light text-brand-primary-dark"
                        : "bg-brand-danger/10 text-brand-danger"
                    }`}
                  >
                    {u.status === "active" ? "פעיל" : "חסום"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {u.role === "admin" ? (
                    <span className="text-brand-muted">—</span>
                  ) : u.active_device_id ? (
                    <span className="text-brand-ink" title={u.active_device_label ?? undefined}>
                      קשור{u.device_bound_at ? ` · ${formatDateTime(u.device_bound_at)}` : ""}
                    </span>
                  ) : (
                    <span className="text-brand-muted">לא קשור</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setEditing(u);
                        setError(null);
                      }}
                      className="rounded-lg border border-brand-primary px-2 py-1 text-xs font-semibold text-brand-primary"
                    >
                      ערוך
                    </button>
                    <button
                      onClick={() => toggleStatus(u)}
                      className="rounded-lg border border-brand-line px-2 py-1 text-xs"
                    >
                      {u.status === "active" ? "חסום" : "הפעל"}
                    </button>
                    <button
                      onClick={() => toggleRole(u)}
                      className="rounded-lg border border-brand-line px-2 py-1 text-xs"
                    >
                      {u.role === "admin" ? "הפוך לרגיל" : "הפוך למנהל"}
                    </button>
                    {u.role !== "admin" && u.active_device_id && (
                      <button
                        onClick={() => resetDevice(u)}
                        className="rounded-lg border border-brand-line px-2 py-1 text-xs"
                      >
                        אפס מכשיר
                      </button>
                    )}
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => onDelete(u)}
                        className="rounded-lg border border-brand-danger px-2 py-1 text-xs font-semibold text-brand-danger"
                      >
                        מחק
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-brand-muted">
                  אין משתמשים עדיין.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  dir,
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-brand-ink">{label}</span>
      <input
        name={name}
        type={type}
        dir={dir}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5"
      />
    </label>
  );
}
