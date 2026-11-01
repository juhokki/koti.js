import MeasurementRow from "./device/rows/MeasurementRow";
import { Device, Measurement } from "../../interface/Asset";

interface SummaryDevice {
	device: Device;
	displayName: string;
	measurements: Measurement[];
}

interface AssetSummaryViewProps {
	devices: SummaryDevice[];
}

export default function AssetSummaryView(props: AssetSummaryViewProps) {
	return (
		<div className="grid-item">
			<h3 className="centered">Yhteenveto</h3>
			<table className="margin-top">
				<tbody>
					{props.devices.flatMap(
						({ device, displayName, measurements }) =>
							measurements.map((measurement) => (
								<MeasurementRow
									device={device}
									measurement={measurement}
									deviceName={displayName}
									key={`${device.id}-${measurement.id}`}
								/>
							))
					)}
				</tbody>
			</table>
		</div>
	);
}