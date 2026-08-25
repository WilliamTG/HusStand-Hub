import * as React from "react"
import { useState } from "react"
import { useListMealPlans, useCreateMealPlan, useUpdateMealPlan, useDeleteMealPlan, useListRecipes } from "@workspace/api-client-react"
import { getListMealPlansQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { format, startOfWeek, addDays, parseISO } from "date-fns"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, ChefHat, CalendarDays, MoreVertical, Trash2, Edit2, Info } from "lucide-react"

export default function MealPlanPage() {
  const queryClient = useQueryClient()
  const [currentDate] = useState(new Date())
  const weekStartStr = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  
  const { data: mealPlans, isLoading } = useListMealPlans({ weekStart: weekStartStr })
  const { data: recipes } = useListRecipes()
  
  const createMeal = useCreateMealPlan()
  const updateMeal = useUpdateMealPlan()
  const deleteMeal = useDeleteMealPlan()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [editData, setEditData] = useState<any>(null)

  // Generate week days
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(parseISO(weekStartStr), i)
    return {
      date: format(d, 'yyyy-MM-dd'),
      dayName: format(d, 'EEEE'),
      dayNum: format(d, 'd')
    }
  })

  const openAddMeal = (date: string) => {
    setSelectedDate(date)
    setEditData({ title: "", mealType: "dinner", status: "planned", recipeId: null, note: "" })
    setEditModalOpen(true)
  }

  const openEditMeal = (meal: any) => {
    setSelectedDate(format(new Date(meal.date), 'yyyy-MM-dd'))
    setEditData(meal)
    setEditModalOpen(true)
  }

  const handleSave = () => {
    if (!editData.title.trim()) return

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListMealPlansQueryKey({ weekStart: weekStartStr }) })
      setEditModalOpen(false)
    }

    if (editData.id) {
      updateMeal.mutate(
        { id: editData.id, data: { ...editData, date: selectedDate } },
        { onSuccess }
      )
    } else {
      createMeal.mutate(
        { data: { ...editData, date: selectedDate } },
        { onSuccess }
      )
    }
  }

  const handleDelete = (id: number) => {
    if (confirm("Remove this meal from the plan?")) {
      deleteMeal.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMealPlansQueryKey({ weekStart: weekStartStr }) })
          }
        }
      )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="space-y-4">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold font-display text-foreground flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-primary" />
            Weekly Meal Plan
          </h1>
          <p className="text-xl text-muted-foreground mt-2">Week of {format(parseISO(weekStartStr), 'MMMM do, yyyy')}</p>
        </div>
      </header>

      <div className="space-y-4">
        {days.map((day) => {
          const dayMeals = mealPlans?.filter(m => format(new Date(m.date), 'yyyy-MM-dd') === day.date) || []
          const isToday = format(currentDate, 'yyyy-MM-dd') === day.date

          return (
            <Card key={day.date} className={`border-border/50 overflow-hidden ${isToday ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
              <div className="flex flex-col md:flex-row">
                <div className={`p-6 w-full md:w-32 shrink-0 flex md:flex-col items-center md:items-start justify-between md:justify-center border-b md:border-b-0 md:border-r border-border/50 ${isToday ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  <span className="font-semibold text-sm uppercase tracking-widest opacity-80">{day.dayName.substring(0,3)}</span>
                  <span className="text-3xl font-bold font-display">{day.dayNum}</span>
                  {isToday && <Badge variant="secondary" className="md:mt-2 text-xs bg-white text-primary">Today</Badge>}
                </div>
                
                <div className="flex-1 p-6 flex flex-col justify-center min-h-[120px]">
                  {dayMeals.length > 0 ? (
                    <div className="space-y-4">
                      {dayMeals.map(meal => (
                        <div key={meal.id} className="flex justify-between items-center group">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-2xl font-bold font-display">{meal.title}</h3>
                              <Badge variant={meal.status === 'cooked' ? 'accent' : 'outline'} className="text-xs">
                                {meal.status}
                              </Badge>
                            </div>
                            <div className="flex gap-4 text-muted-foreground">
                              {meal.recipeName && (
                                <span className="flex items-center gap-1.5"><ChefHat className="w-4 h-4"/> {meal.recipeName}</span>
                              )}
                              {meal.note && (
                                <span className="flex items-center gap-1.5"><Info className="w-4 h-4"/> {meal.note}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => openEditMeal(meal)}>
                              <Edit2 className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(meal.id)}>
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="text-lg italic opacity-70">No meals planned</span>
                      <Button variant="secondary" onClick={() => openAddMeal(day.date)} className="rounded-xl font-semibold">
                        <Plus className="w-5 h-5 mr-2" /> Add Meal
                      </Button>
                    </div>
                  )}
                </div>
                
                {dayMeals.length > 0 && (
                  <div className="p-4 border-l border-border/50 flex items-center justify-center bg-card">
                    <Button variant="ghost" size="icon" onClick={() => openAddMeal(day.date)} className="w-12 h-12 rounded-xl text-primary hover:bg-primary/10">
                      <Plus className="w-6 h-6" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editData?.id ? "Edit Meal" : "Add Meal to Plan"}</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Meal Title</label>
                <Input 
                  value={editData.title} 
                  onChange={e => setEditData({...editData, title: e.target.value})}
                  placeholder="e.g. Pasta Bolognese"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Link Recipe (Optional)</label>
                <Select 
                  value={editData.recipeId?.toString() || "none"}
                  onValueChange={val => setEditData({...editData, recipeId: val === "none" ? null : parseInt(val)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a recipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No Recipe --</SelectItem>
                    {recipes?.map(r => (
                      <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
                  <Select 
                    value={editData.mealType}
                    onValueChange={val => setEditData({...editData, mealType: val})}
                  >
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                  <Select 
                    value={editData.status}
                    onValueChange={val => setEditData({...editData, status: val})}
                  >
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="cooked">Cooked</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Note</label>
                <Input 
                  value={editData.note || ""} 
                  onChange={e => setEditData({...editData, note: e.target.value})}
                  placeholder="e.g. Use leftover sauce"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!editData?.title?.trim() || createMeal.isPending || updateMeal.isPending}>Save Meal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
