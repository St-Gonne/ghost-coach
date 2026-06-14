import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGetAuthStatus } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

// Pages
import NotFound from "@/pages/not-found";
import Today from "@/pages/today";
import Week from "@/pages/week";
import Debug from "@/pages/debug";
import Activities from "@/pages/activities";
import Routines from "@/pages/routines";
import Locations from "@/pages/locations";
import Settings from "@/pages/settings";
import Integrations from "@/pages/integrations";
import Login from "@/pages/login";

const queryClient = new QueryClient();

function Router() {
  const { data: auth, isLoading } = useGetAuthStatus();

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (auth && !auth.mockMode && !auth.authenticated) {
    return <Login auth={auth} />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Today} />
        <Route path="/week" component={Week} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/activities" component={Activities} />
        <Route path="/routines" component={Routines} />
        <Route path="/locations" component={Locations} />
        <Route path="/settings" component={Settings} />
        <Route path="/debug" component={Debug} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
