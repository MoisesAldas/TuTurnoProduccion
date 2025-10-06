import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin, Calendar } from "lucide-react"

interface BusinessCardProps {
  name: string
  type: string
  image?: string
  rating: number
  bookings: string
  location: string
  description: string
}

export default function BusinessCard({
  name,
  type,
  image,
  rating,
  bookings,
  location,
  description
}: BusinessCardProps) {
  return (
    <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden transform hover:scale-105">
      <div className="relative">
        <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-slate-200 flex items-center justify-center group-hover:from-indigo-50 group-hover:to-slate-100 transition-all">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-slate-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <p className="text-slate-500 text-sm">Imagen de {type}</p>
            </div>
          )}
        </div>
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1 shadow-lg">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-sm font-semibold text-slate-700">{rating}</span>
        </div>
      </div>
      
      <CardHeader className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <CardTitle className="text-slate-900 text-lg font-bold">{name}</CardTitle>
            <Badge variant="secondary" className="text-xs mt-2 bg-indigo-100 text-indigo-700">
              {type}
            </Badge>
          </div>
        </div>
        
        <CardDescription className="text-sm mb-4 text-slate-600 leading-relaxed">
          {description}
        </CardDescription>
        
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-indigo-700">{bookings}</span>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}