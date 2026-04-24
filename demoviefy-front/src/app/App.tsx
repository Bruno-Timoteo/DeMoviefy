import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Upload from "../pages/Upload";

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
