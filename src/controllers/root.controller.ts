import { Controller, Post, Req, Res, Body } from '@nestjs/common';
import { Request, Response } from 'express';

// Health check & simple public ledger endpoints could go here in future
@Controller()
export class RootController {
  @Post('health')
  health(@Req() req: Request, @Res() res: Response) {
    res.json({ status: 'ok' });
  }
}
