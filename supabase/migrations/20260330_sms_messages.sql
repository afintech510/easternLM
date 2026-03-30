-- SMS/MMS message storage for the POS messaging suite
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rc_message_id text UNIQUE,
  rc_conversation_id text,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number text NOT NULL,
  to_number text NOT NULL,
  body text,
  media_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'delivered'
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')),
  customer_id uuid REFERENCES public.customers(id),
  customer_name text,
  business_number text NOT NULL,
  read_at timestamptz,
  read_by text,
  staff_sender text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_from ON public.sms_messages(from_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_to ON public.sms_messages(to_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_conversation ON public.sms_messages(rc_conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_customer ON public.sms_messages(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_unread ON public.sms_messages(read_at)
  WHERE read_at IS NULL AND direction = 'inbound';
CREATE INDEX IF NOT EXISTS idx_sms_business ON public.sms_messages(business_number, created_at DESC);

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on sms_messages"
  ON public.sms_messages FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anon read sms_messages"
  ON public.sms_messages FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;

-- RPC: get conversation list (latest message per customer phone)
CREATE OR REPLACE FUNCTION get_sms_conversations(
  p_business_number text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  customer_phone text,
  customer_name text,
  customer_id uuid,
  business_number text,
  last_message_body text,
  last_message_at timestamptz,
  last_direction text,
  unread boolean,
  message_count bigint
)
LANGUAGE sql STABLE
AS $$
  WITH ranked AS (
    SELECT
      CASE WHEN direction = 'inbound' THEN from_number ELSE to_number END as cust_phone,
      customer_name,
      customer_id,
      business_number,
      body,
      created_at,
      direction,
      read_at,
      ROW_NUMBER() OVER (
        PARTITION BY CASE WHEN direction = 'inbound' THEN from_number ELSE to_number END
        ORDER BY created_at DESC
      ) as rn
    FROM sms_messages
    WHERE (p_business_number IS NULL OR business_number = p_business_number)
      AND (p_search IS NULL
        OR body ILIKE '%' || p_search || '%'
        OR customer_name ILIKE '%' || p_search || '%'
        OR from_number ILIKE '%' || p_search || '%'
        OR to_number ILIKE '%' || p_search || '%')
  )
  SELECT
    r.cust_phone as customer_phone,
    r.customer_name,
    r.customer_id,
    r.business_number,
    r.body as last_message_body,
    r.created_at as last_message_at,
    r.direction as last_direction,
    EXISTS (
      SELECT 1 FROM sms_messages m
      WHERE m.direction = 'inbound'
        AND m.read_at IS NULL
        AND m.from_number = r.cust_phone
    ) as unread,
    (SELECT count(*) FROM sms_messages m
     WHERE m.from_number = r.cust_phone OR m.to_number = r.cust_phone
    ) as message_count
  FROM ranked r
  WHERE r.rn = 1
  ORDER BY r.created_at DESC
  LIMIT p_limit;
$$;
