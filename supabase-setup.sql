-- Run this in Supabase > SQL Editor after creating your project

-- Enable Realtime on transcriptions (also enable via Dashboard > Database > Replication)
ALTER PUBLICATION supabase_realtime ADD TABLE transcriptions;

-- Row-Level Security: users can only see their own transcriptions
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own transcriptions"
  ON transcriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Row-Level Security: users can only see their own Telegram link
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own telegram link"
  ON telegram_users FOR SELECT
  USING (auth.uid() = user_id);
