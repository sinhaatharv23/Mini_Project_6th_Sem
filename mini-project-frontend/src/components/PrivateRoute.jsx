// Import Navigate component for redirecting users and Outlet for rendering child routes
import { Navigate, Outlet } from 'react-router-dom';

// Define a PrivateRoute component that protects routes from unauthorized access
const PrivateRoute = () => {
  
  // Check if user has a valid authentication token stored in browser's localStorage
  const token = localStorage.getItem("token");
  
  // Conditional rendering:
  // - If token exists (user is authenticated): render <Outlet /> which displays the protected child route component
  // - If no token (user not authenticated): redirect to "/" (login page) using <Navigate>, replace=true prevents going back in history
  return token ? <Outlet /> : <Navigate to="/" replace />;
};

// Export the component so it can be used in route configuration
export default PrivateRoute;