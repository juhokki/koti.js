import { useLocation, useNavigate } from "react-router-dom";
import Icon from "@mui/material/Icon";
import useAssetPath from "../../../hooks/useAssetPath";
import MeasurementRow from "./rows/MeasurementRow";
import DeviceLastUpdatedRow from "./rows/DeviceLastUpdatedRow";
import ActionsRow from "./rows/ActionsRow";
import AlarmsRow from "./rows/AlarmsRow";
import SchedulesRow from "./rows/SchedulesRow";
import {
	Device,
	DeviceOnlineStatus,
	Measurement
} from "../../../interface/Asset";

interface DeviceViewProps {
	device: Device;
	displayName?: string;
	measurements?: Measurement[];
}

export default function DeviceView(props: DeviceViewProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { assetPath } = useAssetPath();
	const device = props.device;
	const displayName = props.displayName ?? device.name;
	const offline = device.onlineStatus === DeviceOnlineStatus.OFFLINE;
	const measurements = props.measurements ?? device.measurements;
	const viewDevice = { ...device, measurements };
	const openMeasurementHistory = () => {
		Promise.resolve(
			navigate(`${assetPath}/${device.id}/history${location.search}`)
		).catch(console.log);
	};

	const hasActions = !!measurements.find(
		(measurement) => measurement.actions.length > 0
	);
	const hasAlarms = !!measurements.find(
		(measurement) => measurement.alarms.length > 0
	);
	const hasSchedules = !!measurements.find(
		(measurement) => measurement.schedules.length > 0
	);

	return (
		<div className="grid-item">
			<h3
				onClick={openMeasurementHistory}
				className={`centered underline ${offline ? "danger" : "clickable"}`}
			>
				<Icon>{device.icon}</Icon>
				<span>{displayName}</span>
			</h3>
			<table className="margin-top">
				<tbody>
					{measurements.map((measurement) => (
						<MeasurementRow
							device={device}
							measurement={measurement}
							key={measurement.id}
						/>
					))}
					<DeviceLastUpdatedRow device={viewDevice} />
					{hasActions && <ActionsRow device={viewDevice} />}
					{hasAlarms && <AlarmsRow device={viewDevice} />}
					{hasSchedules && <SchedulesRow device={viewDevice} />}
				</tbody>
			</table>
		</div>
	);
}
