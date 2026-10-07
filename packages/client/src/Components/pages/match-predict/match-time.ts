// Encode the Seoul wall clock using the same legacy format as reservations.
export function getMatchNow(): number {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
    return (((values.year * 12 + values.month - 1) * 32 + values.day) * 24 + values.hour) * 60 + values.minute;
}
