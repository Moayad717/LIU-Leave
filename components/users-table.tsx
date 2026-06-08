"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { Search, ShieldOff, Shield, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RoleToggle } from "@/components/role-toggle"
import { getRoleLabel, canAssignRole, type Role } from "@/types/enums"
import { blockUser, deleteUser } from "@/actions/admin"
import { toast } from "sonner"

interface Campus { id: string; name: string }
interface Department { id: string; name: string }

interface UserRow {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: Role
  blocked: boolean
  createdAt: Date
  campus: { name: string } | null
  department: { name: string } | null
}

interface Props {
  users: UserRow[]
  currentUserId: string
  currentUserRole: Role
  campuses: Campus[]
  departments: Department[]
}

function RoleBadge({ role }: { role: Role }) {
  switch (role) {
    case "SUPER_ADMIN":
      return <Badge className="bg-violet-600 hover:bg-violet-700">Super Admin</Badge>
    case "DEAN":
      return <Badge className="bg-blue-600 hover:bg-blue-700">Dean</Badge>
    case "COORDINATOR":
      return <Badge className="bg-teal-600 hover:bg-teal-700">Coordinator</Badge>
    case "ASSISTANT_DEAN":
      return <Badge className="bg-amber-600 hover:bg-amber-700">Asst. Dean</Badge>
    case "CHAIRMAN":
      return <Badge className="bg-orange-600 hover:bg-orange-700">Chairman</Badge>
    default:
      return <Badge variant="secondary">Professor</Badge>
  }
}

export function UsersTable({ users, currentUserId, currentUserRole, campuses, departments }: Props) {
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase()
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.campus?.name.toLowerCase().includes(q) ||
          u.department?.name.toLowerCase().includes(q) ||
          getRoleLabel(u.role).toLowerCase().includes(q)
        )
      })
    : users

  function handleBlock(user: UserRow) {
    startTransition(async () => {
      const res = await blockUser(user.id, !user.blocked)
      if (res?.error) toast.error(res.error)
      else toast.success(user.blocked ? `${user.name ?? "User"} unblocked.` : `${user.name ?? "User"} blocked.`)
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    startTransition(async () => {
      const res = await deleteUser(target.id)
      if (res?.error) toast.error(res.error)
      else toast.success(`${target.name ?? "User"} has been deleted.`)
    })
  }

  return (
    <div className="space-y-4">
      <div className="relative px-6 pt-2">
        <Search className="absolute left-9 top-4.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, campus, department or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          No users match &quot;{search}&quot;.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => {
              const initials = user.name
                ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                : user.email?.[0].toUpperCase() ?? "U"
              const isSelf = user.id === currentUserId
              const canManage = !isSelf && canAssignRole(currentUserRole, user.role)

              return (
                <TableRow key={user.id} className={user.blocked ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-tight flex items-center gap-1.5">
                          {user.name ?? "—"}
                          {isSelf && (
                            <span className="text-xs text-muted-foreground">(you)</span>
                          )}
                          {user.blocked && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Blocked</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.campus?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{user.department?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(user.createdAt, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <RoleToggle
                        userId={user.id}
                        userName={user.name ?? user.email ?? "User"}
                        currentRole={user.role}
                        isSelf={isSelf}
                        callerRole={currentUserRole}
                        campuses={campuses}
                        departments={departments}
                      />
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${user.blocked ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}`}
                            onClick={() => handleBlock(user)}
                            disabled={isPending}
                            title={user.blocked ? "Unblock user" : "Block user"}
                          >
                            {user.blocked ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(user)}
                            disabled={isPending}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name ?? deleteTarget?.email ?? "this user"}</strong> and all their leave requests. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
