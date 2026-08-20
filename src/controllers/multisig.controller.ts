import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { MultisigService } from '../services/multisig.service';

const svc = new MultisigService();

@Controller('multisig')
export class MultisigController {
  @Post('assign')
  async assign(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      const { seed_cell_id, custodians } = body;
      const created = await svc.assignCustodians(seed_cell_id, custodians || []);
      res.json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  @Post('submit-signature')
  async submitSignature(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      const { transaction_id, custodian_id, signature_reference, submitted_by } = body;
      const sig = await svc.submitSignature(transaction_id, custodian_id, signature_reference, submitted_by);
      res.json(sig);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  @Post('execute')
  async execute(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      const { transaction_id, executed_by } = body;
      const r = await svc.executeTransaction(transaction_id, executed_by);
      res.json(r);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
