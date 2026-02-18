import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';

const PrivateRoute = () => {
  // loading → prevents route from rendering until we verify session
  // isAuth → tells whether user is still authenticated or not
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    /*
      SESSION VALIDATION FLOW

      Why this exists:
      - Access token expires in 15 minutes
      - Refresh token (cookie) lasts 1 day
      - When user reopens site, we must silently generate a new access token

      Steps:
      1) Call /refresh endpoint
      2) If refresh token is valid → backend sends new access token
      3) Save new token → allow dashboard access
      4) If refresh token expired → force logout
    */
    const checkSession = async () => {
      try {
        // Call backend refresh route
        // credentials: "include" is REQUIRED to send HTTP-only cookie
        const res = await fetch("http://localhost:5000/api/auth/refresh", {
          method: "POST",
          credentials: "include"
        });

        // If refresh token is invalid/expired → session ended
        if (!res.ok) throw new Error("Session expired");

        // Get newly generated access token
        const data = await res.json();

        // Store fresh access token in localStorage
        // This will be used for API calls & socket authentication
        localStorage.setItem("token", data.accessToken);

        // User is authenticated
        setIsAuth(true);
      } catch (err) {
        /*
          This happens when:
          - Refresh token expired (after 1 day)
          - User manually logged out
          - Cookie missing

          Action:
          - Clear local session
          - Redirect to login
        */
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsAuth(false);
      } finally {
        // Stop loading state so route decision can be made
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  /*
    While checking session:
    - Don't render dashboard
    - Prevent flicker/unauthorized access
  */
  if (loading) return null; // can replace with spinner later

  /*
    Final Decision:
    - If authenticated → allow access to protected routes
    - Else → redirect to login page
  */
  return isAuth ? <Outlet /> : <Navigate to="/" />;
};

export default PrivateRoute;
