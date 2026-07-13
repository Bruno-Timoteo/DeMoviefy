import { BrowserRouter } from "react-router-dom";
import { Toast } from "src/core/components/Toast";
import { CompatibilityGate } from "src/core/components/CompatibilityGate";
import MainLayout from "src/layouts/MainLayout";
import Router from "src/app/Router";

function App() {
    return (
            <BrowserRouter>
                <CompatibilityGate>
                    <MainLayout>
                        <Toast />
                        <Router />
                    </MainLayout>
                </CompatibilityGate>
            </BrowserRouter>
    );
}

export default App;