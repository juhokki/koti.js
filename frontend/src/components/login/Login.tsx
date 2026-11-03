import { SubmitEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import socket from "../../socket";
import LoginApi from "../../api/LoginApi";

export default function Login() {
	const [error, setError] = useState(false);
	const [loading, setLoading] = useState(false);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();
	const jwt = localStorage.getItem("jwt");

	useEffect(() => {
		if (jwt) {
			Promise.resolve(navigate("/", { replace: true })).catch(
				console.log
			);
		}
	});

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();

		setError(false);
		setLoading(true);

		LoginApi.login(username, password)
			.then((newJwt) => {
				localStorage.setItem("jwt", newJwt);
				socket.auth = { token: `Bearer ${newJwt}` };
				socket.connect();
				Promise.resolve(navigate("/", { replace: true })).catch(
					console.log
				);
			})
			.catch((e: unknown) => {
				setError(true);
				setLoading(false);
				console.log(e);
			});
	};

	if (loading) {
		return (
			<div className="loader-container">
				<div className="loader"></div>
			</div>
		);
	}

	return (
		<section className="login-page">
			<section className="header">
				<h1>
					<span className="left">Koti</span>
				</h1>
			</section>
			<section className="content">
				{error && (
					<div className="message error">
						Kirjautuminen epäonnistui
					</div>
				)}
				<form className="grid" onSubmit={handleSubmit}>
					<div className="grid-item">
						<div className="margin-bottom" style={{ display: "flex", alignItems: "center" }}>
							<label className="margin-right">
								<PersonIcon />
							</label>
							<input
								onChange={(e) => {
									setUsername(e.target.value);
								}}
								type="text"
								placeholder="Käyttäjätunnus"
								autoComplete="username"
								style={{ flexGrow: 1, "minWidth": 0 }}
							/>
						</div>
						<div className="margin-bottom" style={{ display: "flex", alignItems: "center" }}>
							<label className="margin-right">
								<LockIcon />
							</label>
							<input
								onChange={(e) => {
									setPassword(e.target.value);
								}}
								type="password"
								placeholder="Salasana"
								autoComplete="current-password"
								style={{ flexGrow: 1, "minWidth": 0 }}
							/>
						</div>
						<div className="buttons">
							<button type="submit">Kirjaudu</button>
						</div>
					</div>
				</form>
			</section>
		</section>
	);
}
