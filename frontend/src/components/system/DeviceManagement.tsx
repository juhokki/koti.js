import { useContext } from "react";
import { AssetsContext } from "../../context/AssetsContext";
import ManagementHeader from "../common/ManagementHeader";
import TreeList, { type TreeNode } from "../common/TreeList";

export default function DeviceManagement() {
	const { devices, loading } = useContext(AssetsContext);
	const types = [...new Set(devices.map((device) => device.type))].sort();
	const nodes: TreeNode[] = types.map((type) => ({
		id: type,
		label: type.replace(/([a-z])([A-Z])/g, "$1 $2"),
		icon: "extension",
		children: devices
			.filter((device) => device.type === type)
			.sort(
				(first, second) =>
					first.name.localeCompare(second.name, "fi") ||
					first.id.localeCompare(second.id)
			)
			.map((device) => ({
				id: device.id,
				label: device.name,
				icon: device.icon,
				to: `/devices/${encodeURIComponent(device.id)}`
			}))
	}));
	return (
		<section>
			<ManagementHeader title="Laitteet" backPath="/system" />
			<section className="content">
				{loading ? (
					<div className="loader-container">
						<div className="loader" />
					</div>
				) : devices.length ? (
					<TreeList label="Laitteet" nodes={nodes} />
				) : (
					<p>Ei laitteita.</p>
				)}
			</section>
		</section>
	);
}
