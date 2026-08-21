import { Controller, Post, Body, Req, Res, HttpCode } from '@nestjs/common';
import { Request, Response } from 'express';
import { ContributionsService } from '../services/contributions.service';

@Controller('contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    // Expect body: { seed_cell_id, user_id, amount, currency, payment_reference }
    try {
      const result = await this.contributionsService.createPendingContribution(body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
