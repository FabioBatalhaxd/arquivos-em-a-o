CREATE TYPE public.dashboard_role AS ENUM ('master','owner');

CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.dashboard_role NOT NULL,
  PRIMARY KEY (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_roles_read ON public.user_roles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.dashboard_is_master()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master')
$$;
REVOKE ALL ON FUNCTION public.dashboard_is_master() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_is_master() TO authenticated;

CREATE TABLE public.brand_accounts (
  user_id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  brand text,
  brands text[] NOT NULL DEFAULT '{}',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brand_accounts TO authenticated;
GRANT ALL ON public.brand_accounts TO service_role;
ALTER TABLE public.brand_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_account_read ON public.brand_accounts FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT public.dashboard_is_master()));

CREATE TABLE public.dashboard_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  source_rows integer NOT NULL DEFAULT 0,
  row_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'loading',
  imported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dashboard_imports TO authenticated;
GRANT ALL ON public.dashboard_imports TO service_role;
ALTER TABLE public.dashboard_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY dashboard_import_read ON public.dashboard_imports FOR SELECT TO authenticated USING (true);

CREATE TABLE public.dashboard_records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  import_id uuid NOT NULL REFERENCES public.dashboard_imports(id) ON DELETE CASCADE,
  brand text NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX dashboard_records_import_id_idx ON public.dashboard_records (import_id, id);
CREATE INDEX dashboard_records_brand_idx ON public.dashboard_records (brand);
GRANT SELECT ON public.dashboard_records TO authenticated;
GRANT ALL ON public.dashboard_records TO service_role;
ALTER TABLE public.dashboard_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_record_read ON public.dashboard_records FOR SELECT TO authenticated
USING ((SELECT public.dashboard_is_master()) OR EXISTS (SELECT 1 FROM public.brand_accounts a WHERE a.user_id = (SELECT auth.uid()) AND (a.brand = dashboard_records.brand OR dashboard_records.brand = ANY(a.brands))));

CREATE TABLE public.dashboard_setup_attempts (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.dashboard_setup_attempts TO service_role;
ALTER TABLE public.dashboard_setup_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.dashboard_setup_allowed(_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.dashboard_setup_attempts AS t (key, attempts, started_at) VALUES (_key, 1, now())
  ON CONFLICT (key) DO UPDATE SET
    attempts = CASE WHEN t.started_at < now() - interval '15 minutes' THEN 1 ELSE t.attempts + 1 END,
    started_at = CASE WHEN t.started_at < now() - interval '15 minutes' THEN now() ELSE t.started_at END
  RETURNING attempts INTO n;
  RETURN n <= 5;
END $$;
REVOKE ALL ON FUNCTION public.dashboard_setup_allowed(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_setup_allowed(text) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_first_master(_user_id uuid, _username text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('claim_first_master'));
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'master') THEN RAISE EXCEPTION 'master exists'; END IF;
  INSERT INTO public.brand_accounts (user_id, username) VALUES (_user_id, _username);
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'master');
END $$;
REVOKE ALL ON FUNCTION public.claim_first_master(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_master(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.begin_dashboard_import(_filename text, _source_rows integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.dashboard_is_master() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.dashboard_imports WHERE status = 'loading' AND created_at < now() - interval '1 hour';
  INSERT INTO public.dashboard_imports (filename, source_rows, imported_by) VALUES (_filename, _source_rows, auth.uid()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.append_dashboard_records(_import_id uuid, _records jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.dashboard_is_master() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dashboard_imports WHERE id = _import_id AND status = 'loading') THEN RAISE EXCEPTION 'invalid import'; END IF;
  INSERT INTO public.dashboard_records (import_id, brand, payload)
  SELECT _import_id, r->>'brand', r FROM jsonb_array_elements(_records) r;
END $$;

CREATE OR REPLACE FUNCTION public.finish_dashboard_import(_import_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.dashboard_is_master() THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('dashboard_import'));
  SELECT count(*) INTO n FROM public.dashboard_records WHERE import_id = _import_id;
  IF n = 0 THEN RAISE EXCEPTION 'empty import'; END IF;
  UPDATE public.dashboard_imports SET status = 'ready', row_count = n WHERE id = _import_id AND status = 'loading';
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid import'; END IF;
  DELETE FROM public.dashboard_imports WHERE id <> _import_id;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_dashboard_import(_import_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.dashboard_is_master() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.dashboard_imports WHERE id = _import_id AND status = 'loading';
END $$;

CREATE OR REPLACE FUNCTION public.replace_dashboard_records(_filename text, _records jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  _id := public.begin_dashboard_import(_filename, jsonb_array_length(_records));
  PERFORM public.append_dashboard_records(_id, _records);
  PERFORM public.finish_dashboard_import(_id);
  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.begin_dashboard_import(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.append_dashboard_records(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finish_dashboard_import(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_dashboard_import(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.replace_dashboard_records(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_dashboard_import(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_dashboard_records(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_dashboard_import(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_dashboard_import(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_dashboard_records(text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_brand_names()
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT r.brand FROM public.dashboard_records r
  WHERE public.dashboard_is_master()
    AND r.import_id = (SELECT i.id FROM public.dashboard_imports i WHERE i.status = 'ready' ORDER BY i.created_at DESC LIMIT 1)
  ORDER BY 1
$$;
REVOKE ALL ON FUNCTION public.dashboard_brand_names() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_brand_names() TO authenticated;

CREATE TABLE public.collection_records (
  id bigserial PRIMARY KEY,
  brand text NOT NULL,
  store text NOT NULL,
  carrier text NOT NULL DEFAULT '',
  origin text NOT NULL DEFAULT '',
  uf text NOT NULL DEFAULT '',
  order_date date NOT NULL,
  confirmed boolean NOT NULL,
  quantity integer NOT NULL DEFAULT 1
);
GRANT SELECT ON public.collection_records TO authenticated;
GRANT ALL ON public.collection_records TO service_role;
ALTER TABLE public.collection_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY collection_record_read ON public.collection_records FOR SELECT TO authenticated USING (
  (SELECT public.dashboard_is_master()) OR EXISTS (
    SELECT 1 FROM public.brand_accounts a WHERE a.user_id = (SELECT auth.uid())
      AND (a.brand = collection_records.brand OR collection_records.brand = ANY (a.brands))
  )
);
CREATE INDEX collection_records_brand_idx ON public.collection_records (brand);

CREATE TABLE public.collection_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  source_rows integer NOT NULL DEFAULT 0,
  imported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collection_imports TO authenticated;
GRANT ALL ON public.collection_imports TO service_role;
ALTER TABLE public.collection_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY collection_import_read ON public.collection_imports FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.replace_collection_records(_filename text, _source_rows integer, _records jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.dashboard_is_master() THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('collection_import'));
  DELETE FROM public.collection_records WHERE id > 0;
  INSERT INTO public.collection_records (brand, store, carrier, origin, uf, order_date, confirmed, quantity)
  SELECT r->>'brand', r->>'store', coalesce(r->>'carrier',''), coalesce(r->>'origin',''), coalesce(r->>'uf',''),
         (r->>'date')::date, (r->>'confirmed')::boolean, (r->>'quantity')::integer
  FROM jsonb_array_elements(_records) r;
  INSERT INTO public.collection_imports (filename, source_rows, imported_by) VALUES (_filename, _source_rows, auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.replace_collection_records(text, integer, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.replace_collection_records(text, integer, jsonb) TO authenticated;