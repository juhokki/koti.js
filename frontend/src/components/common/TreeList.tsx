import type { CSSProperties } from "react";
import Icon from "@mui/material/Icon";
import { Link } from "react-router-dom";

export interface TreeNode {
	id: string;
	label: string;
	icon?: string;
	to?: string;
	children?: TreeNode[];
}

interface TreeListProps {
	nodes: TreeNode[];
	label: string;
}

function TreeItems({ nodes, depth }: { nodes: TreeNode[]; depth: number }) {
	return (
		<ul>
			{nodes.map((node) => (
				<li key={node.id}>
					{node.to ? (
						<Link
							className="tree-row"
							to={node.to}
							style={{ "--tree-depth": depth } as CSSProperties}
						>
							{node.icon && <Icon>{node.icon}</Icon>}
							<span>{node.label}</span>
						</Link>
					) : (
						<div
							className="tree-row tree-group"
							style={{ "--tree-depth": depth } as CSSProperties}
						>
							{node.icon && <Icon>{node.icon}</Icon>}
							<span>{node.label}</span>
						</div>
					)}
					{node.children && node.children.length > 0 && (
						<TreeItems nodes={node.children} depth={depth + 1} />
					)}
				</li>
			))}
		</ul>
	);
}

export default function TreeList({ nodes, label }: TreeListProps) {
	return (
		<nav className="tree-list" aria-label={label}>
			<TreeItems nodes={nodes} depth={0} />
		</nav>
	);
}
