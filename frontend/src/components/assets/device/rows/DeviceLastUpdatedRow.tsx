import { useContext, useState, useEffect } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ValuesContext } from "../../../../context/ValuesContext";
import ValueUtil from "../../../../util/ValueUtil";
import { Device } from "../../../../interface/Asset";
import { Value } from "../../../../interface/Value";
import { timeElapsed } from "../../../../util/TimeUtil";

interface DeviceLastUpdatedRowProps {
	device: Device;
}

export default function DeviceLastUpdatedRow(props: DeviceLastUpdatedRowProps) {
	const device = props.device;
	const measurements = device.measurements;
	const valueKeys = measurements.map((measurement) =>
		ValueUtil.createValueKey(device.id, measurement.id)
	);
	const context = useContext(ValuesContext);
	const values = valueKeys
		.map((key) => context.values.get(key))
		.filter((value) => !!value);
	const [lastUpdated, setLastUpdated] = useState(
		Math.max(...values.map((value) => value.time))
	);
	const timeElapsedString = timeElapsed(lastUpdated);

	useEffect(() => {
		const listener = (value: Value) => {
			if (value.time > lastUpdated) {
				setLastUpdated(value.time);
			}
		};

		valueKeys.forEach((key) => {
			context.values.on(key, listener);
		});

		return () => {
			valueKeys.forEach((key) => {
				context.values.off(key, listener);
			});
		};
	});

	return (
		<tr>
			<th>
				<div>
					<RefreshIcon />
					<span>Päivitetty</span>
				</div>
			</th>
			<td>
				<span>{timeElapsedString}</span>
			</td>
		</tr>
	);
}
