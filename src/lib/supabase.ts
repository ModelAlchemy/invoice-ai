import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfleewckpjtimxshfwkj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGVld2NrcGp0aW14c2hmd2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NTAyODEsImV4cCI6MjA5MDQyNjI4MX0.tpVQtQ7i6MgkXejSXOC5IO_5ZfKy-hhdQnYAamhWekc';

export const supabase = createClient(supabaseUrl, supabaseKey);
