import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  gradient: string
}

export default function FeatureCard({ icon: Icon, title, description, gradient }: FeatureCardProps) {
  return (
    <Card className="group bg-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
      <CardHeader className="p-8">
        <div className={`w-16 h-16 bg-gradient-to-r ${gradient} rounded-2xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform shadow-lg`}>
          <Icon className="w-8 h-8" />
        </div>
        <CardTitle className="text-xl font-bold text-slate-900 mb-3">{title}</CardTitle>
        <CardDescription className="text-slate-600 leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}