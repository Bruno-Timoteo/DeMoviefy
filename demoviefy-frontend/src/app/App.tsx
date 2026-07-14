import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { CompatibilityGate } from "src/core/components/CompatibilityGate";
import MainLayout from "src/layouts/MainLayout";
import Router from "src/app/Router";

function App() {
    return (
            <BrowserRouter>
                <CompatibilityGate>
                    <MainLayout>
                        <Router />
                        <Toaster richColors position="top-right" />
                    </MainLayout>
                </CompatibilityGate>
            </BrowserRouter>
    );
}

export default App;