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
		<div className="grid-item full-width">
			<table className="margin-top">
				<thead>
					<tr className="underline">
						<th>Kohde</th>
						<th>Arvo</th>
						<th className="hide-on-small-screen">Päivitetty</th>
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
									showLastUpdated={true}
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
