import * as React from "react"
import { useLocation } from "wouter"
import { useGetDashboard } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "wouter"
import { 
  CloudSun, 
  Baby, 
  ShoppingCart, 
  CalendarDays,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Info,
  BookOpen
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard()
  const [, setLocation] = useLocation()

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 space-y-6">
            <Skeleton className="h-80 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
          <div className="md:col-span-4 space-y-6">
            <Skeleton className="h-48 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  const getNurseryIcon = (tone: string) => {
    switch (tone) {
      case "ok": return <CheckCircle2 className="w-8 h-8 text-primary" />
      case "attention": return <AlertTriangle className="w-8 h-8 text-accent" />
      default: return <Info className="w-8 h-8 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-5xl font-bold text-foreground mb-2">{dashboard.dateLabel}</h1>
          <p className="text-xl text-muted-foreground font-medium flex items-center gap-2">
            <CloudSun className="w-6 h-6" /> God morgen, familie
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="md:col-span-8 space-y-6 flex flex-col">
          
          {/* Today's Meal Banner */}
          <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative isolate cursor-pointer hover:opacity-95 transition-opacity" onClick={() => setLocation("/meal-plan")}>
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent z-0 pointer-events-none" />
            <CardHeader className="relative z-10 pb-4">
              <div className="flex justify-between items-center mb-2">
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none px-4 py-1.5 text-sm uppercase tracking-wider">
                  Dagens middag
                </Badge>
                {dashboard.todayMeal?.status === "cooked" && (
                  <Badge className="bg-accent text-accent-foreground border-none">Laget</Badge>
                )}
              </div>
              <CardTitle className="text-4xl leading-tight">
                {dashboard.todayMeal ? dashboard.todayMeal.title : "Ingen middag planlagt"}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 flex items-center gap-4">
              {dashboard.todayMeal?.recipeName && (
                <p className="text-primary-foreground/80 text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5" /> Oppskrift: {dashboard.todayMeal.recipeName}
                </p>
              )}
              {dashboard.todayMeal?.note && (
                <p className="text-primary-foreground/80 text-lg flex items-center gap-2">
                  <Info className="w-5 h-5" /> {dashboard.todayMeal.note}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Week Overview */}
          <Card className="flex-1 border-border/50">
            <CardHeader className="pb-4 flex flex-row items-center justify-between border-b border-border/50">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <CalendarDays className="w-7 h-7 text-primary" />
                  {dashboard.weekLabel}
                </CardTitle>
              </div>
              <Link href="/meal-plan" className="text-primary font-medium hover:underline text-lg px-4 py-2 bg-secondary rounded-xl">
                Rediger meny
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {dashboard.weekMenu.length > 0 ? (
                  dashboard.weekMenu.map((meal) => (
                    <div key={meal.id} className="p-6 flex items-center gap-6 hover:bg-secondary/50 transition-colors">
                      <div className="w-24 text-center shrink-0">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{meal.dayLabel.substring(0,3)}</p>
                        <p className="text-2xl font-bold">{format(new Date(meal.date), "d")}</p>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-semibold mb-1">{meal.title}</h4>
                        <div className="flex gap-3 text-muted-foreground text-sm">
                          {meal.recipeName && <span className="flex items-center gap-1"><BookOpen className="w-4 h-4"/> {meal.recipeName}</span>}
                          {meal.status === 'cooked' && <Badge variant="outline" className="text-xs py-0 h-5">Laget</Badge>}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-xl">Ingen måltider planlagt denne uken.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="md:col-span-4 space-y-6 flex flex-col">
          
          {/* Nursery Status */}
          <Card className={cn(
            "border-none",
            dashboard.nurseryStatus.tone === "ok" ? "bg-primary/10 text-primary-foreground" :
            dashboard.nurseryStatus.tone === "attention" ? "bg-accent/10 text-accent-foreground" :
            "bg-secondary"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-background/50 rounded-xl">
                  <Baby className="w-6 h-6 text-foreground" />
                </div>
                <CardTitle className="text-foreground text-xl">Barnehagestatus</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 mt-2 text-foreground">
                <div className="shrink-0 mt-1">
                  {getNurseryIcon(dashboard.nurseryStatus.tone)}
                </div>
                <div>
                  <h4 className="font-semibold text-xl mb-1">{dashboard.nurseryStatus.label}</h4>
                  <p className="text-foreground/70 text-lg leading-snug">{dashboard.nurseryStatus.detail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shopping List Preview */}
          <Card className="flex-1 border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <ShoppingCart className="w-6 h-6 text-primary" />
                Handleliste
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {dashboard.shoppingPreview.length > 0 ? (
                  dashboard.shoppingPreview.map(item => (
                    <li key={item.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary transition-colors cursor-pointer" onClick={() => setLocation("/shopping")}>
                      {item.completed ? (
                        <CheckCircle2 className="w-7 h-7 text-primary shrink-0" />
                      ) : (
                        <Circle className="w-7 h-7 text-muted-foreground shrink-0" />
                      )}
                      <span className={cn(
                        "text-lg",
                        item.completed && "line-through text-muted-foreground"
                      )}>{item.name}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-center py-8 text-muted-foreground text-lg">
                    Ingenting på listen!
                  </li>
                )}
              </ul>
              {dashboard.shoppingPreview.length > 0 && (
                <div className="mt-6">
                  <div
                    onClick={() => setLocation("/shopping")}
                    className="w-full text-center text-primary font-medium p-3 rounded-xl hover:bg-secondary cursor-pointer transition-colors text-lg"
                  >
                    Se hele listen
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}

