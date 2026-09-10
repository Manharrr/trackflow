import { useAuth } from "../../contexts/AuthContext";import { useNavigate } from 'react-router-dom'
import Button from "../../components/ui/Button";
// export default function DashboardPage() {
//   const { user, logout } = useAuth()
//   const navigate = useNavigate()

//   const handleLogout = async () => {
//     await logout()
//     navigate('/login')
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 p-8">
//       <div className="max-w-lg mx-auto">
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
//           <div className="flex items-center justify-between mb-6">
//             <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
//             <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize font-medium">
//               {user?.role}
//             </span>
//           </div>

//           <div className="space-y-3 mb-6">
//             <div className="flex justify-between py-2 border-b border-gray-50">
//               <span className="text-sm text-gray-500">Email</span>
//               <span className="text-sm font-medium text-gray-900">{user?.email}</span>
//             </div>
//             <div className="flex justify-between py-2 border-b border-gray-50">
//               <span className="text-sm text-gray-500">Username</span>
//               <span className="text-sm font-medium text-gray-900">{user?.username}</span>
//             </div>
//             <div className="flex justify-between py-2">
//               <span className="text-sm text-gray-500">MFA</span>
//               <span className={`text-sm font-medium ${user?.is_mfa_enabled ? 'text-green-600' : 'text-gray-400'}`}>
//                 {user?.is_mfa_enabled ? 'Enabled' : 'Not enabled'}
//               </span>
//             </div>
//           </div>

//           <Button variant="danger" onClick={handleLogout}>
//             Sign out
//           </Button>
//         </div>
//       </div>
//     </div>
//   )
// }
export default function DashboardPage() {
  return (
    <div>
      <h1
        className="
          text-3xl
          font-bold
          text-gray-800
        "
      >
        Welcome Back 👋
      </h1>

      <p className="text-gray-500 mt-2">
        Here is your logistics overview.
      </p>

      <div
        className="
          grid
          md:grid-cols-2
          lg:grid-cols-4
          gap-6
          mt-8
        "
      >
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Total Orders
          </p>

          <h2 className="text-4xl font-bold mt-3">
            120
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Shipments
          </p>

          <h2 className="text-4xl font-bold mt-3">
            80
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Employees
          </p>

          <h2 className="text-4xl font-bold mt-3">
            12
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Revenue
          </p>

          <h2 className="text-4xl font-bold mt-3">
            ₹50K
          </h2>
        </div>
      </div>
    </div>
  )
}