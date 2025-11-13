'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Star, SlidersHorizontal } from "lucide-react"

interface FilterSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  ratingFilter: number;
  setRatingFilter: (rating: number) => void;
}

export default function FilterSheet({ 
  isOpen, 
  onOpenChange,
  ratingFilter,
  setRatingFilter
}: FilterSheetProps) {
  
  const ratingOptions = [
    { value: "4.5", label: "4.5 y más" },
    { value: "4.0", label: "4.0 y más" },
    { value: "3.5", label: "3.5 y más" },
    { value: "3.0", label: "3.0 y más" },
  ]

  const handleClearFilters = () => {
    setRatingFilter(0);
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader className="p-6">
          <SheetTitle className="flex items-center gap-2 text-2xl">
            <SlidersHorizontal className="w-6 h-6" />
            Filtros
          </SheetTitle>
          <SheetDescription>
            Refina tu búsqueda para encontrar el servicio perfecto.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-grow overflow-y-auto p-6 space-y-8">
          {/* Rating Filter */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Calificación por estrellas</Label>
            <RadioGroup
              value={String(ratingFilter)}
              onValueChange={(value) => setRatingFilter(parseFloat(value) || 0)}
              className="space-y-2"
            >
              {ratingOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <RadioGroupItem value={option.value} id={`r-${option.value}`} />
                  <Label htmlFor={`r-${option.value}`} className="flex items-center gap-2 text-base cursor-pointer">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 transition-colors ${
                            parseFloat(option.value) <= i + 0.5 && parseFloat(option.value) > i
                              ? "text-amber-400 fill-amber-400" // Half star case, simplified
                              : parseFloat(option.value) > i
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span>{option.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <SheetFooter className="p-6 border-t bg-white">
          <div className="flex w-full gap-4">
            <Button variant="outline" className="w-full" onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
            <SheetClose asChild>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                Mostrar resultados
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}