import { Outlet } from "react-router-dom";
import useDevice from "../../hooks/useDevice";
import ManagementHeader from "../common/ManagementHeader";

export default function DeviceLayout() {
	const { device, loading } = useDevice();
	if (loading) {
		return (
			<div className="loader-container">
				<div className="loader" />
			</div>
		);
	}
	if (!device) {
		return (
			<section>
				<ManagementHeader title="Laite" backPath="/system/devices" />
				<section className="content centered">
					Laitetta ei löytynyt.
				</section>
			</section>
		);
	}
	return <Outlet context={device} />;
}
