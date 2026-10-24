
import { connection, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  await connection();

  const { error } = await supabase.rpc("testar_conexao_cipa");

  if (error) {
    console.error("Erro Supabase:", error);

    return NextResponse.json(
      {
        conectado: false,
        codigo: error.code,
        mensagem: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    conectado: true,
    mensagem: "Conexão com o Supabase funcionando.",
  });
}
