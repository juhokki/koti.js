import { useSearchParams, useOutletContext, Link } from "react-router-dom";
import { Device } from "../../interface/Asset";
import ManagementHeader from "../common/ManagementHeader";

export default function DeviceDetails() {
	const device = useOutletContext<Device>();
	const [params] = useSearchParams();
	const search = params.get("from") === "alarms" ? "?from=alarms" : "";
	const path = `/devices/${encodeURIComponent(device.id)}`;
	return (
		<section>
			<ManagementHeader
				title={device.name}
				backPath={search ? "/alarms" : "/system/devices"}
			/>
			<section className="content">
				<dl className="details-list">
					<dt>ID</dt>
					<dd>{device.id}</dd>
					<dt>Nimi</dt>
					<dd>{device.name}</dd>
					<dt>Tyyppi</dt>
					<dd>{device.type}</dd>
					<dt>Kuvake</dt>
					<dd>{device.icon}</dd>
				</dl>
				<nav aria-label="Laitteen näkymät">
					<ul className="navigation-list">
						{(
							[
								["history", "Historia"],
								["alarms", "Hälytykset"],
								["schedules", "Ajastukset"],
								["actions", "Toiminnot"]
							] as const
						).map(([section, label]) => (
							<li key={section}>
								<Link to={`${path}/${section}${search}`}>
									{label}
								</Link>
							</li>
						))}
					</ul>
				</nav>
				<h3>Mittaukset</h3>
				{device.measurements.length === 0 && <p>Ei mittauksia.</p>}
				<ul className="record-list">
					{device.measurements.map((measurement) => (
						<li key={measurement.id}>
							<h4>{measurement.name}</h4>
							<dl className="details-list">
								<dt>ID</dt>
								<dd>{measurement.id}</dd>
								<dt>Tyyppi</dt>
								<dd>{measurement.type}</dd>
								<dt>Yksikkö</dt>
								<dd>{measurement.unit || "-"}</dd>
								<dt>Kuvake</dt>
								<dd>{measurement.icon}</dd>
								<dt>Ohjattava</dt>
								<dd>
									{measurement.controllable ? "Kyllä" : "Ei"}
								</dd>
								<dt>Minimi</dt>
								<dd>{measurement.min ?? "-"}</dd>
								<dt>Maksimi</dt>
								<dd>{measurement.max ?? "-"}</dd>
								<dt>Askeleet</dt>
								<dd>{measurement.steps?.join(", ") ?? "-"}</dd>
								<dt>Poistettu käytöstä</dt>
								<dd>{measurement.disabled ? "Kyllä" : "Ei"}</dd>
							</dl>
						</li>
					))}
				</ul>
			</section>
		</section>
	);
}
