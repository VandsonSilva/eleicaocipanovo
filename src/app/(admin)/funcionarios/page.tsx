
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase-browser";

type Funcionario = {
  id: string;
  nome: string;
  matricula: string;
  setor: string;
  ativo: boolean;
};

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [busca, setBusca] = useState("");
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [setor, setSetor] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro">("sucesso");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  async function carregarFuncionarios() {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("funcionarios")
        .select("id, nome, matricula, setor, ativo")
        .order("nome", { ascending: true });

      if (error) throw error;

      setFuncionarios((data ?? []) as Funcionario[]);
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      setMensagem("Não foi possível carregar os funcionários. Verifique sua conexão e suas permissões.");
      setTipoMensagem("erro");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // The Supabase request resolves before carregarFuncionarios updates component state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregarFuncionarios();
  }, []);

  function mostrarMensagem(texto: string, tipo: "sucesso" | "erro") {
    setMensagem(texto);
    setTipoMensagem(tipo);
  }

  async function cadastrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");

    const nomeLimpo = nome.trim();
    const matriculaLimpa = matricula.trim();
    const setorLimpo = setor.trim();

    if (!nomeLimpo || !matriculaLimpa || !setorLimpo) {
      mostrarMensagem("Preencha todos os campos.", "erro");
      return;
    }

    const duplicada = funcionarios.some(
      (f) => f.matricula.toLowerCase() === matriculaLimpa.toLowerCase()
    );

    if (duplicada) {
      mostrarMensagem("Essa matrícula já está cadastrada.", "erro");
      return;
    }

    setSalvando(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.from("funcionarios").insert({
        nome: nomeLimpo,
        matricula: matriculaLimpa,
        setor: setorLimpo,
        ativo: true,
      });

      if (error) {
        if (error.code === "23505") {
          mostrarMensagem("Essa matrícula já existe no banco de dados.", "erro");
        } else {
          console.error("Erro ao cadastrar funcionário:", error);
          mostrarMensagem("Não foi possível cadastrar. Verifique as permissões do Supabase.", "erro");
        }
        return;
      }

      setNome("");
      setMatricula("");
      setSetor("");

      await carregarFuncionarios();
      mostrarMensagem("Funcionário cadastrado com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro ao cadastrar funcionário:", error);
      mostrarMensagem("Erro de conexão ao cadastrar funcionário.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarSituacao(funcionario: Funcionario) {
    setMensagem("");
    setAcaoId(funcionario.id);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("funcionarios")
        .update({ ativo: !funcionario.ativo })
        .eq("id", funcionario.id);

      if (error) {
        console.error("Erro ao alterar situação:", error);
        mostrarMensagem("Não foi possível alterar a situação do funcionário.", "erro");
        return;
      }

      await carregarFuncionarios();
      mostrarMensagem(
        `Funcionário ${funcionario.ativo ? "inativado" : "ativado"} com sucesso!`,
        "sucesso"
      );
    } catch (error) {
      console.error("Erro ao alterar situação:", error);
      mostrarMensagem("Erro de conexão ao atualizar funcionário.", "erro");
    } finally {
      setAcaoId(null);
    }
  }

  async function excluir(funcionario: Funcionario) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o funcionário ${funcionario.nome} (${funcionario.matricula})?`
    );

    if (!confirmou) return;

    setMensagem("");
    setAcaoId(funcionario.id);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("funcionarios")
        .delete()
        .eq("id", funcionario.id);

      if (error) {
        console.error("Erro ao excluir funcionário:", error);

        if (error.code === "23503") {
          mostrarMensagem(
            "Este funcionário está vinculado a outros registros e não pode ser excluído. Inative-o, se necessário.",
            "erro"
          );
        } else {
          mostrarMensagem("Não foi possível excluir o funcionário.", "erro");
        }
        return;
      }

      await carregarFuncionarios();
      mostrarMensagem("Funcionário excluído com sucesso.", "sucesso");
    } catch (error) {
      console.error("Erro ao excluir funcionário:", error);
      mostrarMensagem("Erro de conexão ao excluir funcionário.", "erro");
    } finally {
      setAcaoId(null);
    }
  }

  const filtrados = funcionarios.filter((f) =>
    `${f.nome} ${f.matricula} ${f.setor}`
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <a
              href="/dashboard"
              className="text-sm font-medium text-emerald-800 hover:underline"
            >
              ← Voltar ao painel
            </a>

            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Funcionários
            </h1>

            <p className="mt-2 text-slate-500">
              Cadastre e gerencie os funcionários da empresa.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-3">
            <p className="text-sm text-slate-500">Total cadastrado</p>
            <p className="text-2xl font-bold text-emerald-800">
              {funcionarios.length}
            </p>
            <p className="text-xs text-slate-500">Dados do Supabase</p>
          </div>
        </header>

        {mensagem && (
          <div
            role="status"
            className={`mb-6 rounded-xl border p-4 text-sm ${
              tipoMensagem === "sucesso"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {mensagem}
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Novo funcionário
            </h2>

            <p className="mb-6 mt-1 text-sm text-slate-500">
              Informe os dados para cadastro.
            </p>

            <form onSubmit={cadastrar} className="space-y-4">
              <div>
                <label htmlFor="nome" className="mb-2 block text-sm font-medium">
                  Nome completo
                </label>
                <input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: João da Silva"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="matricula"
                  className="mb-2 block text-sm font-medium"
                >
                  Matrícula
                </label>
                <input
                  id="matricula"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ex.: 00125"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  required
                />
              </div>

              <div>
                <label htmlFor="setor" className="mb-2 block text-sm font-medium">
                  Setor
                </label>
                <select
                  id="setor"
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  required
                >
                  <option value="">Selecione o setor</option>
                  <option value="Produção">Produção</option>
                  <option value="Expedição">Expedição</option>
                  <option value="Estoque">Estoque</option>
                  <option value="Matéria-Prima">Matéria-Prima</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Qualidade">Qualidade</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full rounded-xl bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "+ Cadastrar funcionário"}
              </button>
            </form>
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Lista de funcionários
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Consulte e atualize os cadastros.
                </p>
              </div>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar funcionário..."
                aria-label="Buscar funcionário"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-emerald-700 sm:w-64"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-4 font-medium">Funcionário</th>
                    <th className="px-3 py-4 font-medium">Matrícula</th>
                    <th className="px-3 py-4 font-medium">Setor</th>
                    <th className="px-3 py-4 font-medium">Situação</th>
                    <th className="px-3 py-4 font-medium">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {carregando ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 text-center text-slate-500">
                        Carregando funcionários...
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filtrados.map((f) => (
                        <tr key={f.id} className="border-b border-slate-100">
                          <td className="px-3 py-4 font-medium text-slate-900">
                            {f.nome}
                          </td>
                          <td className="px-3 py-4">{f.matricula}</td>
                          <td className="px-3 py-4">{f.setor}</td>
                          <td className="px-3 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                f.ativo
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {f.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={acaoId !== null}
                                onClick={() => void alternarSituacao(f)}
                                className="font-medium text-emerald-800 hover:underline disabled:opacity-50"
                              >
                                {acaoId === f.id
                                  ? "Aguarde..."
                                  : f.ativo
                                    ? "Inativar"
                                    : "Ativar"}
                              </button>

                              <button
                                type="button"
                                disabled={acaoId !== null}
                                onClick={() => void excluir(f)}
                                className="font-medium text-red-600 hover:underline disabled:opacity-50"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filtrados.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-12 text-center text-slate-500"
                          >
                            {busca
                              ? "Nenhum funcionário encontrado."
                              : "Nenhum funcionário cadastrado ainda."}
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
