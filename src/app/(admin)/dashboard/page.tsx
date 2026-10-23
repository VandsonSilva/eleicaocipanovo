
"use client";

import Link from "next/link";

const indicadores = [
  {
    titulo: "Funcionários",
    valor: "0",
    detalhe: "Nenhum cadastrado ainda",
    icone: "users",
  },
  {
    titulo: "Candidatos",
    valor: "0",
    detalhe: "Aguardando cadastro",
    icone: "user-round-check",
  },
  {
    titulo: "Eleições",
    valor: "0",
    detalhe: "Nenhuma eleição criada",
    icone: "calendar-days",
  },
  {
    titulo: "Votos registrados",
    valor: "0",
    detalhe: "Nenhum voto computado",
    icone: "vote",
  },
];

const atalhos = [
  {
    titulo: "Cadastrar funcionários",
    descricao: "Gerencie matrículas, nomes e setores.",
    href: "/funcionarios",
    numero: "01",
  },
  {
    titulo: "Gerenciar eleições",
    descricao: "Crie eleições e configure os períodos.",
    href: "/eleicoes",
    numero: "02",
  },
  {
    titulo: "Cadastrar candidatos",
    descricao: "Defina os candidatos e seus números.",
    href: "/candidatos",
    numero: "03",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-800 sm:p-8 lg:p-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            ADMINISTRAÇÃO
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Visão geral
          </h1>

          <p className="mt-2 text-slate-500">
            Bem-vindo ao sistema de votação da CIPA.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Sistema</p>
          <p className="font-semibold text-emerald-700">
            Em configuração
          </p>
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((item) => (
          <article
            key={item.titulo}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                {item.titulo}
              </p>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-800">
                {item.icone === "users" && "♧"}
                {item.icone === "user-round-check" && "✓"}
                {item.icone === "calendar-days" && "▦"}
                {item.icone === "vote" && "▣"}
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold text-slate-900">
              {item.valor}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {item.detalhe}
            </p>
          </article>
        ))}
      </div>

      <section className="mt-9">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">
            Acesso rápido
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Comece configurando os dados da eleição.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {atalhos.map((atalho) => (
            <article
              key={atalho.numero}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <p className="text-sm font-bold text-emerald-700">
                ETAPA {atalho.numero}
              </p>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {atalho.titulo}
              </h3>

              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                {atalho.descricao}
              </p>

              <Link
                href={atalho.href}
                className="mt-5 inline-flex rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
              >
                Acessar cadastro →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-400">
        CIPA Votação · Painel administrativo
      </footer>
    </main>
  );
}
