import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import SettingsIcon from "@mui/icons-material/Settings";
import ExtensionIcon from "@mui/icons-material/Extension";
import SystemApi from "../../api/SystemApi";
import { IntegrationInfo } from "../../interface/IntegrationInfo";

export default function Integration() {
	const navigate = useNavigate();
	const { name } = useParams();
	const goBack = () => {
		Promise.resolve(navigate("/system")).catch(console.log);
	};

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [info, setInfo] = useState<IntegrationInfo>();

	useEffect(() => {
		if (!name) {
			setLoading(false);
			setError(true);
			return;
		}

		SystemApi.getIntegration(name)
			.then((info) => {
				setLoading(false);
				setInfo(info);
			})
			.catch((e: unknown) => {
				setLoading(false);
				setError(true);
				console.log(e);
			});
	}, [name]);

	if (loading) {
		return (
			<div className="loader-container">
				<div className="loader"></div>
			</div>
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
						<span>{name}</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				{error || !info ? (
					<div className="centered">
						Tietojen hakeminen ei onnistunut.
					</div>
				) : (
					<div className="grid">
						<div className="grid-item">
							<h3 className="centered underline">
								<ExtensionIcon />
								<span>{info.name}</span>
							</h3>
							{info.parameters.length === 0 ? (
								<div className="centered margin-top">
									Ei parametreja
								</div>
							) : (
								<table className="table-2-col margin-top">
									<tbody>
										{info.parameters.map((parameter) => (
											<tr key={parameter.name}>
												<th className="centered">
													<span>{parameter.name}</span>
												</th>
												<td className="centered">
													<span>
														{String(parameter.value)}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					</div>
				)}
			</section>
		</section>
	);
}
