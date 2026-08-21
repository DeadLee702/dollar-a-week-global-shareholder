import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { GovernanceService } from '../services/governance.service';

@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Post('proposals')
  async createProposal(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      const proposal = await this.governanceService.createProposal(body);
      res.status(201).json(proposal);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  @Post('votes')
  async vote(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      const vote = await this.governanceService.castVote(body);
      res.status(201).json(vote);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
