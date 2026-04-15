import Icon from "@mui/material/Icon";
import Value from "../ValueView";
import { Device, Measurement } from "../../../../interface/Asset";

interface MeasurementRowProps {
	device: Device;
	measurement: Measurement;
}

export default function MeasurementRow(props: MeasurementRowProps) {
	const device = props.device;
	const measurement = props.measurement;

	return (
		<tr>
			<th>
				<div>
					<Icon>{measurement.icon}</Icon>
					<span>{measurement.name}</span>
				</div>
			</th>
			<td>
				<Value device={device} measurement={measurement} />
			</td>
		</tr>
	);
}
