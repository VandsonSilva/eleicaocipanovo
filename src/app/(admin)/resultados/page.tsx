
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type Eleicao = {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  status: string;
};

type CandidatoResultado = {
  id: string;
  nome: string;
  numero: string | number;
  setor: string | null;
  quantidade: number;
};

type Resultado = {
  disponivel: boolean;
  mensagem?: string;
  total_votos?: number;
  votos_brancos?: number;
  participantes?: number;
  candidatos?: CandidatoResultado[];
};

export default function ResultadosPage() {
  const [eleicoes, setEleicoes] = useState<Eleicao[]>([]);
  const [eleicaoId, setEleicaoId] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const supabase = createClient();

  const carregarEleicoes = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("eleicoes")
      .select("id, nome, data_inicio, data_fim, status")
      .order("data_inicio", { ascending: false });

    if (error) {
      setErro("Não foi possível carregar as eleições: " + error.message);
      setCarregando(false);
      return;
    }

    const lista = (data ?? []) as Eleicao[];
    setEleicoes(lista);

    setEleicaoId((atual) => {
      if (atual && lista.some((item) => item.id === atual)) {
        return atual;
      }
      return lista[0]?.id ?? "";
    });

    setCarregando(false);
  }, [supabase]);

  const carregarResultado = useCallback(async () => {
    setResultado(null);
    setErro("");

    if (!eleicaoId) return;

    setCarregando(true);

    const { data, error } = await supabase.rpc("resultados_cipa", {
      p_eleicao_id: eleicaoId,
    });

    if (error) {
      setErro("Erro ao consultar a apuração: " + error.message);
      setCarregando(false);
      return;
    }

    setResultado(data as Resultado);
    setCarregando(false);
  }, [eleicaoId, supabase]);

  useEffect(() => {
    void carregarEleicoes();
  }, [carregarEleicoes]);

  useEffect(() => {
    if (eleicaoId) {
      void carregarResultado();
    } else {
      setResultado(null);
    }
  }, [eleicaoId, carregarResultado]);

  const candidatos = resultado?.candidatos ?? [];
  const totalVotos = Number(resultado?.total_votos ?? 0);
  const votosBrancos = Number(resultado?.votos_brancos ?? 0);
  const votosCandidatos = Math.max(0, totalVotos - votosBrancos);

  function percentual(quantidade: number) {
    if (totalVotos === 0) return "0%";
    return `${((quantidade / totalVotos) * 100).toFixed(1)}%`;
  }

  const eleicaoSelecionada = eleicoes.find(
    (eleicao) => eleicao.id === eleicaoId
  );

  return (
    <main className="min-h-screen bg-slate-100 p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-green-800">
            Administração da CIPA
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">
            Apuração de resultados
          </h1>
          <p className="mt-2 text-slate-600">
            Resultados consultados diretamente no banco de dados.
          </p>
        </header>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="eleicao"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Selecionar eleição
          </label>

          <select
            id="eleicao"
            value={eleicaoId}
            onChange={(e) => setEleicaoId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-800 md:max-w-lg"
          >
            <option value="">Selecione uma eleição</option>
            {eleicoes.map((eleicao) => (
              <option key={eleicao.id} value={eleicao.id}>
                {eleicao.nome}
              </option>
            ))}
          </select>

          {eleicaoSelecionada && (
            <p className="mt-3 text-sm text-slate-500">
              Status cadastrado: {eleicaoSelecionada.status}
            </p>
          )}
        </section>

        {erro && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="rounded-xl bg-white p-10 text-center text-slate-600 shadow-sm">
            Carregando dados...
          </div>
        ) : !eleicaoId ? (
          <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm">
            Cadastre uma eleição para consultar os resultados.
          </div>
        ) : resultado && !resultado.disponivel ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
            <h2 className="text-xl font-black text-amber-900">
              Apuração indisponível
            </h2>
            <p className="mt-2 text-amber-800">
              {resultado.mensagem ??
                "A apuração estará disponível após o encerramento da eleição."}
            </p>
          </div>
        ) : resultado?.disponivel ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  Total de votos
                </p>
                <p className="mt-2 text-3xl font-black text-slate-900">
                  {totalVotos}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  Votos em candidatos
                </p>
                <p className="mt-2 text-3xl font-black text-green-700">
                  {votosCandidatos}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  Votos em branco
                </p>
                <p className="mt-2 text-3xl font-black text-amber-600">
                  {votosBrancos}
                </p>
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
              <div className="mb-6">
                <h2 className="text-xl font-black text-slate-900">
                  Resultado por candidato
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Classificação pela quantidade de votos registrados.
                </p>
              </div>

              {candidatos.length === 0 ? (
                <p className="py-8 text-center text-slate-500">
                  Nenhum candidato cadastrado nesta eleição.
                </p>
              ) : (
                <div className="space-y-5">
                  {candidatos.map((candidato, index) => (
                    <div key={candidato.id}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-black text-green-800">
                            {index + 1}º
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {candidato.nome}
                            </p>
                            <p className="text-sm text-slate-500">
                              Número {candidato.numero}
                              {candidato.setor
                                ? ` · ${candidato.setor}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-black text-slate-900">
                            {candidato.quantidade} voto(s)
                          </p>
                          <p className="text-sm font-semibold text-green-700">
                            {percentual(candidato.quantidade)}
                          </p>
                        </div>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-green-700 transition-all"
                          style={{
                            width: percentual(candidato.quantidade),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-700">
                    Votos em branco
                  </p>
                  <p className="font-black text-slate-900">
                    {votosBrancos} ({percentual(votosBrancos)})
                  </p>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: percentual(votosBrancos) }}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  Participações registradas:{" "}
                  <strong>{resultado.participantes ?? 0}</strong>
                </p>
              </div>
            </section>

            <p className="mt-5 text-sm leading-6 text-slate-500">
              Dados calculados pelo banco de dados. Antes de considerar esta
              apuração oficial, valide o processo de registro dos votos e a
              correspondência entre votos e participações.
            </p>
          </>
        ) : null}

        <div className="mt-5">
          <button
            type="button"
            onClick={() => void carregarResultado()}
            disabled={!eleicaoId || carregando}
            className="rounded-lg bg-green-800 px-5 py-3 font-bold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Atualizar apuração
          </button>
        </div>
      </div>
    </main>
  );
}
