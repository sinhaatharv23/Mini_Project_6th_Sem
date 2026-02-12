// Import Navigate component for redirecting users and Outlet for rendering child routes
import { Navigate, Outlet } from 'react-router-dom';

// Define a PrivateRoute component that protects routes from unauthorized access
const PrivateRoute = () => {
  
  // Check if user has a valid authentication token stored in browser's localStorage
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  /*
    EXTRA SAFE CHECK:
    - token ensures user is authenticated
    - user ensures profile exists
    If either missing → session broken → send to login
  */
  return token && user ? <Outlet /> : <Navigate to="/" />;
};

// Export the component so it can be used in route configuration
export default PrivateRoute;