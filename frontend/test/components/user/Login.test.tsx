import { vi, it } from "vitest";
import { render } from "@testing-library/react";
import Login from "../../../src/components/login/Login";

const useNavigateMock = vi.fn();

vi.mock("react-router-dom", async () => ({
	...(await vi.importActual("react-router-dom")),
	useNavigate: () => useNavigateMock
}));

it("Renders login screen", () => {
	render(<Login />);
});
