import { useEffect } from "react";
import {
	Routes,
	Route,
	Outlet,
	useNavigate,
	useLocation
} from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
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
import ShoppingList from "./shoppinglist/ShoppingListView";
import Alarms from "./alarms/Alarms";
import System from "./system/System";
import Logs from "./system/Logs";
import PullToRefresh from "./PullToRefresh";

const theme = createTheme({
	palette: {
		primary: {
			main: "#30bced"
		},
		error: {
			main: "#df1c44"
		},
		background: {
			default: "var(--background-color)"
		}
	},
	typography: {
		fontFamily: "Poppins, sans-serif",
		fontSize: 20
	},
	shape: {
		borderRadius: 5
	},
	components: {
		MuiSwitch: {
			styleOverrides: {
				root: {
					marginLeft: "-12px"
				}
			}
		},
		MuiSelect: {
			styleOverrides: {
				select: {
					backgroundColor: "var(--box-background-color)",
					color: "var(--font-color)",
					minWidth: "120px"
				},
				icon: {
					color: "var(--font-color)"
				},
				nativeInput: {
					color: "var(--font-color)"
				}
			}
		},
		MuiOutlinedInput: {
			styleOverrides: {
				root: {
					"& .MuiOutlinedInput-notchedOutline": {
						borderColor: "transparent"
					},
					"&:hover .MuiOutlinedInput-notchedOutline": {
						borderColor: "var(--highlight-color)"
					},
					"&.Mui-focused .MuiOutlinedInput-notchedOutline": {
						borderColor: "var(--highlight-color)"
					}
				}
			}
		},
		MuiMenu: {
			styleOverrides: {
				paper: {
					backgroundColor: "var(--box-background-color)",
					color: "var(--font-color)"
				}
			}
		},
		MuiMenuItem: {
			styleOverrides: {
				root: {
					"&.Mui-selected, &.Mui-selected:hover": {
						backgroundColor: "var(--highlight-color)"
					},
					"&:hover": {
						backgroundColor: "rgba(48, 188, 237, 0.3)"
					}
				}
			}
		}
	}
});

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
											path="shoppinglist"
											element={<ShoppingList />}
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
