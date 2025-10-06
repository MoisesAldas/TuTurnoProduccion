import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader } from "@/components/ui/card"
import { Star, Quote } from "lucide-react"

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "María González",
      role: "Propietaria de Bella Vista Spa",
      image: "/professional-woman-spa-owner-smiling.jpg",
      content: "TuTurno revolucionó completamente nuestro negocio. Antes perdíamos muchas citas por llamadas perdidas, ahora nuestros clientes reservan 24/7 y hemos aumentado nuestros ingresos un 40%.",
      rating: 5,
    },
    {
      name: "Dr. Carlos Ruiz",
      role: "Director de Clínica Dental Sonrisa",
      image: "/professional-male-dentist-in-white-coat-smiling.jpg",
      content: "La integración con nuestro sistema de gestión fue perfecta. Los recordatorios automáticos redujeron las ausencias en un 60%. Es una herramienta indispensable para cualquier consultorio.",
      rating: 5,
    },
    {
      name: "Ana Martín",
      role: "Entrenadora Personal en Fitness Pro",
      image: "/fitness-trainer-woman-athletic-wear-smiling.jpg",
      content: "Mis clientes aman la facilidad para reservar y cambiar citas. La app móvil es increíble y me permite gestionar mi agenda desde cualquier lugar. ¡Totalmente recomendado!",
      rating: 5,
    },
    {
      name: "Roberto Silva",
      role: "Propietario de Taller AutoExpert",
      image: "/mechanic-man-in-work-uniform-professional-smiling.jpg",
      content: "Nunca pensé que un taller mecánico necesitara un sistema de reservas, pero TuTurno nos ayudó a organizar mejor el trabajo y reducir los tiempos de espera. Nuestros clientes están más satisfechos.",
      rating: 5,
    },
    {
      name: "Laura Fernández",
      role: "Estilista en Salón Elegance",
      image: "/hair-stylist-woman-professional-salon-environment-.jpg",
      content: "La gestión de clientes es fantástica. Puedo ver el historial completo de cada cliente y sus preferencias. Esto me permite ofrecer un servicio más personalizado y profesional.",
      rating: 5,
    },
    {
      name: "Dr. Miguel Torres",
      role: "Veterinario en Clínica Amigos",
      image: "/veterinarian-man-with-stethoscope-professional-smi.jpg",
      content: "Los dueños de mascotas pueden reservar citas fácilmente y reciben recordatorios automáticos. Esto ha mejorado significativamente la puntualidad y ha reducido nuestro trabajo administrativo.",
      rating: 5,
    },
  ]

  return (
    <section id="testimonials" className="py-24 px-4 bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-slate-100 text-slate-700 hover:bg-slate-200">
            Testimonios Reales
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Lo que dicen nuestros clientes
          </h2>
          <p className="text-xl text-slate-600 text-pretty max-w-3xl mx-auto">
            Miles de negocios han transformado su gestión de citas con TuTurno. Estas son sus experiencias.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative group">
              <CardHeader className="p-8">
                <div className="flex items-start gap-4">
                  <img
                    src={testimonial.image || "/placeholder-user.jpg"}
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-200 bg-white"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-slate-900">{testimonial.name}</h4>
                      <div className="flex">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">{testimonial.role}</p>
                  </div>
                </div>
                <Quote className="w-8 h-8 text-emerald-200 absolute top-4 right-6" />
                <CardDescription className="text-sm leading-relaxed italic text-slate-700">
                  "{testimonial.content}"
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}