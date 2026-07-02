import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gucrvtyskudsfokmcavc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1Y3J2dHlza3Vkc2Zva21jYXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MjUxNDIsImV4cCI6MjA5NzAwMTE0Mn0.kbGtR-fm69Pru3lwlFWthxiumVd6AhxGAsRtuQvrzR0'
);

const testEmail = `diagtest${Date.now()}@gmail.com`;
console.log('Testing signUp with email:', testEmail);

const { data, error } = await supabase.auth.signUp({
  email: testEmail,
  password: 'TestDiag@123',
  options: { data: { name: 'Diag Test', role: 'buyer' } },
});

console.log('\n--- Supabase signUp response ---');
console.log('Error:', error ? JSON.stringify(error, null, 2) : 'none');
console.log('Data user:', data?.user ? {
  id: data.user.id,
  email: data.user.email,
  confirmation_sent_at: data.user.confirmation_sent_at,
  confirmed_at: data.user.confirmed_at,
  identities: data.user.identities?.length,
} : 'null');

// Also try resend to see the exact error
if (data?.user) {
  console.log('\n--- Testing resend OTP ---');
  const { error: resendErr } = await supabase.auth.resend({
    type: 'signup',
    email: testEmail,
  });
  console.log('Resend error:', resendErr ? JSON.stringify(resendErr, null, 2) : 'none (resend succeeded)');
}
