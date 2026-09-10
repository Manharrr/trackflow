import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layouts/Sidebar'
import Header from '../components/layouts/Header'

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
