"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { Button, Select } from "@/components/ui";
import { changeBookingStatus } from "@/app/clinic/actions";

type MutableBookingStatus = "pending_hold" | "pending_clinic_confirmation" | "confirmed";
type Labels = { actionChoose: string; actionConfirm: string; actionCancel: string; actionNoShow: string; actionFail: string; actionApply: string };

type Props = {
  bookingId: string;
  status: MutableBookingStatus;
  startAt: string;
  labels: Labels;
};

export function ClinicBookingStatusForm({ bookingId, status, startAt, labels }: Props) {
  const [canMarkNoShow, setCanMarkNoShow] = useState(false);

  useEffect(() => {
    const startMs = Date.parse(startAt);
    if (!Number.isFinite(startMs)) return;
    let intervalId: number | undefined;
    const initialId = window.setTimeout(() => {
      if (Date.now() >= startMs) {
        setCanMarkNoShow(true);
        return;
      }
      intervalId = window.setInterval(() => {
        if (Date.now() >= startMs) {
          setCanMarkNoShow(true);
          if (intervalId !== undefined) window.clearInterval(intervalId);
        }
      }, 15_000);
    }, 0);
    return () => {
      window.clearTimeout(initialId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [startAt]);

  return (
    <form action={changeBookingStatus} className="flex gap-2">
      <input type="hidden" name="booking_id" value={bookingId} />
      <Select name="status" defaultValue="" required className="w-48">
        <option value="" disabled>{labels.actionChoose}</option>
        {(status === "pending_hold" || status === "pending_clinic_confirmation") && <option value="confirmed">{labels.actionConfirm}</option>}
        {(status === "pending_clinic_confirmation" || status === "confirmed") && <option value="clinic_cancelled">{labels.actionCancel}</option>}
        {status === "confirmed" && canMarkNoShow && <option value="no_show">{labels.actionNoShow}</option>}
        <option value="failed">{labels.actionFail}</option>
      </Select>
      <Button className="gap-1.5"><CheckIcon size={16} />{labels.actionApply}</Button>
    </form>
  );
}
