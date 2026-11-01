import { useEffect, useState } from "react";
import MeasurementRow from "./device/rows/MeasurementRow";
import { Device, Measurement } from "../../interface/Asset";

const TIMESTAMP_COLUMN_MIN_WIDTH = 800;

interface SummaryDevice {
	device: Device;
	displayName: string;
	measurements: Measurement[];
}

interface AssetSummaryViewProps {
	devices: SummaryDevice[];
}

export default function AssetSummaryView(props: AssetSummaryViewProps) {
	const [showLastUpdated, setShowLastUpdated] = useState(
		() => window.innerWidth > TIMESTAMP_COLUMN_MIN_WIDTH
	);

	useEffect(() => {
		const updateColumnVisibility = () => {
			setShowLastUpdated(window.innerWidth > TIMESTAMP_COLUMN_MIN_WIDTH);
		};

		window.addEventListener("resize", updateColumnVisibility);

		return () => {
			window.removeEventListener("resize", updateColumnVisibility);
		};
	}, []);

	return (
		<div className="grid-item full-width">
			<table className="margin-top">
				<thead>
					<tr className="underline">
						<th>Kohde</th>
						<th>Arvo</th>
						{showLastUpdated && <th>Päivitetty</th>}
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
									showLastUpdated={showLastUpdated}
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
