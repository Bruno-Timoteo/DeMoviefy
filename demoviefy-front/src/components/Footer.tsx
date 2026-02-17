import { type JSX } from "react";

export default function Footer(): JSX.Element
{

    const Year = new Date().getFullYear()
    return <div className="bg-gray-500 p-5 text-center">
        <p>Todos os direitos reservados {Year} &copy;</p>
    </div>
}