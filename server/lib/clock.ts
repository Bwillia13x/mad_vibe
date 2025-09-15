let freezeDate: Date | null = null;

import { getEnvVar } from '../../lib/env-security';

export function getNow(): Date {
  if (freezeDate) return new Date(freezeDate.getTime());
  const env = getEnvVar('DEMO_DATE');
  if (env && env.trim().length > 0) {
    const d = new Date(env);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function setFreeze(dateIso: string | null) {
  if (!dateIso) {
    freezeDate = null;
    return;
  }
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  freezeDate = d;
}

export function getFreeze(): { frozen: boolean; date: string | null } {
  return { frozen: !!freezeDate, date: freezeDate ? freezeDate.toISOString() : null };
}

