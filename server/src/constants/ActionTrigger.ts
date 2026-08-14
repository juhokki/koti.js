const ActionTrigger = {
	OnChange: "onChange"
} as const;

type ActionTrigger = (typeof ActionTrigger)[keyof typeof ActionTrigger];

export default ActionTrigger;
