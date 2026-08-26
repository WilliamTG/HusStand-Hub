import * as React from "react"
import { useState, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { 
  useListShoppingItems, 
  getListShoppingItemsQueryKey, 
  useCreateShoppingItem, 
  useUpdateShoppingItem, 
  useDeleteShoppingItem,
  type ShoppingItem,
  getGetDashboardQueryKey
} from "@workspace/api-client-react"
import { ShoppingCart, Plus, Trash2, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

const categories = ["Kjøl", "Tørrvarer", "Frukt & grønt", "Kjøtt & fisk", "Hygiene", "Annet"]

export default function ShoppingPage() {
  const queryClient = useQueryClient()
  const { data: items, isLoading } = useListShoppingItems()
  const createItem = useCreateShoppingItem()
  const updateItem = useUpdateShoppingItem()
  const deleteItem = useDeleteShoppingItem()
  const { toast } = useToast()

  const [newItemName, setNewItemName] = useState("")
  const [editItem, setEditItem] = useState<ShoppingItem | null>(null)
  const [editName, setEditName] = useState("")
  const [editQuantity, setEditQuantity] = useState("")
  const [editCategory, setEditCategory] = useState("Annet")

  const queryKey = getListShoppingItemsQueryKey()

  const handleToggle = (item: ShoppingItem) => {
    const newCompleted = !item.completed;
    
    queryClient.setQueryData(queryKey, (old: ShoppingItem[] | undefined) => {
      if (!old) return old;
      return old.map(i => i.id === item.id ? { ...i, completed: newCompleted } : i)
    })

    updateItem.mutate(
      { id: item.id, data: { completed: newCompleted } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey })
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
        },
        onError: () => {
          queryClient.invalidateQueries({ queryKey })
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
          toast({ title: "Kunne ikke oppdatere varen", variant: "destructive" })
        }
      }
    )
  }

  const handleDelete = (item: ShoppingItem) => {
    if (!window.confirm(`Fjerne «${item.name}» fra handlelisten?`)) return
    const previousItems = queryClient.getQueryData<ShoppingItem[]>(queryKey)
    queryClient.setQueryData(queryKey, (old: ShoppingItem[] | undefined) => {
      if (!old) return old;
      return old.filter(i => i.id !== item.id)
    })
    
    deleteItem.mutate({ id: item.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
      },
      onError: () => {
        queryClient.setQueryData(queryKey, previousItems)
        toast({ title: "Kunne ikke fjerne varen", variant: "destructive" })
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey })
      }
    })
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    createItem.mutate(
      { data: { name: newItemName.trim(), category: "Annet" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey })
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
          setNewItemName("")
          toast({ title: "Lagt til i handlelisten" })
        },
        onError: () => {
          toast({ title: "Kunne ikke legge til varen", variant: "destructive" })
        }
      }
    )
  }

  const openEdit = (item: ShoppingItem) => {
    setEditItem(item)
    setEditName(item.name)
    setEditQuantity(item.quantity ?? "")
    setEditCategory(item.category || "Annet")
  }

  const handleSaveEdit = () => {
    if (!editItem || !editName.trim()) return
    updateItem.mutate(
      {
        id: editItem.id,
        data: {
          name: editName.trim(),
          quantity: editQuantity.trim() || null,
          category: editCategory,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey })
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
          setEditItem(null)
          toast({ title: "Handlelistevaren er oppdatert" })
        },
        onError: () => {
          toast({ title: "Kunne ikke lagre endringen", variant: "destructive" })
        },
      },
    )
  }

  const activeItems = useMemo(() => items?.filter(i => !i.completed) || [], [items])
  const completedItems = useMemo(() => items?.filter(i => i.completed) || [], [items])

  const categorizedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {}
    activeItems.forEach(item => {
      const cat = item.category || "Annet"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    })
    
    // Sort groups alphabetically, but keep "Annet" at the bottom
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Annet") return 1
      if (b === "Annet") return -1
      return a.localeCompare(b)
    })

    return sortedKeys.map(key => ({ category: key, items: groups[key] }))
  }, [activeItems])

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="flex flex-col gap-2 mb-8">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-48" />
        </header>
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-5xl font-bold font-display text-foreground flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <ShoppingCart className="w-10 h-10" />
            </div>
            Handleliste
          </h1>
          <p className="text-xl text-muted-foreground mt-4 font-medium">
            {activeItems.length} {activeItems.length === 1 ? 'ting' : 'ting'} å kjøpe
          </p>
        </div>
      </header>

      <Card className="border-none shadow-lg shadow-black/5 rounded-[2rem] overflow-hidden bg-card">
        <div className="p-2 border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <form onSubmit={handleAdd} className="relative flex items-center">
            <Input 
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Legg til i handlelisten..."
              className="w-full text-xl py-8 pl-6 pr-16 bg-transparent border-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!newItemName.trim() || createItem.isPending}
              className="absolute right-3 w-12 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </form>
        </div>

        <CardContent className="p-0">
          {activeItems.length === 0 && completedItems.length === 0 ? (
            <div className="py-24 text-center px-4">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
                <ShoppingCart className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold font-display text-foreground mb-2">Listen er tom</h3>
              <p className="text-lg text-muted-foreground">Alt er handlet inn. Legg til nye ting ovenfor.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {categorizedItems.map((group) => (
                <div key={group.category} className="pb-2">
                  <div className="px-6 py-3 bg-background/50 border-b border-border/50 sticky top-[72px] z-10 backdrop-blur-md">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary/80">{group.category}</h3>
                  </div>
                  <div className="divide-y divide-border/30">
                    {group.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors group">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => handleToggle(item)}
                          aria-label={`Merk ${item.name} som handlet`}
                          className="h-10 w-10 rounded-xl border-2 data-[state=checked]:bg-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xl font-medium text-foreground truncate">{item.name}</p>
                          {item.quantity && (
                            <p className="text-sm text-muted-foreground mt-0.5">{item.quantity}</p>
                          )}
                        </div>
                        {item.sourceRecipeId && (
                          <div className="px-3 py-1 rounded-lg bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider">
                            Oppskrift
                          </div>
                        )}
                        <button
                          onClick={() => openEdit(item)}
                          aria-label={`Rediger ${item.name}`}
                          className="p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          aria-label={`Fjern ${item.name}`}
                          className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {completedItems.length > 0 && (
                <div className="bg-secondary/20 pb-4">
                  <div className="px-6 py-3 bg-secondary/40 border-y border-border/50">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Huket av</h3>
                  </div>
                  {completedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors group opacity-70 hover:opacity-100">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => handleToggle(item)}
                        aria-label={`Merk ${item.name} som ikke handlet`}
                        className="h-10 w-10 rounded-xl border-2 data-[state=checked]:bg-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xl font-medium text-muted-foreground line-through truncate">{item.name}</p>
                      </div>
                      <button
                        onClick={() => openEdit(item)}
                        aria-label={`Rediger ${item.name}`}
                        className="p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        aria-label={`Fjern ${item.name}`}
                        className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editItem)} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger handlelistevare</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Vare</label>
              <Input value={editName} onChange={(event) => setEditName(event.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Mengde</label>
              <Input value={editQuantity} onChange={(event) => setEditQuantity(event.target.value)} placeholder="For eksempel 2 pakker" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Kategori</label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Avbryt</Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim() || updateItem.isPending}>Lagre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
