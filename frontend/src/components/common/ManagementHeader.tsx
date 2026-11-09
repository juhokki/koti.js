import { Link } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Icon from "@mui/material/Icon";

interface ManagementHeaderProps {
	icon?: string;
	title: string;
	backPath: string;
}

export default function ManagementHeader({
	icon,
	title,
	backPath
}: ManagementHeaderProps) {
	return (
		<section className="header">
			<h2>
				<div className="left">
					<Link to={backPath} aria-label="Takaisin">
						<ChevronLeftIcon />
					</Link>
				</div>
				<div></div>
				<div>
					{icon && <Icon>{icon}</Icon>}
					<span>{title}</span>
				</div>
				<div className="right" />
			</h2>
		</section>
	);
}
