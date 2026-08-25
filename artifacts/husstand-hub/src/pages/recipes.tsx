import * as React from "react"
import { useState } from "react"
import { useListRecipes } from "@workspace/api-client-react"
import { Link, useLocation } from "wouter"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Plus, Clock, Users, Heart, ChefHat } from "lucide-react"

export default function RecipesPage() {
  const [search, setSearch] = useState("")
  const [, setLocation] = useLocation()
  const { data: recipes, isLoading } = useListRecipes({ search: search || undefined })

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold font-display text-foreground flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-primary" />
            Recipe Library
          </h1>
          <p className="text-xl text-muted-foreground mt-2">Family favorites and new ideas</p>
        </div>
        
        <Button size="lg" className="w-full md:w-auto gap-2" onClick={() => setLocation("/recipes/new")}>
          <Plus className="w-6 h-6" />
          Add Recipe
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6" />
        <Input 
          className="pl-14 h-16 text-xl rounded-2xl bg-card shadow-sm border-none ring-1 ring-border/50"
          placeholder="Search recipes..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({length: 6}).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-3xl" />
          ))}
        </div>
      ) : recipes?.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground bg-secondary/50 rounded-3xl border border-dashed border-border">
          <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-2xl font-semibold mb-2 text-foreground">No recipes found</h3>
          <p className="text-lg">Try adjusting your search or add a new recipe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes?.map(recipe => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <Card className="h-full cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-none bg-card ring-1 ring-border/50 group overflow-hidden flex flex-col relative">
                {recipe.favorite && (
                  <div className="absolute top-4 right-4 bg-background/80 backdrop-blur rounded-full p-2 text-accent shadow-sm z-10">
                    <Heart className="w-5 h-5 fill-current" />
                  </div>
                )}
                <div className="h-32 bg-secondary flex items-center justify-center text-primary/20 group-hover:bg-primary/5 transition-colors">
                   <ChefHat className="w-16 h-16" />
                </div>
                <CardContent className="p-6 flex-1 flex flex-col">
                  <Badge variant="outline" className="w-fit mb-3 bg-background">{recipe.category}</Badge>
                  <h3 className="text-2xl font-bold font-display mb-2 line-clamp-2">{recipe.name}</h3>
                  <p className="text-muted-foreground line-clamp-2 flex-1 mb-6">
                    {recipe.description || "No description provided."}
                  </p>
                  
                  <div className="flex items-center gap-6 mt-auto text-sm font-medium text-foreground/80">
                    <span className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-lg">
                      <Clock className="w-4 h-4 text-primary" /> {recipe.prepMinutes}m
                    </span>
                    <span className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-lg">
                      <Users className="w-4 h-4 text-primary" /> {recipe.servings}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
