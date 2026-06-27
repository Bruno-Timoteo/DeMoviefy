import { BrowserRouter } from "react-router-dom";
import { CompatibilityGate } from "src/components/CompatibilityGate";
import MainLayout from "src/layouts/MainLayout";
import Router from "src/app/Router";

function App() {
    return (
        <BrowserRouter>
            <CompatibilityGate>
                <MainLayout>
                    <Router />
                </MainLayout>
            </CompatibilityGate>
        </BrowserRouter>
    );
}

export default App;