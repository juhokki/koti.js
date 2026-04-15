import { LoginToken } from "../interface/User";

class LoginApi {
	async login(username: string, password: string): Promise<LoginToken> {
		const url = "/user/login";
		const options = {
			method: "POST",
			body: JSON.stringify({ username, password }),
			headers: {
				"Content-Type": "application/json"
			}
		};

		const response = await fetch(url, options);

		if (response.status !== 200) {
			throw new Error("Login failed");
		}

		return await response.text();
	}
}

export default new LoginApi();
