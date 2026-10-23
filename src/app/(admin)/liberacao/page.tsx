
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

type Eleicao = {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  status: string;
};

type Liberacao = {
  liberado: boolean;
  nome: string;
  token: string;
  expira_em: string;
};

export default function LiberacaoPage() {
  const router = useRouter();

  const [eleicoes, setEleicoes] = useState<Eleicao[]>([]);
  const [eleicaoId, setEleicaoId] = useState("");
  const [matricula, setMatricula] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [liberando, setLiberando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [liberacao, setLiberacao] = useState<Liberacao | null>(null);
  const [abrindoUrna, setAbrindoUrna] = useState(false);

  useEffect(() => {
    async function carregarEleicoes() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("eleicoes")
        .select("id, nome, data_inicio, data_fim, status")
        .order("data_inicio", { ascending: false });

      if (error) {
        setMensagem("Não foi possível carregar as eleições.");
      } else {
        setEleicoes((data ?? []) as Eleicao[]);
      }

      setCarregando(false);
    }

    carregarEleicoes();
  }, []);

  useEffect(() => {
    function prepararProximoEleitor() {
      sessionStorage.removeItem("cipa-urna-token");
      sessionStorage.removeItem("cipa-urna-expira");
      sessionStorage.removeItem("cipa-urna-eleicao");

      setMatricula("");
      setLiberacao(null);
      setMensagem("");
      setAbrindoUrna(false);
    }

    window.addEventListener("pageshow", prepararProximoEleitor);

    return () => {
      window.removeEventListener("pageshow", prepararProximoEleitor);
    };
  }, []);

  async function liberarVotacao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem("");
    setLiberacao(null);

    if (!eleicaoId || !matricula.trim()) {
      setMensagem("Selecione uma eleição e informe a matrícula.");
      return;
    }

    setLiberando(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.rpc("liberar_urna", {
        p_eleicao_id: eleicaoId,
        p_matricula: matricula.trim(),
      });

      if (error) {
        setMensagem(error.message || "Não foi possível liberar a votação.");
        return;
      }

      const resultado = data as Liberacao;

      if (!resultado?.liberado || !resultado.token) {
        setMensagem("A urna não foi liberada. Confira os dados informados.");
        return;
      }

      setLiberacao(resultado);
      setMensagem("Funcionário validado. A votação está liberada.");
    } catch {
      setMensagem("Ocorreu um erro inesperado ao liberar a urna.");
    } finally {
      setLiberando(false);
    }
  }

  function abrirUrna() {
    if (!liberacao || !eleicaoId || abrindoUrna) return;
    setAbrindoUrna(true);

    sessionStorage.setItem("cipa-urna-token", liberacao.token);
    sessionStorage.setItem("cipa-urna-expira", liberacao.expira_em);
    sessionStorage.setItem("cipa-urna-eleicao", eleicaoId);

    router.push("/urna");
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
            Sistema CIPA
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Liberação da urna
          </h1>
          <p className="mt-2 text-slate-600">
            Confira a identidade do funcionário antes de liberar a votação.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <form onSubmit={liberarVotacao} className="space-y-6">
            <div>
              <label
                htmlFor="eleicao"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Eleição
              </label>

              <select
                id="eleicao"
                value={eleicaoId}
                onChange={(event) => {
                  setEleicaoId(event.target.value);
                  setLiberacao(null);
                  setMensagem("");
                }}
                disabled={carregando || liberando}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                required
              >
                <option value="">
                  {carregando
                    ? "Carregando eleições..."
                    : "Selecione a eleição"}
                </option>

                {eleicoes.map((eleicao) => (
                  <option key={eleicao.id} value={eleicao.id}>
                    {eleicao.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="matricula"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Matrícula do funcionário
              </label>

              <input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(event) => {
                  setMatricula(event.target.value);
                  setLiberacao(null);
                  setMensagem("");
                }}
                placeholder="Digite a matrícula"
                autoComplete="off"
                disabled={liberando}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={liberando || carregando}
              className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {liberando ? "Validando funcionário..." : "Validar e liberar votação"}
            </button>
          </form>

          {mensagem && (
            <div
              role="status"
              className={`mt-5 rounded-xl p-4 text-sm ${liberacao
                  ? "border border-green-200 bg-green-50 text-green-800"
                  : "border border-amber-200 bg-amber-50 text-amber-900"
                }`}
            >
              {mensagem}
            </div>
          )}

          {liberacao && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">
                Funcionário validado
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {liberacao.nome}
              </p>

              <p className="mt-2 text-sm text-slate-600">
                A autorização expira em até cinco minutos.
              </p>

              <button
                type="button"
                onClick={abrirUrna}
                disabled={abrindoUrna}
                className="mt-5 w-full rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {abrindoUrna ? "Abrindo urna..." : "Abrir urna para votação"}
              </button>
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Por segurança, confirme a identidade do funcionário presencialmente.
          Não permita que outra pessoa escolha ou acompanhe o voto.
        </p>
      </div>
    </main>
  );
}
