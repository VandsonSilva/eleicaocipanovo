
"use client";

import { useEffect, useRef, useState } from "react";
import { createUrnaClient } from "@/lib/supabase-urna-browser";

type Candidato = {
  id: string;
  numero: number;
  foto_url: string | null;
  nome: string;
  setor: string | null;
};

export default function UrnaPage() {
  
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [numero, setNumero] = useState("");
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [branco, setBranco] = useState(false);
  const [token, setToken] = useState("");
  const [eleicaoNome, setEleicaoNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [erro, setErro] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [entrando, setEntrando] = useState(false);

  const tokenAtivoRef = useRef(false);

  // Restaura a sessÃ£o salva e valida se a conta continua autorizada como urna.
  useEffect(() => {
    let ativo = true;

    async function restaurarSessao() {
      const supabase = createUrnaClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!ativo) return;

      if (!session) {
        setCarregando(false);
        return;
      }

      const { data: autorizado, error } = await supabase.rpc("is_cipa_urna");

      if (!ativo) return;

      if (error || autorizado !== true) {
        await supabase.auth.signOut();
        setAutenticado(false);
        setCarregando(false);
        setErroLogin("Esta conta nÃ£o estÃ¡ autorizada como urna ativa. Entre com a conta correta.");
        return;
      }

      setAutenticado(true);
      setCarregando(true);
    }

    void restaurarSessao();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!autenticado) {
      setCarregando(false);
      return;
    }

    const supabase = createUrnaClient();
    let ativo = true;
    let consultando = false;

    async function carregarEleicao(eleicaoId: string) {
      const { data: eleicao, error: erroEleicao } = await supabase
        .from("eleicoes")
        .select("nome")
        .eq("id", eleicaoId)
        .single();

      if (!ativo) return false;
      if (erroEleicao || !eleicao) {
        setErro("NÃ£o foi possÃ­vel carregar a eleiÃ§Ã£o. Verifique as permissÃµes de leitura.");
        setCarregando(false);
        return false;
      }

      const { data: lista, error: erroCandidatos } = await supabase
        .from("candidatos")
        .select("id, numero, foto_url, funcionario_id")
        .eq("eleicao_id", eleicaoId)
        .order("numero");

      if (!ativo) return false;
      if (erroCandidatos || !lista) {
        setErro("NÃ£o foi possÃ­vel carregar os candidatos. Verifique as polÃ­ticas de leitura.");
        setCarregando(false);
        return false;
      }

      const ids = lista.map((item) => item.funcionario_id);
      const { data: funcionarios, error: erroFuncionarios } = ids.length
        ? await supabase
            .from("funcionarios")
            .select("id, nome, setor")
            .in("id", ids)
        : { data: [], error: null };

      if (!ativo) return false;
      if (erroFuncionarios || !funcionarios) {
        setErro("NÃ£o foi possÃ­vel carregar os dados dos candidatos. Verifique as polÃ­ticas de leitura.");
        setCarregando(false);
        return false;
      }

      setEleicaoNome(eleicao.nome);
      setCandidatos(
        lista.map((item) => {
          const funcionario = funcionarios.find((f) => f.id === item.funcionario_id);
          return {
            id: item.id,
            numero: item.numero,
            foto_url: item.foto_url,
            nome: funcionario?.nome ?? "Candidato",
            setor: funcionario?.setor ?? null,
          };
        })
      );
      return true;
    }

    async function verificarLiberacao() {
      if (!ativo || consultando || tokenAtivoRef.current) return;
      consultando = true;

      try {
        const { data, error: erroLiberacao } = await supabase.rpc("obter_liberacao_pendente");

        if (!ativo) return;

        if (erroLiberacao) {
          setErro("NÃ£o foi possÃ­vel consultar a liberaÃ§Ã£o da urna. Confirme se o tablet estÃ¡ autenticado com a conta da urna.");
          setCarregando(false);
          return;
        }

        const liberacao = data as {
          liberado?: boolean;
          token?: string;
          eleicao_id?: string;
          expira_em?: string;
        } | null;

        if (!liberacao?.liberado) {
          setCarregando(false);
          return;
        }

        if (!liberacao.token || !liberacao.eleicao_id || !liberacao.expira_em ||
            new Date(liberacao.expira_em).getTime() <= Date.now()) {
          setCarregando(false);
          return;
        }

        tokenAtivoRef.current = true;
        setToken(liberacao.token);
        setErro("");
        setMensagem("");
        setNumero("");
        setCandidato(null);
        setBranco(false);
        setFinalizado(false);
        setCarregando(true);

        const carregou = await carregarEleicao(liberacao.eleicao_id);
        if (!carregou) {
          tokenAtivoRef.current = false;
          setToken("");
          return;
        }
        setCarregando(false);
      } catch {
        if (ativo) {
          setErro("Falha de comunicaÃ§Ã£o com o Supabase. Verifique a conexÃ£o.");
          setCarregando(false);
        }
      } finally {
        consultando = false;
      }
    }

    setCarregando(false);
    void verificarLiberacao();
    const intervalo = window.setInterval(() => void verificarLiberacao(), 2500);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [autenticado]);

  async function entrarNaUrna(event: React.FormEvent<HTMLFormElement>) {
   
  event.preventDefault();
  console.log("1. Clique no botÃ£o de login");

  if (entrando) return;

  setEntrando(true);
  setErroLogin("");

  try {
    const supabase = createUrnaClient();

    console.log("2. Chamando autenticaÃ§Ã£o");

    const { data, error: erroAuth } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    console.log("3. Resultado autenticaÃ§Ã£o:", {
      usuario: data.user?.id,
      erro: erroAuth?.message,
    });

    if (erroAuth || !data.user) {
      setErroLogin(
        erroAuth?.message
          ? `Falha no login: ${erroAuth.message}`
          : "NÃ£o foi possÃ­vel autenticar. Confira o e-mail e a senha."
      );
      return;
    }

    console.log("4. Validando autorizaÃ§Ã£o da urna");

    const { data: autorizado, error: erroPermissao } =
      await supabase.rpc("is_cipa_urna");

    console.log("5. Resultado autorizaÃ§Ã£o:", {
      autorizado,
      erro: erroPermissao?.message,
    });

    if (erroPermissao) {
      setErroLogin(
        `Login realizado, mas nÃ£o foi possÃ­vel validar a urna: ${erroPermissao.message}`
      );
      await supabase.auth.signOut();
      return;
    }

    if (autorizado !== true) {
      await supabase.auth.signOut();
      setErroLogin(
        "Login realizado, mas esta conta nÃ£o estÃ¡ autorizada como urna ativa."
      );
      return;
    }

    console.log("6. Login e autorizaÃ§Ã£o concluÃ­dos");

    setSenha("");
    setErro("");
    setAutenticado(true);
    setCarregando(true);
  } catch (error) {
    console.error("Erro inesperado no login da urna:", error);
    setErroLogin("Ocorreu um erro inesperado ao entrar.");
  } finally {
    setEntrando(false);
  }
}

  function voltarParaEspera() {
    tokenAtivoRef.current = false;
    setToken("");
    setNumero("");
    setCandidato(null);
    setBranco(false);
    setMensagem("");
    setEleicaoNome("");
    setCandidatos([]);
    setFinalizado(false);
    setErro("");
    setCarregando(false);
  }

  function digitarDigito(digito: string) {
    if (processando || finalizado || branco) return;
    if (numero.length >= 2) return;

    const novoNumero = numero + digito;

    setNumero(novoNumero);
    setMensagem("");
    setCandidato(null);

    // SÃ³ procura o candidato depois de digitar os dois dÃ­gitos.
    if (novoNumero.length === 2) {
      const encontrado = candidatos.find(
        (item) => String(item.numero).padStart(2, "0") === novoNumero
      );

      if (encontrado) {
        setCandidato(encontrado);
      } else {
        setMensagem("NÃºmero nÃ£o encontrado. Pressione CORRIGE para tentar novamente.");
      }
    }
  }


  function corrigir() {
    if (processando || finalizado) return;
    setNumero("");
    setCandidato(null);
    setBranco(false);
    setMensagem("");
  }

  function selecionarBranco() {
    if (processando || finalizado) return;
    setNumero("");
    setCandidato(null);
    setBranco(true);
    setMensagem("");
  }

  async function confirmar() {
    if (processando || finalizado) return;

    if (!branco && !candidato) {
      setMensagem("Digite o nÃºmero de um candidato vÃ¡lido ou escolha BRANCO.");
      return;
    }

    const escolha = branco
      ? "VOTO EM BRANCO"
      : `${candidato?.numero} - ${candidato?.nome}`;

    const autorizado = window.confirm(
      `Confirma sua escolha: ${escolha}? ApÃ³s confirmar, nÃ£o serÃ¡ possÃ­vel alterar o voto.`
    );

    if (!autorizado) return;

    setProcessando(true);
    setMensagem("");

    const supabase = createUrnaClient();

    const { data, error } = await supabase.rpc("registrar_voto_urna", {
      p_token: token,
      p_candidato_id: branco ? null : candidato?.id,
    });

    if (error || !(data as { registrado?: boolean } | null)?.registrado) {
      setMensagem(
        "NÃ£o foi possÃ­vel registrar o voto. Procure o administrador para verificar a autorizaÃ§Ã£o."
      );
      setProcessando(false);
      return;
    }

    setFinalizado(true);
    setProcessando(false);

    window.setTimeout(() => {
      voltarParaEspera();
    }, 3000);
  }

  if (!autenticado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-200 p-6">
        <form onSubmit={entrarNaUrna} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-5 text-center">
            <h1 className="text-3xl font-black text-slate-900">Urna da CIPA</h1>
            <p className="mt-2 text-slate-600">Acesse com a conta exclusiva deste dispositivo.</p>
          </div>

          <label htmlFor="email-urna" className="mb-1 block text-sm font-semibold text-slate-700">
            E-mail
          </label>
          <input
            id="email-urna"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600"
            placeholder="urna@empresa.com"
          />

          <label htmlFor="senha-urna" className="mb-1 block text-sm font-semibold text-slate-700">
            Senha
          </label>
          <input
            id="senha-urna"
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600"
            placeholder="Digite a senha da urna"
          />

          {erroLogin && (
            <p role="alert" className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">
              {erroLogin}
            </p>
          )}

          <button
            type="submit"
            disabled={entrando}
            className="w-full rounded-lg bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {entrando ? "ENTRANDO..." : "ENTRAR NA URNA"}
          </button>
          <p className="mt-4 text-center text-xs text-slate-500">
            Acesso restrito ao dispositivo autorizado.
          </p>
        </form>
      </main>
    );
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-200">
        Preparando a urna eletrÃ´nica...
      </main>
    );
  }

  if (!carregando && !erro && !token && !finalizado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-200 p-6">
        <div className="w-full max-w-xl rounded-2xl bg-white p-10 text-center shadow-xl">
          <div className="mx-auto mb-6 h-16 w-16 animate-pulse rounded-full bg-blue-100 ring-8 ring-blue-50" />
          <h1 className="text-3xl font-black text-slate-900">Urna da CIPA</h1>
          <p className="mt-4 text-xl font-semibold text-slate-700">
            Aguarde liberaÃ§Ã£o para votar
          </p>
          <p className="mt-3 text-sm text-slate-500">
            A votaÃ§Ã£o serÃ¡ iniciada automaticamente apÃ³s a liberaÃ§Ã£o do administrador.
          </p>
        </div>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-200 p-6">
        <div className="rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold">Urna indisponÃ­vel</h1>
          <p className="mt-4 text-slate-600">{erro}</p>
          <button
            onClick={() => { setErro(""); setCarregando(false); }}
            className="mt-6 rounded-lg bg-blue-700 px-5 py-3 text-white"
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  if (finalizado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-200 p-6">
        <div className="rounded-xl bg-white p-10 text-center shadow">
          <div className="text-5xl text-green-600">âœ“</div>
          <h1 className="mt-4 text-3xl font-bold">FIM</h1>
          <p className="mt-3 text-slate-600">
            Seu voto foi registrado. Obrigado por participar!
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Aguarde o retorno Ã  tela de liberaÃ§Ã£o.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-300 p-4 md:p-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-slate-500 bg-slate-100 shadow-2xl">
        <header className="flex items-center justify-between bg-slate-800 px-5 py-4 text-white">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-300">
              Sistema de votaÃ§Ã£o
            </p>
            <h1 className="text-xl font-bold">ELEIÃ‡ÃƒO DA CIPA</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-300">EleiÃ§Ã£o</p>
            <p className="max-w-48 font-semibold">{eleicaoNome}</p>
          </div>
        </header>

        <div className="grid md:grid-cols-[1.5fr_1fr]">
          <section className="p-5 md:p-8">
            <div className="border-b-2 border-slate-300 pb-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Seu voto para
              </p>
              <h2 className="text-2xl font-black text-slate-900">
                REPRESENTANTE DA CIPA
              </h2>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-600">
                Digite o nÃºmero do candidato
              </p>

              <div className="mt-3 flex min-h-20 items-center gap-2">
                {(numero || "  ").padEnd(2, " ").slice(0, 2).split("").map((digito, i) => (
                  <div
                    key={i}
                    className="flex h-16 w-14 items-center justify-center border-2 border-slate-800 bg-white text-4xl font-bold text-black"
                  >
                    {digito.trim()}
                  </div>
                ))}
                {!numero && (
                  <span className="ml-2 text-sm text-slate-500">
                    Aguardando nÃºmero...
                  </span>
                )}
              </div>
            </div>

            <div className="mt-7 min-h-52 rounded-lg border border-slate-300 bg-white p-4">
              {branco ? (
                <div className="flex min-h-44 items-center justify-center">
                  <h3 className="text-3xl font-black text-slate-800">
                    VOTO EM BRANCO
                  </h3>
                </div>
              ) : candidato ? (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="flex h-40 w-36 shrink-0 items-center justify-center overflow-hidden border border-slate-300 bg-slate-100">
                    {candidato.foto_url ? (
                      <img
                        src={candidato.foto_url}
                        alt="Foto do candidato"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="p-2 text-center text-sm text-slate-500">
                        Foto nÃ£o cadastrada
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Nome do candidato
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-slate-900">
                      {candidato.nome}
                    </h3>
                    <p className="mt-3 text-slate-700">
                      NÃºmero: <strong>{candidato.numero}</strong>
                    </p>
                    {candidato.setor && (
                      <p className="mt-1 text-sm text-slate-600">
                        Setor: {candidato.setor}
                      </p>
                    )}
                  </div>
                </div>
              ) : numero ? (
                <div className="flex min-h-44 items-center justify-center text-center">
                  <p className="font-semibold text-red-700">
                    NÃºmero nÃ£o encontrado. Use CORRIGE para tentar novamente.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-44 items-center justify-center text-slate-400">
                  A foto do candidato aparecerÃ¡ aqui
                </div>
              )}
            </div>

            <div className="mt-5 rounded-lg bg-slate-200 p-4 text-sm text-slate-700">
              {branco
                ? "VocÃª selecionou voto em branco."
                : candidato
                  ? "Confira a foto e os dados. Se estiver correto, pressione CONFIRMA."
                  : "Digite os dois nÃºmeros do candidato. Para votar em branco, pressione BRANCO."}
            </div>
          </section>

          <section className="bg-slate-800 p-5 text-white md:p-7">
            <div className="mb-5 text-center">
              <p className="text-xs uppercase tracking-widest text-slate-300">
                Teclado numÃ©rico
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Digite o nÃºmero do candidato
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digito) => (
                <button
                  key={digito}
                  onClick={() => digitarDigito(digito)}
                  disabled={processando || numero.length >= 2 || branco}
                  className="h-16 rounded-md bg-slate-950 text-3xl font-bold shadow-md hover:bg-slate-700 disabled:opacity-40"
                >
                  {digito}
                </button>
              ))}
              <div />
              <button
                onClick={() => digitarDigito("0")}
                disabled={processando || numero.length >= 2 || branco}
                className="h-16 rounded-md bg-slate-950 text-3xl font-bold shadow-md hover:bg-slate-700 disabled:opacity-40"
              >
                0
              </button>
              <div />
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={selecionarBranco}
                disabled={processando}
                className="w-full rounded-md bg-white px-3 py-3 font-bold text-slate-900 hover:bg-slate-200 disabled:opacity-50"
              >
                BRANCO
              </button>

              <button
                onClick={corrigir}
                disabled={processando}
                className="w-full rounded-md bg-orange-400 px-3 py-3 font-bold text-slate-950 hover:bg-orange-300 disabled:opacity-50"
              >
                CORRIGE
              </button>

              <button
                onClick={confirmar}
                disabled={processando || (!candidato && !branco)}
                className="w-full rounded-md bg-green-600 px-3 py-4 text-lg font-black text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processando ? "AGUARDE..." : "CONFIRMA"}
              </button>
            </div>

            {mensagem && (
              <p role="alert" className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-900">
                {mensagem}
              </p>
            )}
          </section>
        </div>

        <footer className="bg-slate-200 px-5 py-3 text-center text-xs text-slate-600">
          Confira sua escolha antes de confirmar. O voto nÃ£o poderÃ¡ ser alterado apÃ³s o registro.
        </footer>
      </div>
    </main>
  );
}

