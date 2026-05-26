"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Role } from "@/types/enums"
import { Button } from "@/components/ui/button"
import { updateUserRole, transferSuperadmin } from "@/actions/admin"
import { toast } from "sonner"
import { ShieldCheck, UserRound, Crown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  userId: string
  userName: string
  currentRole: Role
  isSelf: boolean
  callerRole: Role
}

export function RoleToggle({ userId, userName, currentRole, isSelf, callerRole }: Props) {
  const [isPending, startTransition] = useTransition()
  const [transferOpen, setTransferOpen] = useState(false)
  const router = useRouter()
  const { update } = useSession()

  if (isSelf) {
    return <span className="text-xs text-muted-foreground italic">cannot change own role</span>
  }

  if (currentRole === "SUPERADMIN") {
    return <span className="text-xs text-muted-foreground italic">superadmin</span>
  }

  if (currentRole === "ADMIN" && callerRole !== "SUPERADMIN") {
    return <span className="text-xs text-muted-foreground italic">admin</span>
  }

  const newRole = currentRole === "ADMIN" ? Role.PROFESSOR : Role.ADMIN
  const toggleLabel = currentRole === "ADMIN" ? "Demote to Professor" : "Promote to Admin"

  const handleToggle = () => {
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole)
      if (result?.error) { toast.error(result.error); return }
      toast.success(newRole === "ADMIN" ? "User promoted to admin." : "User demoted to professor.")
    })
  }

  const handleTransfer = () => {
    startTransition(async () => {
      const result = await transferSuperadmin(userId)
      if (result?.error) { toast.error(result.error); return }
      setTransferOpen(false)
      toast.success(`${userName} is now superadmin. You have been demoted to admin.`)
      // Refresh JWT then re-render server components so stale role is cleared immediately
      await update()
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      {callerRole === "SUPERADMIN" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTransferOpen(true)}
            disabled={isPending}
            className="text-xs gap-1.5 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
          >
            <Crown className="w-3.5 h-3.5" />
            Transfer Superadmin
          </Button>

          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Superadmin to {userName}?</DialogTitle>
                <DialogDescription>
                  <strong>{userName}</strong> will become the new Superadmin.
                  You will be demoted to Admin. This cannot be undone from the UI.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
                <Button
                  variant="default"
                  className="bg-violet-600 hover:bg-violet-700"
                  onClick={handleTransfer}
                  disabled={isPending}
                >
                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                  {isPending ? "Transferring..." : "Transfer Superadmin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={isPending}
        className="text-xs gap-1.5"
      >
        {newRole === "ADMIN" ? (
          <ShieldCheck className="w-3.5 h-3.5" />
        ) : (
          <UserRound className="w-3.5 h-3.5" />
        )}
        {isPending ? "Updating..." : toggleLabel}
      </Button>
    </div>
  )
}
