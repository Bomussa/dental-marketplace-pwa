import { changeBookingStatus, markBookingCheckedIn, reverseBookingCheckIn } from "@/app/clinic/actions";
import { CheckIcon } from "@/components/icons";
import { Badge, Button, Input } from "@/components/ui";
import { ClinicBookingStatusForm, type ClinicBookingStatusLabels } from "@/components/clinic-booking-status-form";

export type ClinicBookingActionsLabels = ClinicBookingStatusLabels & {
  checkIn: string;
  completeVisit: string;
  reverseReason: string;
  reverse: string;
  attendanceUnknown: string;
  attendanceOutOfSync: string;
  viewOnly: string;
};

type MutableBookingStatus = "pending_hold" | "pending_clinic_confirmation" | "confirmed";
type AttendanceState = "available" | "unavailable" | "out_of_sync";

type Props = {
  bookingId: string;
  status: string;
  startAt: string;
  canOperate: boolean;
  canReverseAttendance?: boolean;
  attendanceState?: AttendanceState;
  latestAttendanceEvent?: string | null;
  labels: ClinicBookingActionsLabels;
};

/**
 * The server remains the authority for every transition. This component only
 * presents actions already supported by the central operational RPC workflow.
 */
export function ClinicBookingActions({
  bookingId,
  status,
  startAt,
  canOperate,
  canReverseAttendance = false,
  attendanceState = "available",
  latestAttendanceEvent = null,
  labels,
}: Props) {
  if (!canOperate) return <Badge>{labels.viewOnly}</Badge>;

  const mutableStatus: MutableBookingStatus | null = status === "pending_hold" || status === "pending_clinic_confirmation" || status === "confirmed" ? status : null;
  const checkedInWithoutCurrentAttendance = status === "checked_in" && attendanceState === "unavailable";
  const checkedInOutOfSync = status === "checked_in" && attendanceState === "out_of_sync";
  const canComplete = status === "checked_in" && attendanceState === "available" && latestAttendanceEvent === "checked_in";

  return (
    <div className="flex flex-wrap content-start gap-2">
      {status === "confirmed" && <form action={markBookingCheckedIn}><input type="hidden" name="booking_id" value={bookingId} /><input type="hidden" name="reason" value={labels.checkIn} /><Button className="gap-1.5"><CheckIcon size={16} />{labels.checkIn}</Button></form>}
      {checkedInWithoutCurrentAttendance && <Badge tone="amber">{labels.attendanceUnknown}</Badge>}
      {checkedInOutOfSync && <Badge tone="amber">{labels.attendanceOutOfSync}</Badge>}
      {canComplete && <>
        <form action={changeBookingStatus}><input type="hidden" name="booking_id" value={bookingId} /><input type="hidden" name="status" value="completed" /><Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"><CheckIcon size={16} />{labels.completeVisit}</Button></form>
        {canReverseAttendance && <form action={reverseBookingCheckIn} className="flex gap-2"><input type="hidden" name="booking_id" value={bookingId} /><Input name="reason" required minLength={3} placeholder={labels.reverseReason} /><Button className="bg-amber-600 px-3">{labels.reverse}</Button></form>}
      </>}
      {mutableStatus && <ClinicBookingStatusForm bookingId={bookingId} status={mutableStatus} startAt={startAt} labels={labels} />}
    </div>
  );
}
