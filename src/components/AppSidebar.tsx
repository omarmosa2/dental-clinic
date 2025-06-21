import * as React from "react"
import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
  Stethoscope,
  ChevronUp,
  User2,
  Package,
  BarChart3,
  TestTube,
  Pill,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSettingsStore } from "@/store/settingsStore"

// Navigation items data
const navigationItems = [
  {
    title: "لوحة التحكم",
    url: "dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "المرضى",
    url: "patients",
    icon: Users,
  },
  {
    title: "المواعيد",
    url: "appointments",
    icon: Calendar,
  },
  {
    title: "المدفوعات",
    url: "payments",
    icon: CreditCard,
  },
  {
    title: "المخزون",
    url: "inventory",
    icon: Package,
  },
  {
    title: "المختبرات",
    url: "labs",
    icon: TestTube,
  },
  {
    title: "الأدوية والوصفات",
    url: "medications",
    icon: Pill,
  },
  {
    title: "التقارير",
    url: "reports",
    icon: BarChart3,
  },
  {
    title: "الإعدادات",
    url: "settings",
    icon: Settings,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function AppSidebar({ activeTab, onTabChange, ...props }: AppSidebarProps) {
  const { settings } = useSettingsStore()

  return (
    <Sidebar collapsible="offcanvas" side="right" className="border-r border-border/40 shadow-lg" {...props}>
      <SidebarHeader className="border-b border-border/40 bg-gradient-to-r from-background to-accent/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors duration-200">
                <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg">
                  <Stethoscope className="size-6" />
                </div>
                <div className="grid flex-1 text-right leading-tight">
                  <span className="truncate font-bold text-xl text-foreground">
                    {settings?.clinic_name || 'العيادة السنية'}
                  </span>
                  <span className="truncate text-sm text-muted-foreground font-medium">
                    نظام إدارة العيادة
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        <SidebarGroup className="space-y-1">
          <SidebarGroupLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2 py-2">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={activeTab === item.url}
                    onClick={() => onTabChange(item.url)}
                    className="flex items-center gap-3 w-full text-right justify-start hover:bg-accent/50 transition-colors duration-200 py-2 px-3 text-base"
                  >
                    <item.icon className="size-5 text-sky-600 dark:text-sky-400" />
                    <span className="font-semibold text-sm">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 bg-gradient-to-r from-background to-accent/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-accent/50 transition-colors duration-200 py-2 px-3"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-600 text-white">
                    <User2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-right leading-tight">
                    <span className="truncate font-semibold text-sm">د. {settings?.doctor_name || 'طبيب الأسنان'}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {settings?.clinic_name || 'العيادة السنية'}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem
                  onClick={() => onTabChange('settings')}
                  className="cursor-pointer hover:bg-accent/50 transition-colors duration-200 flex items-center gap-2 py-2 px-3"
                >
                  <Settings className="size-4 text-sky-600 dark:text-sky-400" />
                  <span className="font-semibold text-sm">الإعدادات</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
