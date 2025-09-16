import { PropsWithChildren, useMemo } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Moon,
  SunMedium,
  User,
  LayoutDashboard,
  NotebookText,
  Search,
  Bot,
  ClipboardList,
  Users,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { store } from "@/lib/store";

function Header() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const placeholder = useMemo(() => {
    switch (true) {
      case location.pathname.startsWith("/explore"):
        return "Search topics (e.g., Photosynthesis, Derivative rules)";
      default:
        return "Quick search topics";
    }
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('query') as string;
    if (query.trim()) {
      const recents = store.get<string[]>("recent:topics", []);
      const next = [query, ...recents.filter((x) => x !== query)].slice(0, 8);
      store.set("recent:topics", next);
      navigate(`/explore?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 items-center gap-3 px-4">
        <SidebarTrigger />
        <Link to="/dashboard" className="flex items-center gap-2 font-bold">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
          </div>
          <span className="hidden sm:inline">NoteNest</span>
        </Link>
        
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
          <Input
            name="query"
            placeholder={placeholder}
            className="w-full"
          />
        </form>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <SunMedium className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const navigation = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Notes",
      url: "/notes",
      icon: NotebookText,
    },
    {
      title: "Explore",
      url: "/explore",
      icon: Search,
    },
    {
      title: "AI Tutor",
      url: "/tutor",
      icon: Bot,
    },
    {
      title: "Practice",
      url: "/practice", 
      icon: ClipboardList,
    },
    {
      title: "Groups",
      url: "/groups",
      icon: Users,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sidebar-primary-foreground">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                  </svg>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">NoteNest</span>
                  <span className="truncate text-xs">Study Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <User className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 text-white" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}