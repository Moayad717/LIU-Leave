"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  GraduationCap, LayoutDashboard, ClipboardList, BarChart3,
  Users, Settings, LogOut, ChevronDown, UserCircle, BookOpen, CalendarCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { canAccessAdmin, canManageUsers, getRoleLabel, type Role } from "@/types/enums"

interface NavUser {
  name?: string | null
  email?: string | null
  image?: string | null
  role: Role
  campusId: string | null
}

const professorLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tutorial",  label: "Guide",     icon: BookOpen },
]

const limitedAdminLinks = [
  { href: "/dashboard",             label: "Dashboard",   icon: LayoutDashboard },
  { href: "/admin/submissions",     label: "Submissions", icon: ClipboardList },
  { href: "/admin/stats",           label: "Statistics",  icon: BarChart3 },
  { href: "/admin/daily-summary",   label: "Daily",       icon: CalendarCheck },
  { href: "/admin/users",           label: "Users",       icon: Users },
  { href: "/tutorial",              label: "Guide",       icon: BookOpen },
]

const fullAdminLinks = [
  { href: "/dashboard",             label: "Dashboard",   icon: LayoutDashboard },
  { href: "/admin/submissions",     label: "Submissions", icon: ClipboardList },
  { href: "/admin/stats",           label: "Statistics",  icon: BarChart3 },
  { href: "/admin/daily-summary",   label: "Daily",       icon: CalendarCheck },
  { href: "/admin/users",           label: "Users",       icon: Users },
  { href: "/admin/settings",        label: "Settings",    icon: Settings },
  { href: "/tutorial",              label: "Guide",       icon: BookOpen },
]

function getLinks(role: Role) {
  if (!canAccessAdmin(role)) return professorLinks
  if (canManageUsers(role)) return fullAdminLinks
  return limitedAdminLinks
}

export function Nav({ user }: { user: NavUser }) {
  const pathname = usePathname()
  const links    = getLinks(user.role)

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() ?? "U"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">LIU Leave</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/")
              return (
                <Link key={href} href={href}>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-9 px-2 rounded-lg text-sm hover:bg-muted/60"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block max-w-28 truncate font-medium">
                  {user.name?.split(" ")[0] ?? user.email}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="pb-2">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <span className="inline-block mt-1 text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                  {getRoleLabel(user.role)}
                </span>
              </DropdownMenuLabel>

              {/* Mobile-only nav links */}
              <DropdownMenuSeparator className="md:hidden" />
              {links.map(({ href, label, icon: Icon }) => (
                <DropdownMenuItem key={href} asChild className="md:hidden gap-2">
                  <Link href={href}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="gap-2 cursor-pointer">
                  <UserCircle className="w-4 h-4" />
                  Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-muted-foreground focus:text-foreground"
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </header>
  )
}
