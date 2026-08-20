import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  status() {
    return { status: 'ok', uptime: process.uptime() };
  }
}
