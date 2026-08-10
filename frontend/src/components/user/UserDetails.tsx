import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import LanguageIcon from "@mui/icons-material/Language";
import PersonIcon from "@mui/icons-material/Person";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import Switch from "@mui/material/Switch";
import socket from "../../socket";
import { UserContext } from "../../context/UserContext";
import WebPushApi from "../../api/WebPushApi";
import { PUBLIC_KEY } from "../../constants/Vapid";
import { SubscribeStatus } from "../../interface/Subscription";

export default function User() {
	const navigate = useNavigate();
	const context = useContext(UserContext);
	const user = context.user;
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [webPushEnabled, setWebPushEnabled] = useState(false);

	const goBack = () => {
		Promise.resolve(navigate("/")).catch(console.log);
	};
	const logout = () => {
		context.setUser(null);
		localStorage.removeItem("jwt");
		socket.disconnect();
		Promise.resolve(navigate("/login", { replace: true })).catch(console.log);
	};
	const onWebPushToggled = async (checked: boolean) => {
		setLoading(true);

		try {
			const reg = await navigator.serviceWorker.ready;

			if (checked) {
				const subscription = await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: PUBLIC_KEY
				});

				await WebPushApi.subscribe(subscription);
				setWebPushEnabled(true);
			} else {
				const subscription = await reg.pushManager.getSubscription();

				if (subscription) {
					await subscription.unsubscribe();
					await WebPushApi.cancelSubscription(subscription);
				}

				setWebPushEnabled(false);
			}
		} catch (e) {
			console.log("Failed to toggle web push.", e);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const checkSubscription = async () => {
			const reg = await navigator.serviceWorker.ready;
			const subscription = await reg.pushManager.getSubscription();

			if (subscription) {
				return WebPushApi.checkSubscription(subscription);
			} else {
				return Promise.resolve({
					status: false
				} satisfies SubscribeStatus);
			}
		};

		checkSubscription()
			.then((isSubcribed) => {
				setWebPushEnabled(isSubcribed.status);
				setLoading(false);
			})
			.catch((e: unknown) => {
				setLoading(false);
				setError(true);
				console.log(e);
			});
	}, []);

	if (loading || !user) {
		return (
			<div className="loader-container">
				<div className="loader"></div>
			</div>
		);
	}

	if (error) {
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
						<div>Käyttäjä</div>
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
						<PersonIcon />
						<span>Käyttäjä</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="grid">
					<div className="grid-item">
						<h3 className="centered underline">
							<NotificationsIcon />
							<span>Ilmoitukset</span>
						</h3>
						<table className="table-2-col margin-top">
							<tbody>
								<tr>
									<th>
										<div>
											<FingerprintIcon />
											<span>Kytke päälle</span>
										</div>
									</th>
									<td>
										<Switch
											checked={webPushEnabled}
											onChange={(event, checked) => {
												onWebPushToggled(checked)
													.catch((e: unknown) => {
														console.log(e);
													});
											}}
											inputProps={{
												"aria-label": "Toggle value"
											}}
										/>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div className="grid-item">
						<h3 className="centered underline">
							<AccountCircleOutlinedIcon />
							<span>Käyttäjä</span>
						</h3>
						<table className="table-2-col margin-top">
							<tbody>
								<tr>
									<th>
										<div>
											<TextFieldsIcon />
											<span>Käyttäjänimi</span>
										</div>
									</th>
									<td>
										<span>{user.username}</span>
									</td>
								</tr>
								<tr>
									<th>
										<div>
											<LanguageIcon />
											<span>Kieli</span>
										</div>
									</th>
									<td>
										<span>{user.locale}</span>
									</td>
								</tr>
								<tr>
									<td colSpan={2}>
										<div className="margin-top centered">
											<button
												onClick={logout}
												type="button"
												className="danger clickable"
											>
												<ExitToAppOutlinedIcon />
												<span>Kirjaudu ulos</span>
											</button>
										</div>
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
