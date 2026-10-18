import { useEffect } from "react";
import {
	Routes,
	Route,
	Outlet,
	useNavigate,
	useLocation
} from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import socket from "../socket";
import { AppContextProvider } from "../context/AppContext";
import { UserContextProvider } from "../context/UserContext";
import { AssetsContextProvider } from "../context/AssetsContext";
import { ValuesContextProvider } from "../context/ValuesContext";
import { ShoppingListContextProvider } from "../context/ShoppingListContext";
import { AlarmsContextProvider } from "../context/AlarmsContext";
import Home from "./home/Home";
import User from "./user/User";
import UserDetails from "./user/UserDetails";
import Login from "./login/Login";
import Assets from "./assets/Assets";
import AssetDetails from "./assets/AssetDetails";
import DeviceHistory from "./assets/device/DeviceHistory";
import DeviceAlarms from "./assets/device/DeviceAlarms";
import ShoppingList from "./shoppinglist/ShoppingListView";
import RecipeList from "./recipes/RecipeList";
import RecipeDetails from "./recipes/RecipeDetails";
import RecipeDelete from "./recipes/RecipeDelete";
import RecipeShoppingList from "./recipes/RecipeShoppingList";
import RecipeEdit from "./recipes/RecipeEdit";
import Alarms from "./alarms/Alarms";
import System from "./system/System";
import Logs from "./system/Logs";
import PullToRefresh from "./PullToRefresh";

export default function App() {
	const jwt = localStorage.getItem("jwt");
	const location = useLocation();
	const pathname = location.pathname;
	const navigate = useNavigate();

	useEffect(() => {
		if (jwt) {
			socket.auth = { token: `Bearer ${jwt}` };
			socket.once("connect_error", (error) => {
				//if (error?.data?.type === "UnauthorizedError") {
				//	localStorage.removeItem("jwt");
				//	window.location.reload();
				//}
			});
			socket.connect();
		} else {
			if (pathname !== "/login") {
				Promise.resolve(navigate("/login", { replace: true })).catch(
					console.log
				);
			}
		}
	});

	const getHeader = () => {
		if (pathname === "/") {
			return (
				<section className="header">
					<h1>
						<span className="left">Koti</span>
						<span className="right">
							<User />
						</span>
					</h1>
				</section>
			);
		}
	};

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline enableColorScheme />
			<AppContextProvider>
				<UserContextProvider>
					<AssetsContextProvider>
						<ValuesContextProvider>
							<ShoppingListContextProvider>
								<AlarmsContextProvider>
									<PullToRefresh />
									{getHeader()}
									<Routes>
										<Route path="/" element={<Home />} />
										<Route
											path="/login"
											element={<Login />}
										/>
										<Route
											path="/user"
											element={<UserDetails />}
										/>
										<Route
											path="assets"
											element={<Assets />}
										/>
										<Route
											path="assets/:assetId"
											element={<AssetDetails />}
										/>
										<Route
											path="assets/:assetId/:deviceId"
											element={<DeviceHistory />}
										/>
										<Route
											path="assets/:assetId/:deviceId/alarms"
											element={<DeviceAlarms />}
										/>
										<Route
											path="shoppinglist"
											element={<ShoppingList />}
										/>
										<Route
											path="recipes"
											element={<RecipeList />}
										/>
										<Route
											path="recipes/new"
											element={<RecipeEdit />}
										/>
										<Route
											path="recipes/:recipeId"
											element={<RecipeDetails />}
										/>
										<Route
											path="recipes/:recipeId/delete"
											element={<RecipeDelete />}
										/>
										<Route
											path="recipes/:recipeId/shoppinglist"
											element={<RecipeShoppingList />}
										/>
										<Route
											path="recipes/:recipeId/edit"
											element={<RecipeEdit />}
										/>
										<Route
											path="alarms"
											element={<Alarms />}
										/>
										<Route
											path="system"
											element={<System />}
										/>
										<Route
											path="system/logs"
											element={<Logs />}
										/>
									</Routes>
									<Outlet />
								</AlarmsContextProvider>
							</ShoppingListContextProvider>
						</ValuesContextProvider>
					</AssetsContextProvider>
				</UserContextProvider>
			</AppContextProvider>
		</ThemeProvider>
	);
}
