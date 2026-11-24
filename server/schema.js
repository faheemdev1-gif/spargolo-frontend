export const schema = `
  CREATE TABLE IF NOT EXISTS venue_settings (
    id integer PRIMARY KEY CHECK (id = 1),
    live boolean NOT NULL DEFAULT false,
    booking jsonb NOT NULL,
    content jsonb NOT NULL DEFAULT '{}',
    revision integer NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS menu_categories (
    id text PRIMARY KEY,
    name text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    archived boolean NOT NULL DEFAULT false,
    revision integer NOT NULL DEFAULT 1
  );
  CREATE UNIQUE INDEX IF NOT EXISTS menu_categories_active_name
    ON menu_categories (lower(name)) WHERE NOT archived;

  CREATE TABLE IF NOT EXISTS menu_photos (
    id text PRIMARY KEY,
    content_type text NOT NULL,
    data bytea NOT NULL
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id text PRIMARY KEY,
    category_id text NOT NULL REFERENCES menu_categories(id),
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    price_cents integer NOT NULL CHECK (price_cents >= 0),
    image_url text NOT NULL DEFAULT '',
    photo_id text UNIQUE REFERENCES menu_photos(id),
    video_url text NOT NULL DEFAULT '',
    allergens text[] NOT NULL DEFAULT '{}',
    available boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    archived boolean NOT NULL DEFAULT false,
    revision integer NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS menu_items_category ON menu_items (category_id, sort_order);

  CREATE TABLE IF NOT EXISTS admin_users (
    email text PRIMARY KEY,
    password_hash text NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash text PRIMARY KEY,
    email text NOT NULL REFERENCES admin_users(email) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rate_limits (
    id text PRIMARY KEY,
    hits integer NOT NULL,
    expires_at timestamptz NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guest_requests (
    id text PRIMARY KEY,
    kind text NOT NULL CHECK (kind IN ('booking', 'order')),
    status text NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
    customer jsonb NOT NULL,
    notes text NOT NULL DEFAULT '',
    items jsonb NOT NULL DEFAULT '[]',
    total_cents integer NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
    service_date text,
    service_time text,
    guests integer CHECK (guests > 0),
    time_zone text,
    request_key text NOT NULL,
    request_hash text NOT NULL,
    revision integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (kind, request_key),
    CHECK (
      (kind = 'booking' AND service_date IS NOT NULL AND service_time IS NOT NULL
        AND guests IS NOT NULL AND time_zone IS NOT NULL)
      OR (kind = 'order' AND service_date IS NULL AND service_time IS NULL
        AND guests IS NULL AND time_zone IS NULL)
    )
  );
  CREATE INDEX IF NOT EXISTS requests_inbox ON guest_requests (kind, created_at DESC);
  CREATE INDEX IF NOT EXISTS requests_booking_slot
    ON guest_requests (service_date, service_time) WHERE kind = 'booking' AND status = 'confirmed';

  CREATE TABLE IF NOT EXISTS request_events (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id text NOT NULL REFERENCES guest_requests(id) ON DELETE CASCADE,
    action text NOT NULL,
    actor text,
    details jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS request_events_record ON request_events (request_id, id);
`;
