const AlarmType = {
	Stale: "stale",
	ValueUpperLimit: "value.upper-limit",
	ValueLowerLimit: "value.lower-limit"
} as const;

type AlarmType = (typeof AlarmType)[keyof typeof AlarmType];

export default AlarmType;
