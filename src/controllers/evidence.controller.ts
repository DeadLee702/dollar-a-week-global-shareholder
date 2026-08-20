import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../db/prisma.service';

const upload = multer({ dest: 'uploads/' });

@Controller('evidence')
export class EvidenceController {
  @Post('upload')
  async upload(@Req() req: any, @Res() res: Response) {
    // Use multer middleware in actual app route registration, here we provide a helper handler
    upload.single('file')(req, res, async (err: any) => {
      if (err) return res.status(400).json({ error: err.message });
      try {
        const file = req.file;
        const { proposal_id, seed_cell_id, uploader_id } = req.body;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });
        const buffer = fs.readFileSync(file.path);
        const hash = crypto.createHash('sha256').update(buffer).digest('base64');
        // move file to uploads/<hash> for durable storage
        const dest = path.join('uploads', hash + path.extname(file.originalname));
        fs.renameSync(file.path, dest);
        const dd = await prisma.dueDiligence.create({ data: { proposal_id, seed_cell_id, uploader_id: uploader_id || null, file_reference: dest, file_hash: hash, file_size: buffer.length, mime_type: file.mimetype, verified: false } });
        await prisma.auditLog.create({ data: { actor_id: uploader_id || null, action: 'upload_due_diligence', entity_type: 'due_diligence', entity_id: dd.id, new_state: 'UPLOADED' } });
        res.json({ id: dd.id, file_hash: hash });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });
  }
}
