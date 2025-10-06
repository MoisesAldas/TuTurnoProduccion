import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Star,
  Shield,
  Users,
  TrendingUp,
  CheckCircle,
  Globe,
  Award,
  Zap
} from "lucide-react"

export default function BusinessTypes() {
  const businessTypes = [
    {
      title: "Salones de Belleza",
      icon: Star,
      description: "Cortes, manicure, tratamientos",
      gradient: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Consultorios Médicos",
      icon: Shield,
      description: "Citas médicas y especialistas",
      gradient: "from-teal-500 to-cyan-600",
      bgColor: "bg-teal-50"
    },
    {
      title: "Spas y Wellness",
      icon: Users,
      description: "Masajes y relajación total",
      gradient: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Fitness y Deporte",
      icon: TrendingUp,
      description: "Entrenamientos y clases",
      gradient: "from-amber-500 to-orange-600",
      bgColor: "bg-amber-50"
    },
    {
      title: "Talleres Mecánicos",
      icon: CheckCircle,
      description: "Reparación y mantenimiento",
      gradient: "from-gray-600 to-slate-700",
      bgColor: "bg-gray-50"
    },
    {
      title: "Educación",
      icon: Globe,
      description: "Clases particulares y tutorías",
      gradient: "from-cyan-500 to-emerald-600",
      bgColor: "bg-cyan-50"
    },
    {
      title: "Veterinarias",
      icon: Award,
      description: "Cuidado de mascotas",
      gradient: "from-emerald-600 to-teal-700",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Y muchos más...",
      icon: Zap,
      description: "Cualquier servicio con citas",
      gradient: "from-teal-600 to-cyan-700",
      bgColor: "bg-teal-50"
    },
  ]

  return (
    <section className="py-24 px-4 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="container mx-auto">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-slate-100 text-slate-700 hover:bg-slate-200">
            Para Todos los Sectores
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Perfecto para <span className="text-emerald-600">cualquier negocio</span>
          </h2>
          <p className="text-xl text-slate-600 text-pretty max-w-3xl mx-auto">
            Desde pequeños emprendimientos hasta grandes corporaciones. TuTurno se adapta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {businessTypes.map((business, index) => {
            const IconComponent = business.icon
            return (
              <Card key={index} className={`${business.bgColor} border-0 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105 group`}>
                <CardHeader className="p-8">
                  <div className={`w-20 h-20 bg-gradient-to-r ${business.gradient} rounded-2xl flex items-center justify-center mb-6 mx-auto text-white group-hover:scale-110 transition-transform shadow-lg`}>
                    <IconComponent className="w-10 h-10" />
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900 mb-2">{business.title}</CardTitle>
                  <CardDescription className="text-slate-600">{business.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}