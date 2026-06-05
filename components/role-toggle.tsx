"use client"

import { useState, useTransition } from "react"
import { signOut } from "next-auth/react"
import { Role, canAssignRole, getRoleLabel } from "@/types/enums"
import { Button } from "@/components/ui/button"
import { updateUserRole, transferSuperadmin } from "@/actions/admin"
import { toast } from "sonner"
import { Crown, ChevronDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface Campus { id: string; name: string }
interface Department { id: string; name: string }

interface Props {
  userId: string
  userName: string
  currentRole: Role
  isSelf: boolean
  callerRole: Role
  campuses: Campus[]
  departments: Department[]
}

const ALL_ROLES: Role[] = [
  Role.PROFESSOR,
  Role.ASSISTANT_DEAN,
  Role.CHAIRMAN,
  Role.COORDINATOR,
  Role.DEAN,
  Role.SUPER_ADMIN,
]

export function RoleToggle({
  userId,
  userName,
  currentRole,
  isSelf,
  callerRole,
  campuses,
  departments,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [transferOpen, setTransferOpen] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [pendingRole, setPendingRole] = useState<Role | null>(null)
  const [selectedCampus, setSelectedCampus] = useState("")
  const [selectedDept, setSelectedDept] = useState("")

  if (isSelf) {
    return <span className="text-xs text-muted-foreground italic">cannot change own role</span>
  }

  if (currentRole === Role.SUPER_ADMIN && callerRole !== Role.SUPER_ADMIN) {
    return <span className="text-xs text-muted-foreground italic">super admin</span>
  }

  const assignableRoles = ALL_ROLES.filter(
    (r) => r !== currentRole && canAssignRole(callerRole, r) && canAssignRole(callerRole, currentRole)
  )

  if (assignableRoles.length === 0) {
    return <span className="text-xs text-muted-foreground italic">{getRoleLabel(currentRole).toLowerCase()}</span>
  }

  const handleRoleSelect = (newRole: Role) => {
    if (newRole === Role.ASSISTANT_DEAN || newRole === Role.CHAIRMAN) {
      setPendingRole(newRole)
      setSelectedCampus("")
      setSelectedDept("")
      setScopeOpen(true)
      return
    }
    applyRoleChange(newRole)
  }

  const applyRoleChange = (newRole: Role, campusId?: string, departmentId?: string) => {
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole, campusId, departmentId)
      if (result?.error) { toast.error(result.error); return }
      toast.success(`${userName} is now ${getRoleLabel(newRole)}.`)
    })
  }

  const handleScopeConfirm = () => {
    if (!pendingRole) return
    if (pendingRole === Role.ASSISTANT_DEAN && !selectedCampus) {
      toast.error("Please select a campus.")
      return
    }
    if (pendingRole === Role.CHAIRMAN && !selectedDept) {
      toast.error("Please select a department.")
      return
    }
    setScopeOpen(false)
    applyRoleChange(
      pendingRole,
      pendingRole === Role.ASSISTANT_DEAN ? selectedCampus : undefined,
      pendingRole === Role.CHAIRMAN ? selectedDept : undefined
    )
  }

  const handleTransfer = () => {
    startTransition(async () => {
      const result = await transferSuperadmin(userId)
      if (result?.error) { toast.error(result.error); return }
      setTransferOpen(false)
      toast.success(`${userName} is now Super Admin. Signing you out…`)
      await new Promise((r) => setTimeout(r, 1500))
      await signOut({ callbackUrl: "/auth/signin" })
    })
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      {callerRole === Role.SUPER_ADMIN && currentRole !== Role.SUPER_ADMIN && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTransferOpen(true)}
            disabled={isPending}
            className="text-xs gap-1.5 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
          >
            <Crown className="w-3.5 h-3.5" />
            Transfer
          </Button>

          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Super Admin to {userName}?</DialogTitle>
                <DialogDescription>
                  <strong>{userName}</strong> will become the new Super Admin. You will be demoted to Dean and signed out immediately.
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
                  {isPending ? "Transferring..." : "Transfer Super Admin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending} className="text-xs gap-1.5">
            Change Role <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
            Current: {getRoleLabel(currentRole)}
          </div>
          <DropdownMenuSeparator />
          {assignableRoles.map((role) => (
            <DropdownMenuItem key={role} onClick={() => handleRoleSelect(role)}>
              {getRoleLabel(role)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Scope selection dialog for ASSISTANT_DEAN / CHAIRMAN */}
      <Dialog open={scopeOpen} onOpenChange={setScopeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign {pendingRole ? getRoleLabel(pendingRole) : ""} to {userName}
            </DialogTitle>
            <DialogDescription>
              {pendingRole === Role.ASSISTANT_DEAN
                ? "Select the campus this user will oversee."
                : "Select the department this user will oversee."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {pendingRole === Role.ASSISTANT_DEAN && (
              <div className="space-y-2">
                <Label>Campus</Label>
                <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {pendingRole === Role.CHAIRMAN && (
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScopeOpen(false)}>Cancel</Button>
            <Button onClick={handleScopeConfirm} disabled={isPending}>
              {isPending ? "Assigning..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
