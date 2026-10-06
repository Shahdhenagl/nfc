import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AccessPage from "./pages/AccessPage";
import LibraryPage from "./pages/LibraryPage";
import AdminPage from "./pages/AdminPage";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/access/:accessToken" component={AccessPage} /><Route path="/library" component={LibraryPage} /><Route path="/admin" component={AdminPage} /><Route path="/admin/:section" component={AdminPage} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
