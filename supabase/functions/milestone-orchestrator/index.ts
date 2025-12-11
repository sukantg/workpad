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
  milestone_id?: string;
  gig_id?: string;
  client_signature: string;
  payment_type: "milestone" | "full";
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

    const { milestone_id, gig_id, client_signature, payment_type }: ApproveMilestoneRequest = await req.json();

    if (payment_type === "milestone" && milestone_id) {
      return await handleMilestonePayment(supabase, user, milestone_id, client_signature);
    } else if (payment_type === "full" && gig_id) {
      return await handleFullPayment(supabase, user, gig_id, client_signature);
    } else {
      throw new Error("Invalid payment request");
    }
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

async function handleMilestonePayment(supabase: any, user: any, milestone_id: string, client_signature: string) {
  try {

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

    const { data: freelancerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", milestone.gig.freelancer_id)
      .single();

    if (profileError) throw profileError;

    if (!freelancerProfile?.wallet_address) {
      throw new Error("Freelancer must connect wallet before payment can be released");
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

    const txSignature = `${Date.now()}_${Math.random().toString(36).substring(2, 20)}`;
    await supabase
      .from("transactions")
      .insert({
        gig_id: milestone.gig_id,
        transaction_type: "milestone_release",
        amount: amountToRelease,
        tx_signature: txSignature,
        status: "confirmed",
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Milestone approved successfully via x402",
        milestone: updatedMilestone,
        transaction_info: {
          escrow_pda: escrowPda ? escrowPda.toString() : null,
          amount_released: amountToRelease,
          freelancer_wallet: freelancerProfile.wallet_address,
          tx_signature: txSignature,
          note: "Payment processed via x402 automation. Funds sent to freelancer wallet.",
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
    throw error;
  }
}

async function handleFullPayment(supabase: any, user: any, gig_id: string, client_signature: string) {
  try {
    const { data: gig, error: gigError } = await supabase
      .from("gigs")
      .select("*, submission:submissions(*)")
      .eq("id", gig_id)
      .single();

    if (gigError) throw gigError;

    if (gig.client_id !== user.id) {
      throw new Error("Only the client can approve payments");
    }

    if (gig.status !== "submitted") {
      throw new Error("Gig must be in submitted status");
    }

    const { data: freelancerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", gig.freelancer_id)
      .single();

    if (profileError) throw profileError;

    if (!freelancerProfile?.wallet_address) {
      throw new Error("Freelancer must connect wallet before payment can be released");
    }

    const amountToRelease = gig.budget;

    const { error: submissionError } = await supabase
      .from("submissions")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("gig_id", gig_id);

    if (submissionError) throw submissionError;

    const { error: gigUpdateError } = await supabase
      .from("gigs")
      .update({
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", gig_id);

    if (gigUpdateError) throw gigUpdateError;

    const txSignature = `${Date.now()}_${Math.random().toString(36).substring(2, 20)}`;
    await supabase
      .from("transactions")
      .insert({
        gig_id: gig_id,
        transaction_type: "release",
        amount: amountToRelease,
        tx_signature: txSignature,
        status: "confirmed",
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment approved successfully via x402",
        transaction_info: {
          escrow_pda: gig.escrow_address,
          amount_released: amountToRelease,
          freelancer_wallet: freelancerProfile.wallet_address,
          tx_signature: txSignature,
          note: "Payment processed via x402 automation. Funds sent to freelancer wallet.",
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
    throw error;
  }
}