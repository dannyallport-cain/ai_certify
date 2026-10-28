/**
 * Shared shapes for a fire alarm survey.
 *
 * A survey is a `fire_alarm_room_captures` row: the session the mobile app
 * captured, the devices identified during it, and the link to the customer and
 * ServiceM8 job the visit belongs to. These types are the contract between the
 * API routes and the dashboard, so both read the same fields.
 */

export type FireAlarmSurveyStatus = 'draft' | 'completed';

/** The ServiceM8 job (diary entry) a survey is filed against. */
export interface FireAlarmSurveyServiceM8Link {
  companyUuid: string | null;
  companyName: string | null;
  jobUuid: string | null;
  jobNumber: string | null;
  /** ServiceM8 `date`, `YYYY-MM-DD`. */
  jobDate: string | null;
  jobAddress: string | null;
}

export interface FireAlarmSurveySummary {
  id: number;
  /** The mobile capture session id this survey was built from. */
  sessionId: string;
  name: string;
  status: FireAlarmSurveyStatus;
  /** Devices the engineer identified, which is what gets saved. */
  deviceCount: number;
  roomCount: number;
  units: string | null;
  customerId: number | null;
  customerName: string | null;
  serviceM8: FireAlarmSurveyServiceM8Link | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FireAlarmSurveyDevice {
  id: number;
  externalDeviceId: string | null;
  deviceType: string;
  label: string | null;
  manufacturerName: string | null;
  locationX: number | null;
  locationY: number | null;
  locationZ: number | null;
  notes: string | null;
  roomId: string | null;
}

/** A published zone plan, when the engineer shared one for this survey. */
export interface FireAlarmSurveyZonePlan {
  id: number;
  title: string | null;
  shareToken: string;
  viewerPath: string;
  emailedTo: string | null;
  updatedAt: string;
}

export interface FireAlarmSurveyDetail extends FireAlarmSurveySummary {
  devices: FireAlarmSurveyDevice[];
  zonePlan: FireAlarmSurveyZonePlan | null;
}

/**
 * Everything a caller may change about a survey after capture.
 *
 * Every field is optional so a PATCH can carry only what changed — the dashboard
 * renames a survey and the mobile export links a job with the same payload.
 */
export interface FireAlarmSurveyUpdate {
  name?: string | null;
  status?: FireAlarmSurveyStatus;
  customerId?: number | null;
  serviceM8?: FireAlarmSurveyServiceM8Link | null;
}

/** A device as captured on the phone, before it is written to the database. */
export interface FireAlarmSurveyDeviceInput {
  id?: string | null;
  type?: string | null;
  label?: string | null;
  manufacturer?: string | { name?: string | null; confidence?: number | null } | null;
  confidence?: number | null;
  location?: { x?: number | null; y?: number | null; z?: number | null } | null;
  boundingBox?: Record<string, unknown> | null;
  notes?: string | null;
  source?: string | null;
  roomId?: string | null;
  wallSegmentId?: string | null;
  metadata?: Record<string, unknown> | null;
  identifiedByUser?: boolean;
}
