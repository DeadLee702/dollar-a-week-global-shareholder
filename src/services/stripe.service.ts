import Stripe from 'stripe';
import { prisma } from '../db/prisma.service';

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(stripeSecret, { apiVersion: '2023-08-16' });

export class StripeService {
  stripe: Stripe;
  constructor() {
    if (!stripeSecret) {
      console.warn('STRIPE_SECRET_KEY not configured; Checkout sessions will not be created.');
    }
    this.stripe = stripe;
  }

  async createCheckoutSession(params: {
    contributionId: string;
    amount: number; // in major units (USD)
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    if (!stripeSecret) {
      // In dev without Stripe configured, return a simulated response
      return {
        id: `dev_session_${params.contributionId}`,
        url: params.successUrl + '?dev_session=1'
      };
    }

    // Stripe expects amounts in the smallest currency unit
    const currency = params.currency.toLowerCase();
    const amountMinor = Math.round(params.amount * 100);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: 'Dollar a Week Contribution',
              description: 'Contribution to Seed Cell'
            },
            unit_amount: amountMinor
          },
          quantity: 1
        }
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        contribution_id: params.contributionId
      }
    });

    return { id: session.id, url: session.url };
  }

  async createPendingContribution(seedCellId: string, userId: string, amount: number, currency: string, provider = 'stripe') {
    // Create a pending contribution record in DB; return its id for session metadata
    const member = await prisma.seedCellMember.findFirst({ where: { seed_cell_id: seedCellId, user_id: userId } });
    if (!member) {
      // Create pending membership record per onboarding flow — admin processes later
      const newMember = await prisma.seedCellMember.create({ data: { seed_cell_id: seedCellId, user_id: userId, membership_status: 'PENDING' } });
      const contrib = await prisma.contribution.create({ data: { seed_cell_id: seedCellId, member_id: newMember.id, amount, currency, usd_equivalent: amount, contribution_week: new Date(), payment_provider: provider, payment_status: 'INITIATED' } });
      return contrib;
    }
    const contrib = await prisma.contribution.create({ data: { seed_cell_id: seedCellId, member_id: member.id, amount, currency, usd_equivalent: amount, contribution_week: new Date(), payment_provider: provider, payment_status: 'INITIATED' } });
    return contrib;
  }
}
