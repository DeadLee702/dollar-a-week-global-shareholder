import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeService } from '../services/stripe.service';

const stripeService = new StripeService();

@Controller('payments')
export class PaymentsController {
  @Post('create-session')
  async createSession(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    /* Expected body:
      {
        seed_cell_id,
        user_id,
        amount, // in major units (1.00)
        currency,
        success_url,
        cancel_url
      }
    */
    try {
      const { seed_cell_id, user_id, amount, currency, success_url, cancel_url } = body;
      if (!seed_cell_id || !user_id || !amount || !currency || !success_url || !cancel_url) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create pending contribution
      const contrib = await stripeService.createPendingContribution(seed_cell_id, user_id, Number(amount), currency);

      // Create checkout session
      const session = await stripeService.createCheckoutSession({ contributionId: contrib.id, amount: Number(amount), currency, successUrl: success_url, cancelUrl: cancel_url });

      // Update contribution with provisional payment_reference to the session id
      await (await import('../db/prisma.service')).prisma.contribution.update({ where: { id: contrib.id }, data: { payment_reference: session.id } });

      return res.json({ session_id: session.id, checkout_url: session.url, contribution_id: contrib.id });
    } catch (err: any) {
      console.error('createSession error', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
