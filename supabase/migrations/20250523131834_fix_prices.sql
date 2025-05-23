CREATE POLICY "Allow read access to authenticated" ON prices FOR SELECT TO authenticated USING (true);
