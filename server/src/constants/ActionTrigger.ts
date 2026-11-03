const ActionTrigger = {
	OnChange: "onChange",
	OnInitialValue: "onInitialValue"
} as const;

type ActionTrigger = (typeof ActionTrigger)[keyof typeof ActionTrigger];

export default ActionTrigger;
