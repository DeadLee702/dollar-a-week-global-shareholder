import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { TreasuryService } from '../services/treasury.service';

@Controller('treasury')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Post('transactions')
  async createTransaction(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      const tx = await this.treasuryService.createTransaction(body);
      res.status(201).json(tx);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  @Post('signatures')
  async submitSignature(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      const sig = await this.treasuryService.submitSignature(body);
      res.status(201).json(sig);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
