import Card from "../ui/Card.jsx";
import Table from "../ui/Table.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import Pagination from "../ui/Pagination.jsx";

const DataList = ({
	data = [],
	columns,
	pagination,
	onPageChange,
	emptyState = {},
	rowKey = "id"
}) => {
	const { icon: Icon, title, description } = emptyState;

	return (
		<Card className="overflow-hidden">
			{(!data || data.length === 0)
				? (
					<EmptyState
						icon={Icon}
						title={title || "No data found"}
						description={description || "Try adjusting your filters or search."}
					/>
				)
				: (
					<>
						<Table columns={columns} data={data} rowKey={rowKey} />

						{pagination &&
							<Pagination page={pagination.page} pages={pagination.pages} onChange={onPageChange} />
						}
					</>
				)}
		</Card>
	);
};

export default DataList;