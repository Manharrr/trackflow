// import {
//   Navigate
// } from 'react-router-dom'

// import {
//   useAuth
// } from '../contexts/AuthContext'

// export default function RoleRedirect() {
//   const {
//     user,
//     isLoading
//   } = useAuth()

//   if (
//     isLoading
//   ) {
//     return null
//   }

//   if (
//     !user
//   ) {
//     return (
//       <Navigate
//         to="/login"
//       />
//     )
//   }

//   switch (
//     user.role
//   ) {
//     case 'super_admin':
//       return (
//         <Navigate
//           to="/super-admin"
//           replace
//         />
//       )

//     case 'company_admin':
//       return (
//         <Navigate
//           to="/dashboard"
//           replace
//         />
//       )

//     case 'operations_manager':
//       return (
//         <Navigate
//           to="/operations"
//           replace
//         />
//       )

//     default:
//       return (
//         <Navigate
//           to="/employee"
//           replace
//         />
//       )
//   }
// }




// <Route
//   path="/"
//   element={
//     <RoleRedirect />
//   }
// />