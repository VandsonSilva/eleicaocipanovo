
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase-browser";

type Funcionario = {
  id: string;
  nome: string;
  matricula: string;
  setor: string;
  ativo: boolean;
};

type Eleicao = {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  status: string;
};

type Candidato = {
  id: string;
  eleicao_id: string;
  funcionario_id: string;
  numero: string;
  foto_url: string | null;
};

type CandidatoExibicao = Candidato & {
  nome: string;
  matricula: string;
  setor: string;
  eleicao_nome: string;
};

export default function CandidatosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [eleicoes, setEleicoes] = useState<Eleicao[]>([]);
  const [candidatos, setCandidatos] = useState<CandidatoExibicao[]>([]);

  const [eleicaoId, setEleicaoId] = useState("");
  const [funcionarioId, setFuncionarioId] = useState("");
  const [numero, setNumero] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState("");

  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro">("sucesso");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const notificar = (texto: string, tipo: "sucesso" | "erro") => {
    setMensagem(texto);
    setTipoMensagem(tipo);
  };

  const carregarDados = useCallback(async () => {
    setCarregando(true);

    try {
      const supabase = createClient();

      const [funcionariosResp, eleicoesResp, candidatosResp] =
        await Promise.all([
          supabase
            .from("funcionarios")
            .select("id, nome, matricula, setor, ativo")
            .order("nome"),
          supabase
            .from("eleicoes")
            .select("id, nome, data_inicio, data_fim, status")
            .order("data_inicio", { ascending: false }),
          supabase
            .from("candidatos")
            .select("id, eleicao_id, funcionario_id, numero, foto_url"),
        ]);

      if (funcionariosResp.error) throw funcionariosResp.error;
      if (eleicoesResp.error) throw eleicoesResp.error;
      if (candidatosResp.error) throw candidatosResp.error;

      const listaFuncionarios = (funcionariosResp.data ?? []) as Funcionario[];
      const listaEleicoes = (eleicoesResp.data ?? []) as Eleicao[];
      const listaCandidatos = (candidatosResp.data ?? []) as Candidato[];

      const funcionariosPorId = new Map(
        listaFuncionarios.map((f) => [f.id, f])
      );

      const eleicoesPorId = new Map(
        listaEleicoes.map((e) => [e.id, e])
      );

      const candidatosComDados: CandidatoExibicao[] = listaCandidatos
        .map((c) => {
          const funcionario = funcionariosPorId.get(c.funcionario_id);
          const eleicao = eleicoesPorId.get(c.eleicao_id);

          if (!funcionario || !eleicao) return null;

          return {
            ...c,
            nome: funcionario.nome,
            matricula: funcionario.matricula,
            setor: funcionario.setor,
            eleicao_nome: eleicao.nome,
          };
        })
        .filter((c): c is CandidatoExibicao => c !== null);

      setFuncionarios(listaFuncionarios);
      setEleicoes(listaEleicoes);
      setCandidatos(candidatosComDados);
    } catch (error) {
      console.error("Erro ao carregar candidatos:", error);
      notificar(
        "Não foi possível carregar os dados. Confira sua conexão e as permissões do Supabase.",
        "erro"
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const funcionariosAtivos = funcionarios.filter((f) => f.ativo);

  const funcionariosDisponiveis = funcionariosAtivos.filter(
    (f) =>
      !candidatos.some(
        (c) =>
          c.eleicao_id === eleicaoId &&
          c.funcionario_id === f.id
      )
  );

  function selecionarFoto(arquivo?: File) {
    setMensagem("");

    if (!arquivo) {
      setFoto(null);
      setFotoPreview("");
      return;
    }

    if (!arquivo.type.startsWith("image/")) {
      notificar("Selecione um arquivo de imagem válido.", "erro");
      return;
    }

    if (arquivo.size > 1_000_000) {
      notificar("A foto deve ter no máximo 1 MB.", "erro");
      return;
    }

    setFoto(arquivo);
    setFotoPreview(URL.createObjectURL(arquivo));
  }

  async function cadastrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");

    if (!eleicaoId || !funcionarioId || !numero.trim()) {
      notificar(
        "Selecione a eleição, o funcionário e informe o número.",
        "erro"
      );
      return;
    }

    const numeroLimpo = numero.trim();

    if (!/^\d{2,5}$/.test(numeroLimpo)) {
      notificar("Use um número de candidato com 2 a 5 dígitos.", "erro");
      return;
    }

    const funcionario = funcionarios.find((f) => f.id === funcionarioId);
    const eleicao = eleicoes.find((e) => e.id === eleicaoId);

    if (!funcionario || !funcionario.ativo || !eleicao) {
      notificar("Funcionário ou eleição inválido.", "erro");
      return;
    }

    const agora = new Date();
    if (
      agora >= new Date(eleicao.data_inicio) &&
      agora <= new Date(eleicao.data_fim)
    ) {
      notificar(
        "Não é permitido cadastrar candidatos enquanto a votação está em andamento.",
        "erro"
      );
      return;
    }

    if (candidatos.some(
      (c) =>
        c.eleicao_id === eleicaoId &&
        c.numero === numeroLimpo
    )) {
      notificar("Esse número já está sendo usado nesta eleição.", "erro");
      return;
    }

    if (candidatos.some(
      (c) =>
        c.eleicao_id === eleicaoId &&
        c.funcionario_id === funcionarioId
    )) {
      notificar("Este funcionário já está inscrito nesta eleição.", "erro");
      return;
    }

    setSalvando(true);
    let caminhoFoto: string | null = null;

    try {
      const supabase = createClient();
      let fotoUrl: string | null = null;

      if (foto) {
        const extensao = foto.name.split(".").pop()?.toLowerCase() || "jpg";
        caminhoFoto = `${eleicaoId}/${crypto.randomUUID()}.${extensao}`;

        const { error: erroUpload } = await supabase.storage
          .from("fotos-candidatos")
          .upload(caminhoFoto, foto, {
            contentType: foto.type,
            upsert: false,
          });

        if (erroUpload) throw erroUpload;

        const { data } = supabase.storage
          .from("fotos-candidatos")
          .getPublicUrl(caminhoFoto);

        fotoUrl = data.publicUrl;
      }

      const { error } = await supabase.from("candidatos").insert({
        eleicao_id: eleicaoId,
        funcionario_id: funcionarioId,
        numero: numeroLimpo,
        foto_url: fotoUrl,
      });

      if (error) {
        if (caminhoFoto) {
          await supabase.storage
            .from("fotos-candidatos")
            .remove([caminhoFoto]);
        }

        if (error.code === "23505") {
          notificar(
            "O número ou o funcionário já está cadastrado nesta eleição.",
            "erro"
          );
          return;
        }

        console.error("Erro ao cadastrar candidato:", error);
        notificar("Não foi possível cadastrar o candidato.", "erro");
        return;
      }

      setFuncionarioId("");
      setNumero("");
      setFoto(null);
      setFotoPreview("");

      await carregarDados();
      notificar("Candidato cadastrado com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro ao cadastrar candidato:", error);
      notificar(
        "Falha ao cadastrar. Verifique as permissões da tabela e do armazenamento de fotos.",
        "erro"
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(candidato: CandidatoExibicao) {
    if (!window.confirm(`Deseja excluir o candidato ${candidato.nome}?`)) {
      return;
    }

    setExcluindoId(candidato.id);
    setMensagem("");

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("candidatos")
        .delete()
        .eq("id", candidato.id);

      if (error) {
        console.error("Erro ao excluir candidato:", error);

        if (error.code === "23503") {
          notificar(
            "Este candidato possui registros vinculados e não pode ser excluído.",
            "erro"
          );
        } else {
          notificar("Não foi possível excluir o candidato.", "erro");
        }
        return;
      }

      if (candidato.foto_url) {
        try {
          const url = new URL(candidato.foto_url);
          const marcador = "/fotos-candidatos/";
          const posicao = url.pathname.indexOf(marcador);

          if (posicao !== -1) {
            const caminho = decodeURIComponent(
              url.pathname.slice(posicao + marcador.length)
            );

            await supabase.storage
              .from("fotos-candidatos")
              .remove([caminho]);
          }
        } catch (erroFoto) {
          console.error("Não foi possível remover a foto:", erroFoto);
        }
      }

      await carregarDados();
      notificar("Candidato excluído com sucesso.", "sucesso");
    } catch (error) {
      console.error("Erro ao excluir candidato:", error);
      notificar("Erro de conexão ao excluir o candidato.", "erro");
    } finally {
      setExcluindoId(null);
    }
  }

  const filtrados = candidatos.filter((c) => {
    const termo = busca.toLowerCase();

    return (
      c.nome.toLowerCase().includes(termo) ||
      c.numero.includes(termo) ||
      c.setor.toLowerCase().includes(termo) ||
      c.eleicao_nome.toLowerCase().includes(termo)
    );
  });

  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <a
            href="/dashboard"
            className="text-sm font-medium text-emerald-800 hover:underline"
          >
            ← Voltar ao painel
          </a>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Candidatos
          </h1>
          <p className="mt-2 text-slate-500">
            Cadastre os concorrentes e seus números para votação.
          </p>
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

        <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Novo candidato
            </h2>
            <p className="mb-6 mt-1 text-sm text-slate-500">
              Selecione uma eleição e um funcionário ativo.
            </p>

            <form onSubmit={cadastrar} className="space-y-4">
              <div>
                <label htmlFor="eleicao" className="mb-2 block text-sm font-medium">
                  Eleição
                </label>
                <select
                  id="eleicao"
                  value={eleicaoId}
                  onChange={(e) => {
                    setEleicaoId(e.target.value);
                    setFuncionarioId("");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-700"
                  required
                >
                  <option value="">Selecione uma eleição</option>
                  {eleicoes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
                {eleicoes.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    Cadastre uma eleição antes de continuar.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="funcionario" className="mb-2 block text-sm font-medium">
                  Funcionário
                </label>
                <select
                  id="funcionario"
                  value={funcionarioId}
                  onChange={(e) => setFuncionarioId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-700"
                  required
                >
                  <option value="">Selecione um funcionário</option>
                  {funcionariosDisponiveis.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} — {f.matricula}
                    </option>
                  ))}
                </select>
                {eleicaoId && funcionariosDisponiveis.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    Não há funcionários disponíveis para esta eleição.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="numero" className="mb-2 block text-sm font-medium">
                  Número do candidato
                </label>
                <input
                  id="numero"
                  value={numero}
                  onChange={(e) =>
                    setNumero(e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
                  inputMode="numeric"
                  placeholder="Ex.: 10"
                  maxLength={5}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-700"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Informe de 2 a 5 dígitos. Zeros à esquerda são aceitos.
                </p>
              </div>

              <div>
                <label htmlFor="foto" className="mb-2 block text-sm font-medium">
                  Foto do candidato (opcional)
                </label>
                <input
                  id="foto"
                  type="file"
                  accept="image/*"
                  onChange={(e) => selecionarFoto(e.target.files?.[0])}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
                />

                {fotoPreview && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={fotoPreview}
                      alt="Prévia do candidato"
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => selecionarFoto()}
                      className="text-sm font-medium text-red-600"
                    >
                      Remover foto
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  salvando ||
                  carregando ||
                  !eleicoes.length ||
                  !funcionariosDisponiveis.length
                }
                className="w-full rounded-xl bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "+ Cadastrar candidato"}
              </button>
            </form>
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Lista de candidatos
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Total cadastrado: {candidatos.length}
                </p>
              </div>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar candidato..."
                aria-label="Buscar candidato"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 sm:w-56"
              />
            </div>

            {carregando ? (
              <p className="py-12 text-center text-slate-500">
                Carregando candidatos...
              </p>
            ) : (
              <div className="space-y-3">
                {filtrados.map((c) => (
                  <article
                    key={c.id}
                    className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-4"
                  >
                    {c.foto_url ? (
                      <img
                        src={c.foto_url}
                        alt={`Foto de ${c.nome}`}
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-50 text-2xl font-bold text-emerald-800">
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900">{c.nome}</h3>
                      <p className="text-sm text-slate-500">
                        {c.setor} · Matrícula {c.matricula}
                      </p>
                      <p className="mt-1 text-sm text-emerald-800">
                        Eleição: {c.eleicao_nome}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-slate-100 px-4 py-2 text-center">
                        <p className="text-xs text-slate-500">Número</p>
                        <p className="text-xl font-bold text-slate-900">
                          {c.numero}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={excluindoId !== null}
                        onClick={() => void excluir(c)}
                        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        {excluindoId === c.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </article>
                ))}

                {filtrados.length === 0 && (
                  <p className="py-12 text-center text-slate-500">
                    Nenhum candidato cadastrado.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
