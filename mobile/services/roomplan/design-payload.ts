/**
 * Request body for handing a capture to the web design studio.
 *
 * Kept apart from `design-api.ts` so it has no native or secure-store imports: the shape the phone
 * posts can then be asserted in a plain runtime test, which is what stops the phone and the server
 * drifting apart on the `zones` field.
 */

import type { Plan3DZone } from '../../modules/fire-alarm-roomplan/plan3d/plan3d-types';
import type { FireAlarmScanSession } from '../../modules/fire-alarm-roomplan/types';

export interface PublishDesignInput {
  session: FireAlarmScanSession;
  /**
   * Zones drawn on the phone. They replace the auto-generated room zones on the storeys they
   * cover, so marking out compartments before publishing does not lose that work.
   */
  zones?: Plan3DZone[];
  name?: string | null;
  /** Let the recipient of the shared link edit as well as view. */
  editEnabled?: boolean;
}

export interface PublishDesignBody {
  session: FireAlarmScanSession;
  zones: Plan3DZone[];
  name: string | null;
  editEnabled: boolean;
}

/**
 * Builds the posted body, turning omitted fields into explicit neutral values so the server never
 * has to guess whether `zones` was absent because there were none or because the caller is older.
 */
export function buildPublishDesignBody(input: PublishDesignInput): PublishDesignBody {
  return {
    session: input.session,
    zones: input.zones ?? [],
    name: typeof input.name === 'string' && input.name.trim() ? input.name.trim() : null,
    editEnabled: input.editEnabled === true,
  };
}
