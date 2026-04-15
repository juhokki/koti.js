class AuthUtil {
	buildAuthorization() {
		const jwt = localStorage.getItem("jwt");

		if (jwt) {
			return `Bearer ${jwt}`;
		} else {
			return "";
		}
	}
}

export default new AuthUtil();
