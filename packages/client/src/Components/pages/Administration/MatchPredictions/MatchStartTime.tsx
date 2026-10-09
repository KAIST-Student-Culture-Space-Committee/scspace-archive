"use client";

import { Grid, Text } from "@chakra-ui/react";
import { DateForm, HourForm } from "@scspace-client/Components/organisms/Reservation/Forms";
import { dateUtils } from "@scspace-client/Hooks/utils";
import { getMatchNow } from "@scspace-client/Components/pages/match-prediction/match-time";

export default function MatchStartTime({ value, onChange, disabled = false }: {
    value: number | null;
    onChange: (value: number) => void;
    disabled?: boolean;
}) {
    const { getDate, getTime, getString } = dateUtils();
    const date = getDate(value ?? getMatchNow());
    const hour = value == null ? 0 : date.getHours();
    function changeDate(selected: Date) {
        if (disabled) return;
        selected.setHours(hour, 0, 0, 0);
        onChange(getTime(selected));
    }
    function changeHour(selected: number) {
        if (disabled) return;
        date.setHours(selected, 0, 0, 0);
        onChange(getTime(date));
    }
    return (
        <fieldset disabled={disabled}>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <DateForm label="경기 시작일 · KST" date={date} setDate={changeDate} />
                <HourForm key={value == null ? "unset" : hour} label="시작·접수 마감 시각 · KST" hour={hour} setHour={changeHour} inDialog />
            </Grid>
            <Text fontSize="sm" color="fg.muted" mt={2}>
                {value == null ? "시작시간을 선택해주세요. 미설정 경기는 접수를 열 수 없습니다." : `${getString(value)} KST — 경기 시작과 동시에 접수가 마감됩니다.`}
            </Text>
        </fieldset>
    );
}
