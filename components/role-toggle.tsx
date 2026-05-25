"use client"

import { useTransition } from "react"
import { Role } from "@/types/enums"
import { Button } from "@/components/ui/button"
import { updateUserRole } from "@/actions/admin"
import { toast } from "sonner"
import { ShieldCheck, UserRound } from "lucide-react"

interface Props {
  userId: string
  currentRole: Role
  isSelf: boolean
  callerRole: Role
}

export function RoleToggle({ userId, currentRole, isSelf, callerRole }: Props) {
  const [isPending, startTransition] = useTransition()

  if (isSelf) {
    return (
      <span className="text-xs text-muted-foreground italic">cannot demote self</span>
    )
  }

  // Only SUPERADMIN can touch other SUPERADMIN or ADMIN accounts
  if (currentRole === "SUPERADMIN") {
    return <span className="text-xs text-muted-foreground italic">superadmin</span>
  }

  // Regular admins can only promote professors, not demote other admins
  if (currentRole === "ADMIN" && callerRole !== "SUPERADMIN") {
    return <span className="text-xs text-muted-foreground italic">admin</span>
  }

  const newRole = currentRole === "ADMIN" ? Role.PROFESSOR : Role.ADMIN
  const label = currentRole === "ADMIN" ? "Demote to Professor" : "Promote to Admin"

  const handleClick = () => {
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        newRole === "ADMIN"
          ? "User promoted to admin."
          : "User demoted to professor."
      )
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs gap-1.5"
    >
      {newRole === "ADMIN" ? (
        <ShieldCheck className="w-3.5 h-3.5" />
      ) : (
        <UserRound className="w-3.5 h-3.5" />
      )}
      {isPending ? "Updating..." : label}
    </Button>
  )
}
