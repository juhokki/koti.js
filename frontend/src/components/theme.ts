import { createTheme } from "@mui/material/styles";

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
					color: "var(--font-color)"
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

export default theme;