import { StripeService } from '../services/stripe.service';
import { prisma } from '../db/prisma.service';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      checkout: {
        sessions: {
          create: jest.fn().mockImplementation((opts: any) => {
            return Promise.resolve({ id: 'sess_test_mock', url: 'https://checkout.test/sess_test_mock' });
          })
        }
      }
    };
  });
});

describe('StripeService.createCheckoutSession', () => {
  it('creates a checkout session and returns id & url (mocked)', async () => {
    const svc = new (require('../services/stripe.service').StripeService)();
    const res = await svc.createCheckoutSession({ contributionId: 'contrib123', amount: 1.0, currency: 'USD', successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel' });
    expect(res.id).toBeDefined();
    expect(res.url).toContain('https://');
  });
});
