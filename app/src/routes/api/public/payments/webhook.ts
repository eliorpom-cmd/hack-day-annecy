import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

function planFromPrice(priceId: string | undefined) {
  if (priceId?.startsWith("basic_")) return "basic";
  if (priceId?.startsWith("pro_")) return "pro";
  if (priceId?.startsWith("business_")) return "business";
  return null;
}

const ACTIVE = new Set(["active", "trialing", "past_due"]);

async function syncSubscription(subscription: any, env: StripeEnv) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const userId = subscription.metadata?.userId;
  const orgId = subscription.metadata?.organizationId ?? null;
  if (!userId) {
    console.error("[payments] subscription without userId", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      organization_id: orgId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
      product_id: typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id ?? "",
      price_id: priceId ?? "",
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (orgId) {
    const plan = ACTIVE.has(subscription.status) ? planFromPrice(priceId) : null;
    await supabaseAdmin
      .from("organizations")
      .update({ plan_id: plan ?? "free" })
      .eq("id", orgId);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          const event = await verifyWebhook(request, rawEnv);
          switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await syncSubscription(event.data.object, rawEnv);
              break;
            case "customer.subscription.deleted":
              await syncSubscription({ ...event.data.object, status: "canceled" }, rawEnv);
              break;
            default:
              console.log("[payments] unhandled event", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[payments] webhook error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
