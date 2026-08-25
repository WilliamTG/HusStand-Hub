import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { useLocation, useParams } from "wouter"
import { useGetRecipe, useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from "@workspace/api-client-react"
import { getGetRecipeQueryKey, getListRecipesQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Save, Trash2, Heart, Plus, X } from "lucide-react"

export default function RecipeEditPage() {
  const params = useParams()
  const isNew = !params.id || params.id === "new"
  const recipeId = isNew ? 0 : parseInt(params.id as string, 10)
  
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  
  const { data: recipe, isLoading } = useGetRecipe(recipeId, { 
    query: { enabled: !isNew, queryKey: getGetRecipeQueryKey(recipeId) }
  })
  
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()
  const deleteRecipe = useDeleteRecipe()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Dinner",
    prepMinutes: 30,
    servings: 4,
    ingredients: [""],
    steps: [""],
    favorite: false
  })

  const initializedForId = useRef<number | null>(null)

  useEffect(() => {
    if (!isNew && recipe && initializedForId.current !== recipeId) {
      initializedForId.current = recipeId
      setFormData({
        name: recipe.name,
        description: recipe.description || "",
        category: recipe.category,
        prepMinutes: recipe.prepMinutes,
        servings: recipe.servings,
        ingredients: recipe.ingredients.length > 0 ? recipe.ingredients : [""],
        steps: recipe.steps.length > 0 ? recipe.steps : [""],
        favorite: recipe.favorite
      })
    }
  }, [recipe, isNew, recipeId])

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert("Recipe name is required")
      return
    }

    const cleanData = {
      ...formData,
      ingredients: formData.ingredients.filter(i => i.trim() !== ""),
      steps: formData.steps.filter(s => s.trim() !== "")
    }

    if (isNew) {
      createRecipe.mutate({ data: cleanData }, {
        onSuccess: (newRecipe) => {
          queryClient.invalidateQueries({ queryKey: getListRecipesQueryKey() })
          setLocation(`/recipes/${newRecipe.id}`)
        }
      })
    } else {
      updateRecipe.mutate({ id: recipeId, data: cleanData }, {
        onSuccess: (updatedRecipe) => {
          queryClient.setQueryData(getGetRecipeQueryKey(recipeId), updatedRecipe)
          queryClient.invalidateQueries({ queryKey: getListRecipesQueryKey() })
          setLocation("/recipes")
        }
      })
    }
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      deleteRecipe.mutate({ id: recipeId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRecipesQueryKey() })
          setLocation("/recipes")
        }
      })
    }
  }

  const updateArrayItem = (field: 'ingredients' | 'steps', index: number, value: string) => {
    const newArr = [...formData[field]]
    newArr[index] = value
    setFormData({ ...formData, [field]: newArr })
  }

  const removeArrayItem = (field: 'ingredients' | 'steps', index: number) => {
    const newArr = [...formData[field]]
    newArr.splice(index, 1)
    if (newArr.length === 0) newArr.push("")
    setFormData({ ...formData, [field]: newArr })
  }

  const addArrayItem = (field: 'ingredients' | 'steps') => {
    setFormData({ ...formData, [field]: [...formData[field], ""] })
  }

  if (!isNew && isLoading) {
    return <div className="space-y-8"><Skeleton className="h-16 w-64" /><Skeleton className="h-96 w-full" /></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in duration-300">
      <header className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation("/recipes")} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" /> Back
        </Button>
        <div className="flex gap-4">
          {!isNew && (
            <Button variant="destructive" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={handleDelete} disabled={deleteRecipe.isPending}>
              <Trash2 className="w-5 h-5 mr-2" /> Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={createRecipe.isPending || updateRecipe.isPending}>
            <Save className="w-5 h-5 mr-2" /> Save Recipe
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Main Details */}
          <Card className="border-none shadow-md bg-card">
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recipe Name</label>
                  <Input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="text-3xl font-display font-bold h-16 border-x-0 border-t-0 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                    placeholder="Enter recipe name..."
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`w-14 h-14 rounded-2xl ${formData.favorite ? 'text-accent bg-accent/10 hover:bg-accent/20' : 'text-muted-foreground bg-secondary hover:bg-secondary/80'}`}
                  onClick={() => setFormData({...formData, favorite: !formData.favorite})}
                >
                  <Heart className={`w-7 h-7 ${formData.favorite ? 'fill-current' : ''}`} />
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                <Textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description or personal notes..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                  <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dinner">Dinner</SelectItem>
                      <SelectItem value="Lunch">Lunch</SelectItem>
                      <SelectItem value="Breakfast">Breakfast</SelectItem>
                      <SelectItem value="Baking">Baking</SelectItem>
                      <SelectItem value="Dessert">Dessert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Prep Time (min)</label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={formData.prepMinutes}
                    onChange={e => setFormData({...formData, prepMinutes: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Servings</label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={formData.servings}
                    onChange={e => setFormData({...formData, servings: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Steps */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold font-display text-foreground">Instructions</h3>
            <div className="space-y-4">
              {formData.steps.map((step, i) => (
                <div key={`step-${i}`} className="flex gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mt-1">
                    {i + 1}
                  </div>
                  <Textarea 
                    value={step}
                    onChange={e => updateArrayItem('steps', i, e.target.value)}
                    placeholder={`Step ${i + 1} instructions...`}
                    className="min-h-[80px]"
                  />
                  <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive mt-1" onClick={() => removeArrayItem('steps', i)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full border-dashed" onClick={() => addArrayItem('steps')}>
                <Plus className="w-5 h-5 mr-2" /> Add Step
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar: Ingredients */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-2xl font-bold font-display text-foreground">Ingredients</h3>
          <Card className="border-none shadow-md bg-secondary/50">
            <CardContent className="p-6 space-y-4">
              {formData.ingredients.map((ing, i) => (
                <div key={`ing-${i}`} className="flex gap-2 items-center">
                  <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                  <Input 
                    value={ing}
                    onChange={e => updateArrayItem('ingredients', i, e.target.value)}
                    placeholder="e.g. 2 cups flour"
                    className="bg-card h-12"
                  />
                  <Button variant="ghost" size="icon" className="shrink-0 w-10 h-10 text-muted-foreground hover:text-destructive" onClick={() => removeArrayItem('ingredients', i)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-primary hover:bg-primary/10 mt-4" onClick={() => addArrayItem('ingredients')}>
                <Plus className="w-5 h-5 mr-2" /> Add Ingredient
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
