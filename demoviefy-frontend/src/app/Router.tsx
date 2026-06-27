import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Home from "src/pages/Home";
import Upload from "src/pages/Upload";
import Video from "src/pages/Video";

// Define os títulos das páginas com base nas rotas
const titlesMap: Record<string, string> = {
    "/": "DeMoviefy",
    "/upload": "DeMoviefy - Painel de Envio",
};

// Aplica o título na página caso ela esteja declarada acima. Caso não, o valor padrão ("DeMoviefy") será vinculado.
function TitleManager() {
    const { pathname } = useLocation()

    useEffect(() => {

        // Workaround para o map acima, pois video/{id} nunca é uma rota fixa.
        if (pathname.startsWith("/video/")) {
            document.title = "DeMoviefy - Painel de Análise";
            return;
        }
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
                <Route path="/video/:id" element={<Video />} />
                <Route path="*" element={<Navigate replace to="/" />} />
            </Routes>
        </>
    )
}