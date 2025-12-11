import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { Connection, PublicKey, Transaction, Keypair } from "npm:@solana/web3.js@1.98.4";
import { Program, AnchorProvider, web3 } from "npm:@coral-xyz/anchor@0.29.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ApproveMilestoneRequest {
  milestone_id: string;
  client_signature: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { milestone_id, client_signature }: ApproveMilestoneRequest = await req.json();

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("*, gig:gigs(*)")
      .eq("id", milestone_id)
      .single();

    if (milestoneError) throw milestoneError;

    if (milestone.gig.client_id !== user.id) {
      throw new Error("Only the client can approve milestones");
    }

    if (milestone.status !== "submitted") {
      throw new Error("Milestone must be in submitted status");
    }

    const amountToRelease = milestone.amount;

    let escrowPda = null;
    if (milestone.gig.escrow_pda) {
      escrowPda = new PublicKey(milestone.gig.escrow_pda);
    }

    const { data: updatedMilestone, error: updateError } = await supabase
      .from("milestones")
      .update({
        status: "paid",
        approved_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
      })
      .eq("id", milestone_id)
      .select()
      .single();

    if (updateError) throw updateError;

    const { error: gigUpdateError } = await supabase
      .from("gigs")
      .update({
        total_paid_amount: milestone.gig.total_paid_amount + amountToRelease,
      })
      .eq("id", milestone.gig_id);

    if (gigUpdateError) throw gigUpdateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Milestone approved successfully",
        milestone: updatedMilestone,
        transaction_info: {
          escrow_pda: escrowPda ? escrowPda.toString() : null,
          amount_released: amountToRelease,
          note: "Payment tracking updated in database",
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in milestone orchestrator:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
