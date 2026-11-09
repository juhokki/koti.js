import { useContext } from "react";
import { useParams } from "react-router-dom";
import { AssetsContext } from "../context/AssetsContext";

export default function useDevice() {
	const { deviceId } = useParams();
	const { devices, loading } = useContext(AssetsContext);
	return {
		deviceId,
		device: devices.find((device) => device.id === deviceId),
		devicePath: `/devices/${encodeURIComponent(deviceId ?? "")}`,
		loading
	};
}
