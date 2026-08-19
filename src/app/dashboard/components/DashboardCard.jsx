export default function DashboardCard({ title, value }) {
  return (
    <div className="bg-neutral-900 p-4 rounded-xl text-center">
      <p className="text-sm uppercase">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
