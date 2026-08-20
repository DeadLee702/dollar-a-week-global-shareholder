import { Module } from '@nestjs/common';
import { ProtocolStateService } from './protocol-state/protocol-state.service';
import { PrismaService } from './db/prisma.service';
import { StripeWebhookController } from './payments/stripe-webhook.controller';
import { ContributionsController } from './controllers/contributions.controller';
import { GovernanceController } from './controllers/governance.controller';
import { TreasuryController } from './controllers/treasury.controller';
import { ContributionsService } from './services/contributions.service';
import { GovernanceService } from './services/governance.service';
import { TreasuryService } from './services/treasury.service';

@Module({
  imports: [],
  controllers: [StripeWebhookController, ContributionsController, GovernanceController, TreasuryController],
  providers: [ProtocolStateService, PrismaService, ContributionsService, GovernanceService, TreasuryService]
})
export class AppModule {}
