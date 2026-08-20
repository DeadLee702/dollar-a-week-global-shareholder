import { Controller, Post, Body, Req, Res, Get } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProjectsService } from '../services/projects.service';

const svc = new ProjectsService();

@Controller('projects')
export class ProjectsController {
  @Post()
  async create(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      const project = await svc.createProject(body);
      res.status(201).json(project);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  @Post('assets')
  async recordAsset(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      const { seed_cell_id, project_id, asset_type, asset_ref, capacity, metadata } = body;
      const asset = await svc.recordInfrastructure(seed_cell_id, project_id, asset_type, asset_ref, capacity, metadata);
      res.status(201).json(asset);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  @Get('health')
  health(@Req() req: Request, @Res() res: Response) {
    res.json({ status: 'projects_ok' });
  }
}
