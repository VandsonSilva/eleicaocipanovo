create or replace function public.obter_dados_eleicao_urna(p_eleicao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  liberacao jsonb;
  dados jsonb;
begin
  if auth.uid() is null or not coalesce(public.is_cipa_urna(), false) then
    raise exception 'A conta nao esta autorizada a consultar os dados da urna.'
      using errcode = '42501';
  end if;

  select public.obter_liberacao_pendente() into liberacao;

  if coalesce(liberacao->>'liberado', 'false') <> 'true'
    or liberacao->>'eleicao_id' <> p_eleicao_id::text
    or nullif(liberacao->>'token', '') is null
    or nullif(liberacao->>'expira_em', '') is null
    or (liberacao->>'expira_em')::timestamptz <= now()
  then
    raise exception 'Nao existe uma liberacao ativa para esta eleicao.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'eleicao', (
      select jsonb_build_object('nome', e.nome)
      from public.eleicoes as e
      where e.id = p_eleicao_id
    ),
    'candidatos', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'numero', c.numero,
            'foto_url', c.foto_url,
            'nome', f.nome,
            'setor', f.setor
          )
          order by c.numero
        )
        from public.candidatos as c
        join public.funcionarios as f on f.id = c.funcionario_id
        where c.eleicao_id = p_eleicao_id
      ),
      '[]'::jsonb
    )
  )
  into dados;

  if dados->'eleicao' = 'null'::jsonb then
    return null;
  end if;

  return dados;
end;
$$;

revoke all on function public.obter_dados_eleicao_urna(uuid) from public;
revoke all on function public.obter_dados_eleicao_urna(uuid) from anon;
grant execute on function public.obter_dados_eleicao_urna(uuid) to authenticated;
