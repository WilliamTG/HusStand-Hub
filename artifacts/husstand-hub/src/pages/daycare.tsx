import * as React from "react"
import { useState, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { 
  useGetDaycare, 
  getGetDaycareQueryKey, 
  useCreateDaycareItem, 
  useUpdateDaycareItem, 
  useDeleteDaycareItem,
  useUpdateDaycareStatus,
  type DaycareItem,
  type DaycareSummary,
  type DaycareItemInputCategory,
  getGetDashboardQueryKey
} from "@workspace/api-client-react"
import { 
  Baby, 
  Plus, 
  Trash2, 
  Pencil,
  CheckCircle2, 
  AlertCircle,
  Calendar as CalendarIcon,
  Shirt,
  Box,
  Package,
  History
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { nb } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const toDateOnly = (value: string): string => value.slice(0, 10)
const parseCalendarDate = (value: string): Date => parseISO(toDateOnly(value))

export default function DaycarePage() {
  const queryClient = useQueryClient()
  const { data: daycare, isLoading } = useGetDaycare()
  const updateStatus = useUpdateDaycareStatus()
  const updateItem = useUpdateDaycareItem()
  const createItem = useCreateDaycareItem()
  const deleteItem = useDeleteDaycareItem()
  const { toast } = useToast()

  const [newItemName, setNewItemName] = useState("")
  const [newItemCategory, setNewItemCategory] = useState<DaycareItemInputCategory>("other")
  const [newItemRecurring, setNewItemRecurring] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editItem, setEditItem] = useState<DaycareItem | null>(null)
  const [editName, setEditName] = useState("")
  const [editCategory, setEditCategory] = useState<DaycareItemInputCategory>("other")
  const [editRecurring, setEditRecurring] = useState(false)
  const [editNote, setEditNote] = useState("")

  const queryKey = getGetDaycareQueryKey()

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
  }

  const handleToggleItem = (item: DaycareItem) => {
    if (item.isFixed && item.category === "clothing") {
      updateItem.mutate(
        {
          id: item.id,
          data: { needsReplacement: !item.needsReplacement },
        },
        {
          onSuccess: invalidateQueries,
          onError: () => {
            toast({ title: "Kunne ikke oppdatere skiftestatusen", variant: "destructive" })
          },
        },
      )
      return
    }

    const newChecked = !item.checked;
    
    // Optimistic update
    queryClient.setQueryData<DaycareSummary>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((i: DaycareItem) => i.id === item.id ? { ...i, checked: newChecked } : i)
      }
    })

    updateItem.mutate(
      { id: item.id, data: { checked: newChecked } },
      {
        onSuccess: invalidateQueries,
        onError: () => {
          invalidateQueries()
          toast({ title: "Kunne ikke oppdatere varen", variant: "destructive" })
        }
      }
    )
  }

  const handleToggleReplacement = (item: DaycareItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newReplacement = !item.needsReplacement;
    
    queryClient.setQueryData<DaycareSummary>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((i: DaycareItem) => i.id === item.id ? { ...i, needsReplacement: newReplacement } : i)
      }
    })

    updateItem.mutate(
      { id: item.id, data: { needsReplacement: newReplacement } },
      {
        onSuccess: invalidateQueries,
        onError: () => {
          invalidateQueries()
          toast({ title: "Kunne ikke oppdatere status", variant: "destructive" })
        }
      }
    )
  }

  const handleDelete = (item: DaycareItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Fjerne «${item.name}»?`)) return;
    
    deleteItem.mutate({ id: item.id }, {
      onSuccess: invalidateQueries,
      onError: () => {
        toast({ title: "Kunne ikke fjerne varen", variant: "destructive" })
      }
    })
  }

  const handleOpenEdit = (item: DaycareItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditItem(item)
    setEditName(item.name)
    setEditCategory(item.category)
    setEditRecurring(item.recurring)
    setEditNote(item.note ?? "")
  }

  const handleSaveEdit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!editItem || !editName.trim()) return

    updateItem.mutate(
      {
        id: editItem.id,
        data: {
          name: editName.trim(),
          category: editCategory,
          recurring: editRecurring,
          note: editNote.trim() || null,
        },
      },
      {
        onSuccess: () => {
          invalidateQueries()
          setEditItem(null)
          toast({ title: "Barnehagepunktet er oppdatert" })
        },
        onError: () => {
          toast({ title: "Kunne ikke lagre endringene", variant: "destructive" })
        },
      },
    )
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    createItem.mutate(
      { data: { name: newItemName.trim(), category: newItemCategory, recurring: newItemRecurring } },
      {
        onSuccess: () => {
          invalidateQueries()
          setNewItemName("")
          setShowAddForm(false)
          toast({ title: "Lagt til" })
        },
        onError: () => {
          toast({ title: "Kunne ikke legge til", variant: "destructive" })
        }
      }
    )
  }

  const handleToggleDiapers = (checked: boolean) => {
    updateStatus.mutate(
      { data: { needsDiapers: checked } },
      {
        onSuccess: invalidateQueries,
        onError: () => {
          toast({ title: "Kunne ikke oppdatere status", variant: "destructive" })
        }
      }
    )
  }

  const handleSetDiaperDate = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    updateStatus.mutate(
      { data: { lastDiaperDeliveryDate: dateStr } },
      {
        onSuccess: invalidateQueries,
        onError: () => {
          toast({ title: "Kunne ikke oppdatere dato", variant: "destructive" })
        }
      }
    )
  }

  const handleDeliveredToday = () => {
    const data = daycare?.needsDiapers
      ? { needsDiapers: false }
      : {
          lastDiaperDeliveryDate: daycare
            ? toDateOnly(daycare.date)
            : format(new Date(), "yyyy-MM-dd"),
        }

    updateStatus.mutate(
      { data },
      {
        onSuccess: () => {
          invalidateQueries()
          toast({ title: "Bleieleveringen er registrert" })
        },
        onError: () => {
          toast({ title: "Kunne ikke registrere leveringen", variant: "destructive" })
        },
      },
    )
  }

  const { essential, clothing, other } = useMemo(() => {
    const items = daycare?.items || []
    return {
      essential: items.filter(i => i.category === 'essential'),
      clothing: items.filter(i => i.category === 'clothing'),
      other: items.filter(i => i.category === 'other'),
    }
  }, [daycare?.items])

  if (isLoading || !daycare) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <header className="flex flex-col gap-2 mb-8">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-48" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8 space-y-6">
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
          <div className="md:col-span-4 space-y-6">
            <Skeleton className="h-48 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  const allChecked = daycare.items.every(i => i.checked);
  const progressPercent = daycare.items.length === 0 ? 100 : Math.round((daycare.items.filter(i => i.checked).length / daycare.items.length) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-8">
        <div>
          <h1 className="text-5xl font-bold font-display text-foreground flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Baby className="w-10 h-10" />
            </div>
            {daycare.childName} i barnehagen
          </h1>
          <p
            className="text-xl text-muted-foreground mt-4 font-medium capitalize"
            data-testid="text-daycare-date"
          >
            {format(parseCalendarDate(daycare.date), "EEEE d. MMMM", { locale: nb })}
            {daycare.daycareName && ` • ${daycare.daycareName}`}
          </p>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-primary">{progressPercent}%</div>
            <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-left leading-tight">
              Klar for<br/>dagen
            </div>
          </div>
          <div className="w-32 h-3 bg-secondary rounded-full mt-3 overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-out rounded-full" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column - Checklist */}
        <div className="md:col-span-8 space-y-8">
          
          <Card className="border-none shadow-lg shadow-black/5 rounded-[2rem] overflow-hidden bg-card">
            <div className="px-8 py-6 bg-primary text-primary-foreground flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-display">Dagens Pakkeliste</CardTitle>
                <CardDescription className="text-primary-foreground/80 mt-1 text-lg">
                  Kryss av når det er lagt i sekken
                </CardDescription>
              </div>
              {allChecked && daycare.items.length > 0 && (
                <div className="bg-white/20 p-2 rounded-full animate-in zoom-in spin-in">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              )}
            </div>

            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                
                {/* Faste ting */}
                <div className="pb-2">
                  <div className="px-8 py-4 bg-background/50 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary/80 flex items-center gap-2">
                      <Package className="w-4 h-4" /> Faste ting
                    </h3>
                  </div>
                  <div className="divide-y divide-border/30">
                    {essential.map((item) => (
                      <ChecklistItem 
                        key={item.id} 
                        item={item} 
                        onToggle={() => handleToggleItem(item)} 
                        onToggleReplacement={(e) => handleToggleReplacement(item, e)}
                        onEdit={(e) => handleOpenEdit(item, e)}
                        onDelete={(e) => handleDelete(item, e)}
                      />
                    ))}
                  </div>
                </div>

                {/* Klær */}
                {clothing.length > 0 && (
                  <div className="pb-2">
                    <div className="px-8 py-4 bg-background/50 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-primary/80 flex items-center gap-2">
                        <Shirt className="w-4 h-4" /> Klær & Skift
                      </h3>
                    </div>
                    <div className="divide-y divide-border/30">
                      {clothing.map((item) => (
                        <ChecklistItem 
                          key={item.id} 
                          item={item} 
                          onToggle={() => handleToggleItem(item)} 
                          onToggleReplacement={(e) => handleToggleReplacement(item, e)}
                          onEdit={(e) => handleOpenEdit(item, e)}
                          onDelete={(e) => handleDelete(item, e)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Annet */}
                {other.length > 0 && (
                  <div className="pb-2">
                    <div className="px-8 py-4 bg-background/50 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-primary/80 flex items-center gap-2">
                        <Box className="w-4 h-4" /> Annet
                      </h3>
                    </div>
                    <div className="divide-y divide-border/30">
                      {other.map((item) => (
                        <ChecklistItem 
                          key={item.id} 
                          item={item} 
                          onToggle={() => handleToggleItem(item)} 
                          onToggleReplacement={(e) => handleToggleReplacement(item, e)}
                          onEdit={(e) => handleOpenEdit(item, e)}
                          onDelete={(e) => handleDelete(item, e)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Add New Button */}
              <div className="p-6 bg-secondary/20">
                {!showAddForm ? (
                  <Button 
                    variant="outline" 
                    className="w-full py-8 text-lg rounded-2xl border-dashed border-2 hover:bg-secondary hover:text-foreground"
                    onClick={() => setShowAddForm(true)}
                    data-testid="button-add-item"
                  >
                    <Plus className="w-6 h-6 mr-2" /> Legg til noe ekstra i dag
                  </Button>
                ) : (
                  <form onSubmit={handleAddItem} className="space-y-4 bg-card p-6 rounded-2xl border shadow-sm">
                    <h4 className="font-semibold text-lg">Ny ting</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Hva skal pakkes?</Label>
                        <Input 
                          value={newItemName} 
                          onChange={(e) => setNewItemName(e.target.value)} 
                          placeholder="F.eks. Bamsen til lekedag"
                          autoFocus
                          className="text-lg py-6"
                          data-testid="input-new-item-name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Kategori</Label>
                          <Select value={newItemCategory} onValueChange={(v: DaycareItemInputCategory) => setNewItemCategory(v)}>
                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clothing">Klær</SelectItem>
                              <SelectItem value="other">Annet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-3 pt-8">
                          <Switch 
                            checked={newItemRecurring} 
                            onCheckedChange={setNewItemRecurring}
                            id="recurring"
                            data-testid="switch-new-item-recurring"
                          />
                          <Label htmlFor="recurring" className="text-sm font-medium cursor-pointer">Fast hver dag?</Label>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        data-testid="button-cancel-new-item"
                      >
                        Avbryt
                      </Button>
                      <Button type="submit" disabled={!newItemName.trim() || createItem.isPending} data-testid="button-save-item">Legg til</Button>
                    </div>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Status */}
        <div className="md:col-span-4 space-y-6">
          
          <Card className={cn(
            "border-none shadow-md rounded-[2rem] transition-colors duration-500",
            daycare.needsDiapers ? "bg-accent/10" : "bg-card"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl font-display">
                <Baby className={cn("w-7 h-7", daycare.needsDiapers ? "text-accent" : "text-primary")} />
                Bleiestatus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-background rounded-2xl border shadow-sm">
                <div>
                  <div className="font-semibold text-lg" data-testid="status-needs-diapers">
                    {daycare.needsDiapers ? "Trenger bleier" : "Har nok bleier"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {daycare.needsDiapers ? "Barnehagen har sagt ifra" : "Ingen påfyll er etterspurt"}
                  </div>
                </div>
                <Switch 
                  checked={daycare.needsDiapers}
                  onCheckedChange={handleToggleDiapers}
                  className={cn("data-[state=checked]:bg-accent")}
                  data-testid="switch-needs-diapers"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Sist levert
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal py-6 text-lg rounded-2xl"
                      data-testid="button-diaper-date"
                    >
                      <CalendarIcon className="mr-3 h-5 w-5 opacity-50" />
                      {daycare.lastDiaperDeliveryDate
                        ? format(parseCalendarDate(daycare.lastDiaperDeliveryDate), "d. MMMM yyyy", { locale: nb })
                        : "Ikke registrert"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={daycare.lastDiaperDeliveryDate ? parseCalendarDate(daycare.lastDiaperDeliveryDate) : undefined}
                      onSelect={handleSetDiaperDate}
                      locale={nb}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                {/* Shortcut button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={handleDeliveredToday}
                  data-testid="button-diapers-delivered-today"
                >
                  <History className="w-4 h-4 mr-2" /> Registrer levert i dag
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Replacement needs summary */}
          {(clothing.some(i => i.needsReplacement) || daycare.needsClothing) && (
            <Card className="bg-accent text-accent-foreground border-none shadow-md rounded-[2rem]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-display">
                  <AlertCircle className="w-6 h-6" />
                  Mangler skift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-accent-foreground/90 font-medium mb-4">
                  Barnehagen mangler følgende utstyr:
                </p>
                <ul className="space-y-2">
                  {clothing.filter(i => i.needsReplacement).map(item => (
                    <li key={item.id} className="flex items-center gap-2 bg-black/10 px-4 py-2 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-accent-foreground" />
                      {item.name}
                    </li>
                  ))}
                  {daycare.needsClothing && clothing.filter(i => i.needsReplacement).length === 0 && (
                    <li className="flex items-center gap-2 bg-black/10 px-4 py-2 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-accent-foreground" />
                      Ekstra skiftetøy
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      <Dialog open={Boolean(editItem)} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger barnehagepunkt</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-daycare-name">Navn</Label>
              <Input
                id="edit-daycare-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                data-testid="input-edit-daycare-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={editCategory}
                onValueChange={(value: DaycareItemInputCategory) => setEditCategory(value)}
              >
                <SelectTrigger data-testid="select-edit-daycare-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clothing">Klær</SelectItem>
                  <SelectItem value="other">Annet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-daycare-note">Merknad</Label>
              <Input
                id="edit-daycare-note"
                value={editNote}
                onChange={(event) => setEditNote(event.target.value)}
                placeholder="Valgfritt"
                data-testid="input-edit-daycare-note"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <Label htmlFor="edit-daycare-recurring" className="text-base">
                  Fast på morgenlisten
                </Label>
                <p className="text-sm text-muted-foreground">
                  Slå av for ting som bare skal med én gang.
                </p>
              </div>
              <Switch
                id="edit-daycare-recurring"
                checked={editRecurring}
                onCheckedChange={setEditRecurring}
                data-testid="switch-edit-daycare-recurring"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditItem(null)}
                data-testid="button-cancel-edit-daycare"
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={!editName.trim() || updateItem.isPending}
                data-testid="button-save-edit-daycare"
              >
                Lagre
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChecklistItem({ item, onToggle, onToggleReplacement, onEdit, onDelete }: { 
  item: DaycareItem, 
  onToggle: () => void, 
  onToggleReplacement: (e: React.MouseEvent) => void,
  onEdit: (e: React.MouseEvent) => void,
  onDelete: (e: React.MouseEvent) => void 
}) {
  return (
    <div 
      className={cn(
        "flex items-center gap-6 px-8 py-5 transition-all cursor-pointer group",
        item.checked ? "bg-secondary/20" : "hover:bg-secondary/40"
      )}
      onClick={onToggle}
      data-testid={`daycare-item-${item.id}`}
    >
      <div className={cn(
        "flex items-center justify-center w-12 h-12 rounded-2xl border-[3px] transition-all shrink-0",
        item.checked ? "bg-primary border-primary scale-110" : "border-muted-foreground/30 group-hover:border-primary/50 bg-background"
      )}>
        {item.checked && <CheckCircle2 className="w-8 h-8 text-primary-foreground animate-in zoom-in duration-300" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-2xl font-medium transition-all",
          item.checked ? "text-muted-foreground line-through decoration-2" : "text-foreground"
        )}>
          {item.name}
        </p>
        {item.note && (
          <p className="text-base text-muted-foreground mt-1 truncate">{item.note}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.category === 'clothing' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleReplacement}
            className={cn(
              "h-12 px-4 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors",
              item.needsReplacement 
                ? "bg-accent text-accent-foreground hover:bg-accent/90" 
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
            data-testid={`daycare-replacement-${item.id}`}
          >
            {item.needsReplacement ? "Mangler i bhg!" : "Mangler?"}
          </Button>
        )}
        
        {!item.isFixed && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-12 w-12 rounded-xl text-muted-foreground hover:bg-secondary"
              title="Rediger"
              data-testid={`daycare-edit-${item.id}`}
            >
              <Pencil className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-12 w-12 rounded-xl text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
              title="Slett ting"
              data-testid={`daycare-delete-${item.id}`}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
