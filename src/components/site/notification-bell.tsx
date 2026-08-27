"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { markNotificationRead, dismissNotification, dismissAllNotifications } from "@/lib/actions/notification-actions";
import type { NotificationSeverity } from "@/generated/prisma/client";

type NotificationItem = {
  id: string;
  message: string;
  severity: NotificationSeverity;
  readAt: Date | null;
  createdAt: Date;
};

const SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  critical: "border-red-500/30 bg-red-500/15 text-red-500",
  warning: "border-amber-500/30 bg-amber-500/15 text-amber-500",
  info: "border-blue-500/30 bg-blue-500/15 text-blue-400",
};

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const criticalCount = notifications.filter((n) => n.severity === "critical").length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {notifications.length > 0 && (
            <span
              className={`absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                criticalCount > 0 ? "bg-red-500" : "bg-amber-500"
              }`}
            >
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">
            Notifiche {unreadCount > 0 && <span className="text-muted-foreground">({unreadCount} non lette)</span>}
          </span>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await dismissAllNotifications();
                  router.refresh();
                })
              }
            >
              Segna tutte come lette
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nessuna notifica attiva.</p>
          )}
          {notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-2 border-b border-border/60 px-3 py-2 last:border-0">
              <Badge variant="outline" className={`mt-0.5 shrink-0 ${SEVERITY_COLOR[n.severity]}`}>
                {n.severity}
              </Badge>
              <p className={`flex-1 text-xs ${n.readAt ? "text-muted-foreground" : "text-foreground"}`}>{n.message}</p>
              <div className="flex shrink-0 gap-1">
                {!n.readAt && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await markNotificationRead(n.id);
                        router.refresh();
                      })
                    }
                    title="Segna come letta"
                  >
                    <Check className="size-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await dismissNotification(n.id);
                      router.refresh();
                    })
                  }
                  title="Ignora"
                >
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
