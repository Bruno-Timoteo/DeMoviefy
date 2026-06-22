import { BrowserRouter } from "react-router-dom";
import MainLayout from "src/layouts/MainLayout";
import Router from "src/app/Router";

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Router />
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;