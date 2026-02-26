import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const adminEmail = "suporte3@sulamericanapapel.com.br";
  const adminPassword = "#$uL@4126*sula";

  // Check if user already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const alreadyExists = existingUsers?.users?.some(u => u.email === adminEmail);

  if (alreadyExists) {
    return new Response(JSON.stringify({ message: "Admin já existe." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create user
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: "Suporte Sul Americana" },
  });

  if (createErr) {
    return new Response(JSON.stringify({ error: createErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Assign admin role
  const userId = created.user!.id;
  await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" });

  return new Response(JSON.stringify({ message: "Admin criado com sucesso!", userId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
