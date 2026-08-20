import { prisma } from '../db/prisma.service';

export const infraPrerequisiteState: Record<string, string> = {
  WATER: 'STATE_3_LAND_EXECUTION',
  ENERGY: 'STATE_4_HARDWARE_DEPLOYMENT',
  HOUSING: 'STATE_4_HARDWARE_DEPLOYMENT',
  PRODUCTIVE: 'STATE_4_HARDWARE_DEPLOYMENT'
};
