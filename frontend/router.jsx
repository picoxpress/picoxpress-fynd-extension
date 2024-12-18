import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Admin from "./Admin";
import NotFound from "./pages/NotFound";

const router = createBrowserRouter([
  {
    path: "/company/:company_id/",
    element: <App />,
  },
  {
    path: "/company/:company_id/application/:application_id",
    element: <App />,
  },
  {
    path: "/admin",
    element: <Admin/>,
  },
  {
    path: "/*", // Fallback route for all unmatched paths
    element: <NotFound />, // Component to render for unmatched paths
  },
]);

export default router;
