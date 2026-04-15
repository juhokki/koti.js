import { useNavigate } from "react-router-dom";
import Icon from "@mui/material/Icon";
import MeasurementRow from "./rows/MeasurementRow";
import DeviceLastUpdatedRow from "./rows/DeviceLastUpdatedRow";
import ActionsRow from "./rows/ActionsRow";
import AlarmsRow from "./rows/AlarmsRow";
import SchedulesRow from "./rows/SchedulesRow";
import { Asset, Device, DeviceOnlineStatus } from "../../../interface/Asset";

interface DeviceViewProps {
	asset: Asset;
	device: Device;
}

export default function DeviceView(props: DeviceViewProps) {
	const navigate = useNavigate();
	const asset = props.asset;
	const device = props.device;
	const offline = device.onlineStatus === DeviceOnlineStatus.OFFLINE;
	const measurements = device.measurements;
	const openMeasurementHistory = () => {
		Promise.resolve(navigate(`/assets/${asset.id}/${device.id}`)).catch(console.log);
	};

	const hasActions = !!device.measurements.find(
		(measurement) => measurement.actions.length > 0
	);
	const hasAlarms = !!device.measurements.find(
		(measurement) => measurement.alarms.length > 0
	);
	const hasSchedules = !!device.measurements.find(
		(measurement) => measurement.schedules.length > 0
	);

	return (
		<div className="grid-item">
			<h3
				onClick={openMeasurementHistory}
				className={`centered underline ${offline ? "danger" : "clickable"}`}
			>
				<Icon>{device.icon}</Icon>
				<span>{device.name}</span>
			</h3>
			<table className="table-2-col margin-top">
				<tbody>
					{measurements.map((measurement) => (
						<MeasurementRow
							device={device}
							measurement={measurement}
							key={measurement.id}
						/>
					))}
					<DeviceLastUpdatedRow device={device} />
					{hasActions && <ActionsRow device={device} />}
					{hasAlarms && <AlarmsRow device={device} />}
					{hasSchedules && <SchedulesRow device={device} />}
				</tbody>
			</table>
		</div>
	);
}
