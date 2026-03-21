create table calls (
  id uuid default gen_random_uuid() primary key,
  file_name text not null,
  storage_path text not null,
  transcript text,
  language text,
  duration_seconds float,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  sentiment_score float,
  sop_compliance_percentage int,
  violations text[],
  passed_checks text[],
  payment_preference text,
  summary text,
  created_at timestamp with time zone default now()
);

-- Storage bucket (run in Supabase dashboard)
-- Create bucket named: voiceiq-calls (private)