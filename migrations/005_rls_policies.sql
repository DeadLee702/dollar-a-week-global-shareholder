-- Migration 005: Row-Level Security policy drafts (DO NOT enable without review)

-- These policy statements are provided as templates. DO NOT enable RLS in production before review.

-- Example RLS for contributions: only allow members to see their contributions
-- ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY contributions_member_only ON contributions USING (member_id = (current_setting('app.current_member_id')::uuid)) WITH CHECK (member_id = (current_setting('app.current_member_id')::uuid));

-- Example RLS for seed_cell_members: only allowing seed_cell members to view
-- ALTER TABLE seed_cell_members ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY seedcell_member_view ON seed_cell_members USING (user_id = (current_setting('app.current_user_id')::uuid));

-- Example RLS for member_verifications: only allow auditors and the owner
-- ALTER TABLE member_verifications ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY member_verification_policy ON member_verifications USING (user_id = (current_setting('app.current_user_id')::uuid) OR current_setting('app.current_role') = 'AUDITOR');

-- Review these policies and adapt them to your environment. They are intentionally not enabled in migrations.
