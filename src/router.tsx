import { Navigate } from 'react-router-dom';
import Login from "./pages/Login";
import Register from "./pages/Register";
import RoleSelect from "./pages/RoleSelect";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import SearchPage from "./pages/SearchPage";
import NotFound from "./pages/NotFound";

export const routers = [
    {
      path: "/",
      name: 'root',
      element: <Navigate to="/home" replace />,
    },
    {
      path: "/login",
      name: 'login',
      element: <Login />,
    },
    {
      path: "/register",
      name: 'register',
      element: <Register />,
    },
    {
      path: "/role-select",
      name: 'role-select',
      element: <RoleSelect />,
    },
    {
      path: "/home",
      name: 'home',
      element: <Home />,
    },
    {
      path: "/profile",
      name: 'profile',
      element: <Profile />,
    },
    {
      path: "/search",
      name: 'search',
      element: <SearchPage />,
    },
    /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
    {
      path: "*",
      name: '404',
      element: <NotFound />,
    },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;