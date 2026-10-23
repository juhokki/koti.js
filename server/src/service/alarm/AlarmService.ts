import ServiceBase from "../ServiceBase.ts";
import * as Messages from "../../constants/Messages.ts";
import StaleValueAlarmChecker from "./alarmcheckers/StaleValueAlarmChecker.ts";
import ValueLowerLimitAlarmChecker from "./alarmcheckers/ValueLowerLimitAlarmChecker.ts";
import ValueUpperLimitAlarmChecker from "./alarmcheckers/ValueUpperLimitAlarmChecker.ts";
import type AlarmServiceSettings from "./AlarmServiceSettings.ts";
import type ServiceLocator from "../ServiceLocator.ts";
import AlarmType from "../../constants/AlarmType.ts";
import type Alarm from "../../model/Alarm.ts";
import type AlarmCheckerBase from "./alarmcheckers/AlarmCheckerBase.ts";
import type Measurement from "../../model/Measurement.ts";
import type AlarmCheckerOptions from "./alarmcheckers/AlarmCheckerOptions.ts";

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

		this.alarmCheckers.push(this.buildAlarmChecker(StaleValueAlarmChecker, AlarmType.Stale, measurements));
		this.alarmCheckers.push(this.buildAlarmChecker(ValueUpperLimitAlarmChecker, AlarmType.ValueUpperLimit, measurements));
		this.alarmCheckers.push(this.buildAlarmChecker(ValueLowerLimitAlarmChecker, AlarmType.ValueLowerLimit, measurements));
	}

	buildAlarmChecker(alarmCheckerRef: new (services: ServiceLocator, options: AlarmCheckerOptions) => AlarmCheckerBase, alarmType: AlarmType, measurements: Measurement[]): AlarmCheckerBase {
		return new alarmCheckerRef(this.services, {
			type: alarmType,
			measurements: measurements,
			onChange: (alarm: Alarm | null, alarms: Alarm[]) => {
				this.alarms.set(alarmType, alarms);
                this.onAlarmsChanged();

				if (alarm !== null) {
					this.onAlarmTriggered(alarm);
				}
			}
		});
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

	onAlarmTriggered(alarm: Alarm) {
		this.emit(Messages.ALARM_TRIGGERED, alarm);
	}

	onAlarmsChanged() {
		this.emit(Messages.ALARMS, this.getAlarms());
	}

	getAlarms() {
		return Array.from(this.alarms.values()).flat();
	}
}
