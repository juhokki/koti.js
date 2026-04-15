import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import FeedIcon from '@mui/icons-material/Feed';
import SettingsIcon from "@mui/icons-material/Settings";
import StorageIcon from "@mui/icons-material/Storage";
import prettyBytes from "pretty-bytes";
import SystemApi from "../../api/SystemApi";
import { SystemDiskState } from "../../interface/SystemDiskState";

export default function System() {
	const navigate = useNavigate();
	const goBack = () => {
		Promise.resolve(navigate("/")).catch(console.log);
	};

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [stats, setStats] = useState<SystemDiskState>();

	useEffect(() => {
		SystemApi.getSystemStats()
			.then((stats) => {
				setLoading(false);
				setStats(stats);
			})
			.catch((e: unknown) => {
				setLoading(false);
				setError(true);
				console.log(e);
			});
	}, []);

	if (loading) {
		return (
			<div className="loader-container">
				<div className="loader"></div>
			</div>
		);
	}

	if (error || !stats) {
		return (
			<section>
				<section className="header">
					<h2>
						<div className="left">
							<ChevronLeftIcon
								className="clickable"
								onClick={goBack}
							/>
						</div>
						<div>
							<SettingsIcon />
							<span>Asetukset</span>
						</div>
						<div className="right"></div>
					</h2>
				</section>
				<section className="content">
					<div className="centered">
						Tietojen hakeminen ei onnistunut.
					</div>
				</section>
			</section>
		);
	}

	return (
		<section>
			<section className="header">
				<h2>
					<div className="left">
						<ChevronLeftIcon
							className="clickable"
							onClick={goBack}
						/>
					</div>
					<div>
						<SettingsIcon />
						<span>Asetukset</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="grid">
					<div className="grid-item">
						<h3 className="centered underline">
							<StorageIcon />
							<span>Levy</span>
						</h3>
						<table className="table-2-col margin-top">
							<tbody>
								<tr>
									<th className="centered">
										<span>Koko</span>
									</th>
									<td className="centered">
										<span>
											{prettyBytes(stats.disk.size)}
										</span>
									</td>
								</tr>
								<tr>
									<th className="centered">
										<span>Vapaana</span>
									</th>
									<td className="centered">
										<span>
											{prettyBytes(stats.disk.free)}
										</span>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div className="grid-item">
						<h3 className="centered underline">
							<FeedIcon />
							<span>Loki</span>
						</h3>
						<table className="table-2-col margin-top">
							<tbody>
								<tr>
									<th className="centered">
										<span>Loki</span>
									</th>
									<td className="centered">
										<button style={{ margin: 0 }}>Avaa</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>
		</section>
	);
}
