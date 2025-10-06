import { LucideIcon } from "lucide-react"

interface StatCardProps {
  icon: LucideIcon
  value: string
  label: string
  gradient: string
}

export default function StatCard({ icon: Icon, value, label, gradient }: StatCardProps) {
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/40 shadow-lg hover:shadow-xl transition-all">
      <div className={`w-16 h-16 bg-gradient-to-r ${gradient} rounded-2xl flex items-center justify-center mb-4 mx-auto`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <p className="text-3xl font-bold text-slate-900 mb-2">{value}</p>
      <p className="text-slate-600">{label}</p>
    </div>
  )
}