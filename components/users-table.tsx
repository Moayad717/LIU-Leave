"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { Search, ShieldOff, Shield, Trash2, ChevronsUpDown } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RoleToggle } from "@/components/role-toggle"
import { getRoleLabel, canAssignRole, Role, type Role as RoleType } from "@/types/enums"
import { blockUser, deleteUser } from "@/actions/admin"

const ROLE_OPTIONS: RoleType[] = [
  Role.SUPER_ADMIN, Role.DEAN, Role.COORDINATOR,
  Role.ASSISTANT_DEAN, Role.CHAIRMAN, Role.PROFESSOR,
]
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
  campus: { id: string; name: string } | null
  department: { id: string; name: string } | null
}

interface Props {
  users: UserRow[]
  currentUserId: string
  currentUserRole: Role
  campuses: Campus[]
  departments: Department[]
}

function SortHeader({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string
  onSelect: (v: string) => void
}) {
  const selectedLabel = options.find((o) => o.value === selected)?.label
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 -ml-1 px-1 py-0.5 rounded hover:bg-muted/60 hover:text-foreground">
          {label}
          {selectedLabel ? (
            <span className="text-[11px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {selectedLabel}
            </span>
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        {selected && (
          <>
            <DropdownMenuItem className="text-muted-foreground text-xs" onClick={() => onSelect("")}>
              Clear sort
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={selected === opt.value ? "font-medium bg-primary/5 text-primary" : ""}
          >
            {opt.label} first
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
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
  const [sortCampusId, setSortCampusId] = useState("")
  const [sortDeptId, setSortDeptId] = useState("")
  const [sortRole, setSortRole] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)

  const campusOptions = Array.from(
    new Map(users.filter((u) => u.campus).map((u) => [u.campus!.id, u.campus!.name])).entries()
  ).map(([id, name]) => ({ value: id, label: name })).sort((a, b) => a.label.localeCompare(b.label))

  const deptOptions = Array.from(
    new Map(users.filter((u) => u.department).map((u) => [u.department!.id, u.department!.name])).entries()
  ).map(([id, name]) => ({ value: id, label: name })).sort((a, b) => a.label.localeCompare(b.label))

  const roleOptions = ROLE_OPTIONS.map((r) => ({ value: r, label: getRoleLabel(r) }))
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
    : [...users]

  if (sortCampusId || sortDeptId || sortRole) {
    filtered.sort((a, b) => {
      const aScore =
        (sortCampusId && a.campus?.id === sortCampusId ? 4 : 0) +
        (sortDeptId   && a.department?.id === sortDeptId ? 2 : 0) +
        (sortRole     && a.role === sortRole ? 1 : 0)
      const bScore =
        (sortCampusId && b.campus?.id === sortCampusId ? 4 : 0) +
        (sortDeptId   && b.department?.id === sortDeptId ? 2 : 0) +
        (sortRole     && b.role === sortRole ? 1 : 0)
      return bScore - aScore
    })
  }

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
      <div className="flex flex-wrap items-center gap-3 px-6 pt-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, campus, department or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 max-w-sm"
          />
        </div>
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
              <TableHead>
                <SortHeader label="Campus" options={campusOptions} selected={sortCampusId} onSelect={setSortCampusId} />
              </TableHead>
              <TableHead>
                <SortHeader label="Department" options={deptOptions} selected={sortDeptId} onSelect={setSortDeptId} />
              </TableHead>
              <TableHead>
                <SortHeader label="Role" options={roleOptions} selected={sortRole} onSelect={setSortRole} />
              </TableHead>
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
