CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent', value)
$$;

CREATE INDEX IF NOT EXISTS "candidato_nome_trgm_idx"
ON "candidato"
USING gin (immutable_unaccent(lower("nome")) gin_trgm_ops);
