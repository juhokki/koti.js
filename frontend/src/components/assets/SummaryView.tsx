import MeasurementRow from "../devices/rows/MeasurementRow";
import { Device, Measurement } from "../../interface/Asset";

interface SummaryDevice {
	device: Device;
	displayName: string;
	measurements: Measurement[];
}

interface SummaryViewProps {
	devices: SummaryDevice[];
}

export default function SummaryView(props: SummaryViewProps) {
	return (
		<div className="grid-item">
			<table>
				<thead>
					<tr className="underline">
						<th>Kohde</th>
						<th>Arvo</th>
					</tr>
				</thead>
				<tbody>
					{props.devices.flatMap(
						({ device, displayName, measurements }) =>
							measurements.map((measurement) => (
								<MeasurementRow
									device={device}
									measurement={measurement}
									deviceName={displayName}
									hideIcon={true}
									key={`${device.id}-${measurement.id}`}
								/>
							))
					)}
				</tbody>
			</table>
		</div>
	);
}
