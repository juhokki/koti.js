import ServiceBase from "../ServiceBase.js";
import * as Messages from "../../constants/Messages.js";
import StaleValueAlarmChecker from "./alarmcheckers/StaleValueAlarmChecker.js";
import ValueLowerLimitAlarmChecker from "./alarmcheckers/ValueLowerLimitAlarmChecker.js";
import ValueUpperLimitAlarmChecker from "./alarmcheckers/ValueUpperLimitAlarmChecker.js";
import type AlarmServiceSettings from "./AlarmServiceSettings.js";
import type ServiceLocator from "../ServiceLocator.js";
import AlarmType from "../../enums/AlarmType.js";
import type Alarm from "../../model/Alarm.js";
import type AlarmCheckerBase from "./alarmcheckers/AlarmCheckerBase.js";
import type Measurement from "../../model/Measurement.js";
import type AlarmCheckerOptions from "./alarmcheckers/AlarmCheckerOptions.js";

export default class AlarmService extends ServiceBase {
	options: AlarmServiceSettings;
	alarms: Map<AlarmType, Alarm[]>;
	alarmCheckers: AlarmCheckerBase[];

	constructor(services: ServiceLocator, options: AlarmServiceSettings) {
		super(services);

		this.options = options;
		this.alarms = new Map();
		this.alarmCheckers = [];
	}

	override start() {
		this.buildAlarmCheckers();

		this.alarmCheckers.forEach((checker) => {
			checker.start();
		});

		return Promise.resolve();
	}

	override stop() {
		this.alarmCheckers.forEach((checker) => {
			checker.stop();
		});

		return Promise.resolve();
	}

	buildAlarmCheckers() {
		const measurements = this.services.getAssetService().getMeasurements();

		this.buildStaleValueAlarmChecker(measurements);
		this.buildValueUpperLimitAlarmChecker(measurements);
		this.buildValueLowerLimitAlarmChecker(measurements);
	}

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
	getAlarmChecker<T extends AlarmCheckerBase>(type: AlarmType): T {
		const checker = this.alarmCheckers.find(
			(checker) => checker.type === type
		);

		if (!checker) {
			throw new Error(`Alarm checker not found.`);
		}

		return checker as T;
	}

	buildStaleValueAlarmChecker(measurements: Measurement[]) {
		const checker = new StaleValueAlarmChecker(this.services, {
			type: AlarmType.Stale,
			measurements: measurements,
			onChange: (alarms: Alarm[]) => {
				this.alarms.set(AlarmType.Stale, alarms);
				this.onAlarmsChanged();
			}
		} satisfies AlarmCheckerOptions);

		this.alarmCheckers.push(checker);
	}

	buildValueUpperLimitAlarmChecker(measurements: Measurement[]) {
		const checker = new ValueUpperLimitAlarmChecker(this.services, {
			type: AlarmType.ValueUpperLimit,
			measurements: measurements,
			onChange: (alarms: Alarm[]) => {
				this.alarms.set(AlarmType.ValueLowerLimit, alarms);
				this.onAlarmsChanged();
			}
		} satisfies AlarmCheckerOptions);

		this.alarmCheckers.push(checker);
	}

	buildValueLowerLimitAlarmChecker(measurements: Measurement[]) {
		const checker = new ValueLowerLimitAlarmChecker(this.services, {
			type: AlarmType.ValueLowerLimit,
			measurements: measurements,
			onChange: (alarms: Alarm[]) => {
				this.alarms.set(AlarmType.ValueLowerLimit, alarms);
				this.onAlarmsChanged();
			}
		} satisfies AlarmCheckerOptions);

		this.alarmCheckers.push(checker);
	}

	onAlarmsChanged() {
		this.emit(Messages.ALARMS, this.getAlarms());
	}

	getAlarms() {
		return Array.from(this.alarms.values()).flat();
	}
}
