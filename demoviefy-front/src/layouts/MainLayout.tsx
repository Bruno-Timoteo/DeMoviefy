/* Layout básico:

Navbar
Sidebar
Rodapé

Espaço para conteúdo

*/

// import React from "react";
import Footer from "../components/Footer";

export default function MainLayout(
    //{ children }: { children: React.ReactNode }
    ) {
    return (
        // Usamos classes do Tailwind para garantir que o layout ocupe a tela toda
        <div className="flex flex-col min-h-screen">
            
            {/* O conteúdo da página entra aqui */}
            <main className="grow">
                {/* {children} */}
                <p>Teste</p>
            </main>

            <footer>
                <Footer />
            </footer>
            
        </div>
    );
}