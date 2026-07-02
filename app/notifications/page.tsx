"use client";
import { useEffect, useState } from "react";
import { Bell, MessageSquare, Zap, List, TrendingDown, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";

const iconMap: Record<string, React.ElementType> = {
  match: Zap, message: MessageSquare, listing: List, price: TrendingDown,
};

type Notification = {
  id: string; type: string; title: string; message: string;
  is_read: boolean; created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/notifications")
      .then((res) => setNotifications(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    await api.patch("/api/notifications", { markAllRead: true });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    await api.patch("/api/notifications", { id });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <button onClick={markAllRead} className="text-sm text-indigo-600 hover:underline">Mark all as read</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No notifications yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {notifications.map((n) => {
            const Icon = iconMap[n.type] ?? Bell;
            return (
              <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
                className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? "bg-indigo-50" : ""}`}>
                <div className={`p-2 rounded-lg flex-shrink-0 ${!n.is_read ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${!n.is_read ? "text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                  <p className={`text-xs mt-0.5 ${!n.is_read ? "text-gray-700" : "text-gray-500"}`}>{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
