"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  AppWindow,
  Inbox,
  Settings,
  ChevronDown,
  Building2,
  User,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSpace } from "@/contexts/space-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Assets", href: "/assets", icon: Package },
  { name: "Software", href: "/software", icon: AppWindow },
  { name: "Inbox", href: "/inbox", icon: Inbox },
]

const bottomNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { spaces, currentSpace, setCurrentSpace, isLoading } = useSpace()

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-muted/30">
      {/* Space Switcher */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 font-normal"
              disabled={isLoading}
            >
              <div className="flex items-center gap-2">
                {currentSpace?.name === "OSVČ" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
                <span className="truncate">
                  {isLoading ? "Loading..." : currentSpace?.name || "Select Space"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {spaces.map((space) => (
              <DropdownMenuItem
                key={space.id}
                onClick={() => setCurrentSpace(space)}
                className={cn(
                  "cursor-pointer",
                  currentSpace?.id === space.id && "bg-accent"
                )}
              >
                <div className="flex items-center gap-2">
                  {space.name === "OSVČ" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                  <span>{space.name}</span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/spaces" className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Manage Spaces
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
              {item.name === "Inbox" && (
                <InboxBadge />
              )}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Bottom Navigation */}
      <nav className="p-3">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

function InboxBadge() {
  // This would be replaced with actual unread count from API
  const unreadCount = 0

  if (unreadCount === 0) return null

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  )
}
