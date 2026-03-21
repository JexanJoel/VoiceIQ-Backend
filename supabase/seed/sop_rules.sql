-- Reference SOP rules (for documentation/seeding purposes)
-- These are embedded in groqService.js as DEFAULT_SOP
-- You can later make these dynamic per organization

create table if not exists sop_rules (
  id uuid default gen_random_uuid() primary key,
  rule_number int not null,
  rule_text text not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

insert into sop_rules (rule_number, rule_text) values
(1, 'Agent must greet the customer within the first 10 seconds'),
(2, 'Agent must verify customer identity (name + account number)'),
(3, 'Agent must not use abusive or unprofessional language'),
(4, 'Agent must confirm the issue before providing a solution'),
(5, 'Agent must ask for payment preference if payment is involved'),
(6, 'Agent must end the call with a closing statement');