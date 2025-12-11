import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { Connection, PublicKey } from "npm:@solana/web3.js@1.98.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Payment",
};

const FACILITATOR_URL = "https://facilitator.payai.network";
const ESCROW_WALLET = Deno.env.get("ESCROW_WALLET_ADDRESS") || "YOUR_ESCROW_WALLET_ADDRESS";

interface ApproveMilestoneRequest {
  milestone_id?: string;
  gig_id?: string;
  client_signature?: string;
  payment_type: "milestone" | "full";
}

interface X402PaymentProof {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    transaction: string;
  };
}

interface PaymentRequirement {
  x402Version: number;
  error: string;
  accepts: Array<{
    scheme: string;
    network: string;
    maxAmountRequired: number;
    asset: string;
    payTo: string;
    resource: string;
    maxTimeoutSeconds: number;
  }>;
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

    const paymentHeader = req.headers.get("X-Payment");
    const { milestone_id, gig_id, payment_type }: ApproveMilestoneRequest = await req.json();

    let amountRequired = 0;
    let resourceId = "";

    if (payment_type === "milestone" && milestone_id) {
      const { data: milestone } = await supabase
        .from("milestones")
        .select("amount, gig:gigs(client_id)")
        .eq("id", milestone_id)
        .single();

      if (!milestone || milestone.gig.client_id !== user.id) {
        throw new Error("Unauthorized");
      }

      amountRequired = milestone.amount * 1_000_000;
      resourceId = milestone_id;
    } else if (payment_type === "full" && gig_id) {
      const { data: gig } = await supabase
        .from("gigs")
        .select("budget, client_id")
        .eq("id", gig_id)
        .single();

      if (!gig || gig.client_id !== user.id) {
        throw new Error("Unauthorized");
      }

      amountRequired = gig.budget * 1_000_000;
      resourceId = gig_id;
    } else {
      throw new Error("Invalid payment request");
    }

    if (!paymentHeader) {
      return return402Response(amountRequired, resourceId);
    }

    const paymentProof: X402PaymentProof = JSON.parse(atob(paymentHeader));
    const settlementResult = await settlePayment(paymentProof);

    if (!settlementResult.success) {
      return new Response(
        JSON.stringify({ error: "Payment settlement failed" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Payment-Response": btoa(JSON.stringify(settlementResult)),
          },
        }
      );
    }

    if (payment_type === "milestone" && milestone_id) {
      return await handleMilestonePayment(supabase, user, milestone_id, settlementResult);
    } else {
      return await handleFullPayment(supabase, user, gig_id!, settlementResult);
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

function return402Response(amountRequired: number, resourceId: string): Response {
  const paymentRequirement: PaymentRequirement = {
    x402Version: 1,
    error: "Payment required to release milestone funds",
    accepts: [
      {
        scheme: "exact",
        network: "solana-devnet",
        maxAmountRequired: amountRequired,
        asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        payTo: ESCROW_WALLET,
        resource: resourceId,
        maxTimeoutSeconds: 300,
      },
    ],
  };

  return new Response(JSON.stringify(paymentRequirement), {
    status: 402,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function settlePayment(paymentProof: X402PaymentProof) {
  try {
    const response = await fetch(`${FACILITATOR_URL}/settle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentProof),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error settling payment:", error);
    return {
      success: false,
      errorReason: "Failed to settle payment",
    };
  }
}

async function handleMilestonePayment(supabase: any, user: any, milestone_id: string, settlementResult: any) {
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

    await supabase
      .from("transactions")
      .insert({
        gig_id: milestone.gig_id,
        transaction_type: "milestone_release",
        amount: amountToRelease,
        tx_signature: settlementResult.transaction,
        status: "confirmed",
      });

    const paymentResponse = {
      success: true,
      transaction: settlementResult.transaction,
      network: settlementResult.network,
      payer: settlementResult.payer,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Milestone approved successfully via x402",
        milestone: updatedMilestone,
        transaction_info: {
          escrow_pda: escrowPda ? escrowPda.toString() : null,
          amount_released: amountToRelease,
          freelancer_wallet: freelancerProfile.wallet_address,
          tx_signature: settlementResult.transaction,
          payer: settlementResult.payer,
          note: "Payment processed via x402 protocol. Funds sent to freelancer wallet.",
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Payment-Response": btoa(JSON.stringify(paymentResponse)),
        },
      }
    );
  } catch (error) {
    throw error;
  }
}

async function handleFullPayment(supabase: any, user: any, gig_id: string, settlementResult: any) {
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

    await supabase
      .from("transactions")
      .insert({
        gig_id: gig_id,
        transaction_type: "release",
        amount: amountToRelease,
        tx_signature: settlementResult.transaction,
        status: "confirmed",
      });

    const paymentResponse = {
      success: true,
      transaction: settlementResult.transaction,
      network: settlementResult.network,
      payer: settlementResult.payer,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment approved successfully via x402",
        transaction_info: {
          escrow_pda: gig.escrow_address,
          amount_released: amountToRelease,
          freelancer_wallet: freelancerProfile.wallet_address,
          tx_signature: settlementResult.transaction,
          payer: settlementResult.payer,
          note: "Payment processed via x402 protocol. Funds sent to freelancer wallet.",
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Payment-Response": btoa(JSON.stringify(paymentResponse)),
        },
      }
    );
  } catch (error) {
    throw error;
  }
}