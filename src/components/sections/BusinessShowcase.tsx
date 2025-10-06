import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin, Calendar } from "lucide-react"

export default function BusinessShowcase() {
  const businesses = [
    {
      name: "Bella Vista Spa",
      type: "Spa & Wellness",
      image: "/modern-spa-interior-with-relaxing-atmosphere.jpg",
      rating: 4.9,
      bookings: "2,500+ reservas/mes",
      location: "Madrid, España",
      description: "Spa de lujo especializado en tratamientos faciales y corporales",
    },
    {
      name: "Clínica Dental Sonrisa",
      type: "Consultorio Médico",
      image: "/modern-dental-clinic-interior-clean-and-profession.jpg",
      rating: 4.8,
      bookings: "1,800+ citas/mes",
      location: "Barcelona, España",
      description: "Clínica dental moderna con tecnología de vanguardia",
    },
    {
      name: "Estudio Fitness Pro",
      type: "Gimnasio & Fitness",
      image: "/modern-gym-interior-with-equipment-and-natural-lig.jpg",
      rating: 4.9,
      bookings: "3,200+ clases/mes",
      location: "Valencia, España",
      description: "Centro de entrenamiento personal y clases grupales",
    },
    {
      name: "Salón Elegance",
      type: "Salón de Belleza",
      image: "/elegant-hair-salon-interior-with-modern-styling-ch.jpg",
      rating: 4.7,
      bookings: "2,100+ servicios/mes",
      location: "Sevilla, España",
      description: "Salón de belleza especializado en cortes y coloración",
    },
    {
      name: "Taller AutoExpert",
      type: "Taller Mecánico",
      image: "/professional-auto-repair-shop-interior-clean-and-o.jpg",
      rating: 4.8,
      bookings: "800+ reparaciones/mes",
      location: "Bilbao, España",
      description: "Taller especializado en reparación y mantenimiento automotriz",
    },
    {
      name: "Veterinaria Amigos",
      type: "Clínica Veterinaria",
      image: "/modern-veterinary-clinic-interior-with-examination.jpg",
      rating: 4.9,
      bookings: "1,500+ consultas/mes",
      location: "Málaga, España",
      description: "Clínica veterinaria integral para mascotas",
    },
  ]

  return (
    <section id="businesses" className="py-24 px-4 bg-gradient-to-br from-white via-gray-50 to-slate-50">
      <div className="container mx-auto">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
            Negocios de Éxito
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Negocios que ya <span className="text-emerald-600">confían en TuTurno</span>
          </h2>
          <p className="text-xl text-slate-600 text-pretty max-w-3xl mx-auto">
            Descubre cómo diferentes tipos de negocios están transformando su gestión de citas con nuestra plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {businesses.map((business, index) => (
            <Card
              key={index}
              className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden transform hover:scale-105"
            >
              <div className="relative">
                <img
                  src={business.image}
                  alt={business.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1 shadow-lg">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-semibold text-slate-700">{business.rating}</span>
                </div>
              </div>
              
              <CardHeader className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <CardTitle className="text-slate-900 text-lg font-bold">{business.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs mt-2 bg-emerald-100 text-emerald-700">
                      {business.type}
                    </Badge>
                  </div>
                </div>
                
                <CardDescription className="text-sm mb-4 text-slate-600 leading-relaxed">
                  {business.description}
                </CardDescription>
                
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>{business.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-700">{business.bookings}</span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}