
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", titulo: "Visão geral", icone: "▦" },
  { href: "/funcionarios", titulo: "Funcionários", icone: "♧" },
  { href: "/eleicoes", titulo: "Eleições", icone: "▤" },
  { href: "/candidatos", titulo: "Candidatos", icone: "✓" },
  { href: "/resultados", titulo: "Resultados", icone: "▥" },
  { href: "/liberacao", titulo: "Liberacao", icone: "▥" },
];

export default function SidebarAdmin() {
  const pathname = usePathname();

  async function sair() {
    const resposta = await fetch("/api/logout", {
      method: "POST",
    });

    if (resposta.redirected) {
      window.location.href = resposta.url;
    } else {
      window.location.href = "/";
    }
  }

  return (
    <aside className="bg-emerald-950 p-6 text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-xl font-bold">
          C
        </div>
        <div>
          <h1 className="font-bold">CIPA Votação</h1>
          <p className="text-xs text-emerald-200">
            Painel administrativo
          </p>
        </div>
      </div>

      <p className="mb-3 mt-10 text-xs uppercase tracking-widest text-emerald-300">
        Menu principal
      </p>

      <nav className="space-y-2">
        {links.map((link) => {
          const ativo = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium ${
                ativo
                  ? "bg-emerald-800 text-white"
                  : "text-emerald-100 hover:bg-emerald-900"
              }`}
            >
              <span>{link.icone}</span>
              {link.titulo}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 border-t border-emerald-800 pt-5">
        <button
          type="button"
          onClick={sair}
          className="block w-full rounded-xl px-4 py-3 text-left text-emerald-200 hover:bg-emerald-900"
        >
          Sair do sistema
        </button>
      </div>
    </aside>
  );
}
