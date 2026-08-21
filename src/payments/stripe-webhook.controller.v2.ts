import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PaymentReconciliationService } from '../services/payment-reconciliation.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-08-16' });

export class StripeWebhookController {
  constructor(private readonly reconciliation: PaymentReconciliationService = new PaymentReconciliationService()) {}

  async handleStripeRaw(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    const raw = (req as any).rawBody || '';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;
    try {
      if (!webhookSecret) throw new Error('Stripe webhook secret not configured');
      event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
    } catch (err: any) {
      console.error('Stripe webhook signature verification failed', err?.message ?? err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Idempotency handled in reconciliation service
    switch (event.type) {
      case 'checkout.session.completed':
        await this.reconciliation.processStripeCheckoutSession((event.data.object as any));
        break;
      case 'payment_intent.succeeded':
        // Optionally handle
        break;
      default:
        console.log('Unhandled stripe event', event.type);
    }

    res.json({ received: true });
  }
}
