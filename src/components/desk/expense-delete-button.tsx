"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { deleteExpense } from "@/lib/actions/cash-actions";

export function ExpenseDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-5"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deleteExpense(id);
          router.refresh();
        })
      }
    >
      <X className="size-3" />
    </Button>
  );
}
