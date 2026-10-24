
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase-browser";

type StatusEleicao = "Planejada" | "Em andamento" | "Encerrada";

type Eleicao = {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  status: StatusEleicao;
};

function calcularStatus(inicio: string, fim: string): StatusEleicao {
  const agora = new Date();
  const dataInicio = new Date(inicio);
  const dataFim = new Date(fim);

  if (agora < dataInicio) return "Planejada";
  if (agora > dataFim) return "Encerrada";
  return "Em andamento";
}

function formatarData(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function corStatus(status: StatusEleicao) {
  if (status === "Em andamento") return "bg-emerald-100 text-emerald-800";
  if (status === "Encerrada") return "bg-slate-200 text-slate-700";
  return "bg-amber-100 text-amber-800";
}

function paraDataBanco(data: string) {
  return new Date(data).toISOString();
}

export default function EleicoesPage() {
  const [eleicoes, setEleicoes] = useState<Eleicao[]>([]);
  const [nome, setNome] = useState("Eleição CIPA");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro">("sucesso");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const carregarEleicoes = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("eleicoes")
        .select("id, nome, data_inicio, data_fim, status")
        .order("data_inicio", { ascending: false });

      if (error) throw error;

      setEleicoes((data ?? []) as Eleicao[]);
    } catch (error) {
      console.error("Erro ao carregar eleições:", error);
      setMensagem("Não foi possível carregar as eleições. Verifique sua conexão e suas permissões.");
      setTipoMensagem("erro");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // The Supabase request resolves before carregarEleicoes updates component state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregarEleicoes();
  }, [carregarEleicoes]);

  function notificar(texto: string, tipo: "sucesso" | "erro") {
    setMensagem(texto);
    setTipoMensagem(tipo);
  }

  async function cadastrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");

    const nomeLimpo = nome.trim();

    if (!nomeLimpo || !inicio || !fim) {
      notificar("Preencha todos os campos.", "erro");
      return;
    }

    if (new Date(fim) <= new Date(inicio)) {
      notificar("O encerramento deve ser posterior ao início.", "erro");
      return;
    }

    setSalvando(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.from("eleicoes").insert({
        nome: nomeLimpo,
        data_inicio: paraDataBanco(inicio),
        data_fim: paraDataBanco(fim),
        status: calcularStatus(inicio, fim),
      });

      if (error) {
        console.error("Erro ao cadastrar eleição:", error);
        notificar("Não foi possível cadastrar a eleição. Confira as permissões do Supabase.", "erro");
        return;
      }

      setNome("");
      setInicio("");
      setFim("");

      await carregarEleicoes();
      notificar("Eleição cadastrada com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro ao cadastrar eleição:", error);
      notificar("Erro de conexão ao cadastrar a eleição.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(eleicao: Eleicao) {
    if (!window.confirm(`Deseja excluir a eleição "${eleicao.nome}"?`)) {
      return;
    }

    setMensagem("");
    setExcluindoId(eleicao.id);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("eleicoes")
        .delete()
        .eq("id", eleicao.id);

      if (error) {
        console.error("Erro ao excluir eleição:", error);

        if (error.code === "23503") {
          notificar(
            "Esta eleição já possui registros vinculados e não pode ser excluída. Verifique os candidatos e os registros eleitorais.",
            "erro"
          );
        } else {
          notificar("Não foi possível excluir a eleição.", "erro");
        }
        return;
      }

      await carregarEleicoes();
      notificar("Eleição excluída com sucesso.", "sucesso");
    } catch (error) {
      console.error("Erro ao excluir eleição:", error);
      notificar("Erro de conexão ao excluir a eleição.", "erro");
    } finally {
      setExcluindoId(null);
    }
  }

  const filtradas = eleicoes.filter((eleicao) =>
    eleicao.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/dashboard" className="text-sm font-medium text-emerald-800 hover:underline">
              ← Voltar ao painel
            </a>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Eleições</h1>
            <p className="mt-2 text-slate-500">
              Configure e acompanhe as eleições da CIPA.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-3">
            <p className="text-sm text-slate-500">Total de eleições</p>
            <p className="text-2xl font-bold text-emerald-800">{eleicoes.length}</p>
            <p className="text-xs text-slate-500">Dados do Supabase</p>
          </div>
        </header>

        {mensagem && (
          <p
            role="status"
            className={`mb-6 rounded-xl border p-4 text-sm ${
              tipoMensagem === "sucesso"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {mensagem}
          </p>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Nova eleição</h2>
            <p className="mb-6 mt-1 text-sm text-slate-500">
              Defina o nome e o período de votação.
            </p>

            <form onSubmit={cadastrar} className="space-y-4">
              <div>
                <label htmlFor="nome" className="mb-2 block text-sm font-medium">
                  Nome da eleição
                </label>
                <input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: CIPA 2026/2027"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  required
                />
              </div>

              <div>
                <label htmlFor="inicio" className="mb-2 block text-sm font-medium">
                  Início da votação
                </label>
                <input
                  id="inicio"
                  type="datetime-local"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  required
                />
              </div>

              <div>
                <label htmlFor="fim" className="mb-2 block text-sm font-medium">
                  Encerramento da votação
                </label>
                <input
                  id="fim"
                  type="datetime-local"
                  value={fim}
                  min={inicio || undefined}
                  onChange={(e) => setFim(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full rounded-xl bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "+ Cadastrar eleição"}
              </button>
            </form>
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Eleições cadastradas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Consulte os períodos e os status.
                </p>
              </div>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar eleição..."
                aria-label="Buscar eleição"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-emerald-700 sm:w-56"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-4 font-medium">Eleição</th>
                    <th className="px-3 py-4 font-medium">Início</th>
                    <th className="px-3 py-4 font-medium">Fim</th>
                    <th className="px-3 py-4 font-medium">Status</th>
                    <th className="px-3 py-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 text-center text-slate-500">
                        Carregando eleições...
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filtradas.map((eleicao) => {
                        const status = calcularStatus(
                          eleicao.data_inicio,
                          eleicao.data_fim
                        );

                        return (
                          <tr key={eleicao.id} className="border-b border-slate-100">
                            <td className="px-3 py-4 font-medium text-slate-900">
                              {eleicao.nome}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4">
                              {formatarData(eleicao.data_inicio)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4">
                              {formatarData(eleicao.data_fim)}
                            </td>
                            <td className="px-3 py-4">
                              <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${corStatus(status)}`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-3 py-4">
                              <button
                                type="button"
                                disabled={excluindoId !== null}
                                onClick={() => void excluir(eleicao)}
                                className="font-medium text-red-600 hover:underline disabled:opacity-50"
                              >
                                {excluindoId === eleicao.id ? "Excluindo..." : "Excluir"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {filtradas.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-12 text-center text-slate-500">
                            {busca
                              ? "Nenhuma eleição encontrada."
                              : "Nenhuma eleição cadastrada."}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
