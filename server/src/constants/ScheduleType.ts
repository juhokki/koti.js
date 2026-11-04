const ScheduleType = {
	Cron: "cron",
	Suncalc: "suncalc"
} as const;

type ScheduleType = (typeof ScheduleType)[keyof typeof ScheduleType];

export default ScheduleType;
