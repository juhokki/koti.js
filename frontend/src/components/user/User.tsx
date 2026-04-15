import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import { AppContext } from "../../context/AppContext";
import { UserContext } from "../../context/UserContext";

export default function User() {
	const navigate = useNavigate();
	const context = useContext(AppContext);
	const connected = context.connected;
	const userContext = useContext(UserContext);
	const user = userContext.user;
	const goToUserDetails = () => {
		Promise.resolve(navigate("/user")).catch(console.log);
	};

	if (!user) {
		return null;
	}

	return (
		<div className={`user ${connected ? "online" : "offline"}`}>
			<span onClick={goToUserDetails} className="clickable">
				<PersonIcon />
				{user.username}
			</span>
		</div>
	);
}
