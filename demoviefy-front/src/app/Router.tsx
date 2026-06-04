import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Home from "../pages/Home";
import Upload from "../pages/Upload";

// Define os títulos das com base nas rotas
const titlesMap: Record<string, string> = {
    "/": "DeMoviefy",
    "/upload": "DeMoviefy - Painel de Análise"
};

// Aplica o título na página caso ela esteja declarada acima. Caso não, o valor DeMoviefy padrão será vinculado.
function TitleManager() {
    const { pathname } = useLocation()

    useEffect(() => {
        document.title =  titlesMap[pathname] ?? "DeMoviefy";
    }, [pathname]);

    return null;
}

// Declara todas as rotas disponíveis em nosso projeto. Mais fácil para gerenciamento unificado.
// A úlitma rota (com *) declara um cenário de exceção, caso não atenda nenhuma das anteriores.

export default function Router() {
    return (
        <>
            <TitleManager />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="*" element={<Navigate replace to="/" />} />
            </Routes>
        </>
    )
}