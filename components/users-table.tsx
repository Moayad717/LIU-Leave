"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RoleToggle } from "@/components/role-toggle"
import type { Role } from "@/types/enums"

interface UserRow {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: Role
  createdAt: Date
  campus: { name: string } | null
  department: { name: string } | null
}

interface Props {
  users: UserRow[]
  currentUserId: string
  currentUserRole: Role
}

export function UsersTable({ users, currentUserId, currentUserRole }: Props) {
  const [search, setSearch] = useState("")

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase()
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.campus?.name.toLowerCase().includes(q) ||
          u.department?.name.toLowerCase().includes(q)
        )
      })
    : users

  return (
    <div className="space-y-4">
      <div className="relative px-6 pt-2">
        <Search className="absolute left-9 top-4.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, campus or department..."
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

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {user.name ?? "—"}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.campus?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{user.department?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {user.role === "SUPERADMIN" ? (
                      <Badge variant="default" className="bg-violet-600 hover:bg-violet-700">Superadmin</Badge>
                    ) : user.role === "ADMIN" ? (
                      <Badge variant="default">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">Professor</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(user.createdAt, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <RoleToggle userId={user.id} currentRole={user.role} isSelf={isSelf} callerRole={currentUserRole} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
