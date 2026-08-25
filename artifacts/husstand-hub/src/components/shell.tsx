import { Link, useLocation } from "wouter"
import { Home, CalendarDays, BookOpen, UtensilsCrossed, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

  const navItems = [
    { href: "/", icon: Home, label: "Hjem" },
    { href: "/meal-plan", icon: CalendarDays, label: "Middagsplan" },
    { href: "/recipes", icon: BookOpen, label: "Oppskrifter" },
  ]

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden text-foreground selection:bg-primary/20">
      {/* Left Sidebar */}
      <aside className="w-28 flex flex-col items-center py-8 border-r bg-card shrink-0 shadow-sm z-10">
        <div className="mb-12">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
        </div>
        
        <nav className="flex-1 flex flex-col gap-6">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  className={cn(
                    "flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all cursor-pointer",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <item.icon className={cn("w-7 h-7 mb-1", isActive ? "opacity-100" : "opacity-80")} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium tracking-wide uppercase">{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>
        
        <div className="mt-auto">
          <button className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
            <Settings className="w-7 h-7 mb-1 opacity-80" />
            <span className="text-[10px] font-medium tracking-wide uppercase">Innstillinger</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-background">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="min-h-full max-w-7xl mx-auto p-8 lg:p-12">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
