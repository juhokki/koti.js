import { useEffect, useRef, useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";

const THRESHOLD = 70;
const MAX_PULL = 120;
const DAMPING = 0.5;

export default function PullToRefresh() {
	const [distance, setDistance] = useState(0);
	const [refreshing, setRefreshing] = useState(false);
	const startY = useRef<number | null>(null);
	const distanceRef = useRef(0);

	useEffect(() => {
		const update = (value: number) => {
			distanceRef.current = value;
			setDistance(value);
		};

		const onTouchStart = (event: TouchEvent) => {
			startY.current =
				window.scrollY <= 0 ? (event.touches[0]?.clientY ?? null) : null;
		};

		const onTouchMove = (event: TouchEvent) => {
			const touch = event.touches[0];

			if (startY.current === null || !touch) {
				return;
			}

			const delta = (touch.clientY - startY.current) * DAMPING;

			if (delta > 0 && window.scrollY <= 0) {
				// Suppress iOS rubber-banding while pulling.
				event.preventDefault();
				update(Math.min(delta, MAX_PULL));
			} else {
				startY.current = null;
				update(0);
			}
		};

		const onTouchEnd = () => {
			if (startY.current === null) {
				return;
			}

			startY.current = null;

			if (distanceRef.current >= THRESHOLD) {
				setRefreshing(true);
				window.location.reload();
			} else {
				update(0);
			}
		};

		window.addEventListener("touchstart", onTouchStart, { passive: true });
		window.addEventListener("touchmove", onTouchMove, { passive: false });
		window.addEventListener("touchend", onTouchEnd);
		window.addEventListener("touchcancel", onTouchEnd);

		return () => {
			window.removeEventListener("touchstart", onTouchStart);
			window.removeEventListener("touchmove", onTouchMove);
			window.removeEventListener("touchend", onTouchEnd);
			window.removeEventListener("touchcancel", onTouchEnd);
		};
	}, []);

	const visible = refreshing ? THRESHOLD : distance;

	return (
		<div
			className={`pull-to-refresh${refreshing ? " refreshing" : ""}`}
			style={{
				transform: `translateY(${String(visible - 40)}px)`,
				opacity: Math.min(visible / THRESHOLD, 1)
			}}
			aria-hidden="true"
		>
			<RefreshIcon
				style={{
					transform: refreshing
						? undefined
						: `rotate(${String(visible * 3)}deg)`
				}}
			/>
		</div>
	);
}
