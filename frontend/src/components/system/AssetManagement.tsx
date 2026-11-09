import { useContext } from "react";
import { Link, useParams } from "react-router-dom";
import { AssetsContext } from "../../context/AssetsContext";
import type { Asset } from "../../interface/Asset";
import ManagementHeader from "../common/ManagementHeader";
import TreeList, { type TreeNode } from "../common/TreeList";

function assetNodes(
	assets: Asset[],
	id: string,
	ancestors: string[] = []
): TreeNode[] {
	const asset = assets.find((asset) => asset.id === id);
	if (!asset || ancestors.includes(id)) {
		return [];
	}
	const path = [...ancestors, id];
	return [
		{
			id: JSON.stringify(path),
			label: asset.name,
			icon: asset.icon,
			to: `/system/assets/${encodeURIComponent(id)}`,
			children: (asset.links ?? []).flatMap((linkedId) =>
				assetNodes(assets, linkedId, path)
			)
		}
	];
}

export default function AssetManagement() {
	const { assets, devices, loading } = useContext(AssetsContext);
	const { assetId } = useParams();
	const asset = assets.find((asset) => asset.id === assetId);
	return (
		<section>
			<ManagementHeader
				title={assetId ? (asset?.name ?? "Kohde") : "Kohteet"}
				backPath={assetId ? "/system/assets" : "/system"}
			/>
			<section className="content">
				{loading ? (
					<div className="loader-container">
						<div className="loader" />
					</div>
				) : assetId ? (
					asset ? (
						<>
							<dl className="details-list">
								<dt>ID</dt>
								<dd>{asset.id}</dd>
								<dt>Nimi</dt>
								<dd>{asset.name}</dd>
								<dt>Kuvake</dt>
								<dd>{asset.icon}</dd>
							</dl>
							<h3>Linkitetyt kohteet</h3>
							{(asset.links ?? []).length === 0 ? (
								<p>Ei linkitettyjä kohteita.</p>
							) : (
								<ul className="navigation-list">
									{asset.links?.map((id) => (
										<li key={id}>
											<Link
												to={`/system/assets/${encodeURIComponent(id)}`}
											>
												{assets.find(
													(linked) => linked.id === id
												)?.name ?? id}
											</Link>
										</li>
									))}
								</ul>
							)}
							<h3>Laitteet</h3>
							{asset.deviceIds.length === 0 ? (
								<p>Ei laitteita.</p>
							) : (
								<ul className="navigation-list">
									{asset.deviceIds.map((id) => (
										<li key={id}>
											<Link
												to={`/devices/${encodeURIComponent(id)}`}
											>
												{devices.find(
													(device) => device.id === id
												)?.name ?? id}
											</Link>
										</li>
									))}
								</ul>
							)}
							<h3>Yhteenveto</h3>
							{!asset.summary?.devices.length ? (
								<p>Ei yhteenvetoa.</p>
							) : (
								<ul className="record-list">
									{asset.summary.devices.map(
										(entry, index) => (
											<li
												key={`${entry.deviceId}-${String(index)}`}
											>
												<h4>{entry.displayName}</h4>
												<dl className="details-list">
													<dt>Laite</dt>
													<dd>
														<Link
															to={`/devices/${encodeURIComponent(entry.deviceId)}`}
														>
															{devices.find(
																(device) =>
																	device.id ===
																	entry.deviceId
															)?.name ??
																entry.deviceId}
														</Link>
													</dd>
													<dt>Mittaukset</dt>
													<dd>
														{entry.measurementIds
															.map(
																(id) =>
																	devices
																		.find(
																			(
																				device
																			) =>
																				device.id ===
																				entry.deviceId
																		)
																		?.measurements.find(
																			(
																				measurement
																			) =>
																				measurement.id ===
																				id
																		)
																		?.name ??
																	id
															)
															.join(", ") || "-"}
													</dd>
												</dl>
											</li>
										)
									)}
								</ul>
							)}
						</>
					) : (
						<p>Kohdetta ei löytynyt.</p>
					)
				) : assets.some((asset) => asset.id === "root") ? (
					<TreeList
						label="Kohteet"
						nodes={assetNodes(assets, "root")}
					/>
				) : (
					<p>Juurikohdetta ei löytynyt.</p>
				)}
			</section>
		</section>
	);
}
