import {useEffect} from "react";
import {Link, useParams} from "react-router-dom";
import {AlertCircle} from "lucide-react";

import {useAuthStore} from "../stores/useAuthStore.js";
import {useOrderStore} from "../stores/useOrderStore.js";

import {USER_ROLES} from "../constants/domain.js";
import {ORDER_STATUS_STYLES} from "../constants/domain.js";

import {formatCurrency, formatDate} from "../utils/format.js";

import OrderStatusSelect from "../components/order/OrderStatusSelect.jsx";

import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import Container from "../components/ui/Container.jsx";
import Card from "../components/ui/Card.jsx";

const OrderDetailsPage = () => {
	const { id } = useParams();

	const { user } = useAuthStore();
	const {
		currentOrder, loading, error,
		updateOrderStatus, fetchOrderById, clearCurrentOrder, clearError
	} = useOrderStore();

	useEffect(() => {
		void fetchOrderById(id);

		return () => {
			clearCurrentOrder();
			clearError();
		};
	}, [id, fetchOrderById, clearCurrentOrder, clearError]);

	if (loading) return <LoadingSpinner />;

	if (error) {
		return (
			<Container size="lg" className="py-20 text-center">
				<div className="flex flex-col items-center gap-4">
					<AlertCircle className="h-12 w-12 text-red-500" />
					<h2 className="text-2xl font-bold text-white">Order Not Found</h2>
					<p className="text-gray-400">The order you are looking for doesn't exist or has been removed.</p>
					<Link to="/" className="text-emerald-400 hover:underline">Back to Shop</Link>
				</div>
			</Container>
		);
	}

	if (!currentOrder || currentOrder.id !== id) return <LoadingSpinner />;

	return (
		<Container size="lg">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
				<div>
					<h1 className="text-3xl font-bold text-white flex items-center gap-3">
						Order <span className="text-gray-500 text-2xl">#{currentOrder.orderNumber}</span>
					</h1>

					<p className="text-gray-400 mt-1">Placed on {formatDate(currentOrder.createdAt)}</p>
				</div>

				<div className="w-full md:w-64">
					{user?.role === USER_ROLES.ADMIN
						? (
							<OrderStatusSelect
								status={currentOrder.status}
								orderId={currentOrder.id}
								orderNumber={currentOrder.orderNumber}
								onStatusChange={updateOrderStatus}
							/>
						)
						: (
							<div className={`px-4 py-2 rounded-lg border text-center font-semibold ${ORDER_STATUS_STYLES[currentOrder.status]}`}>
								{currentOrder.status.toUpperCase()}
							</div>
						)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Product List */}
				<div className="lg:col-span-2 space-y-6">
					<Card className="overflow-hidden">
						<div className="p-4 border-b border-gray-800 bg-gray-800/20">
							<h3 className="font-semibold text-white">Items Ordered</h3>
						</div>

						<div className="divide-y divide-gray-800">
							{currentOrder.products.map((item) => (
								<div key={item.id} className="p-6 flex items-center gap-6">
									<img src={item.image} alt={item.name} className="h-20 w-20 object-cover rounded-xl border border-gray-700 bg-gray-900" />
									<div className="flex-1">
										<h4 className="text-white font-medium text-lg">{item.name}</h4>
										<p className="text-gray-500">Quantity: {item.quantity}</p>
									</div>
									<div className="text-right">
										<p className="text-white font-bold text-lg">{formatCurrency(item.price * item.quantity)}</p>
										<p className="text-gray-500 text-xs">{formatCurrency(item.price)} per item</p>
									</div>
								</div>
							))}
						</div>
					</Card>

					{/* Payment Info */}
					<Card className="p-6">
						<div className="flex justify-between items-center text-xl font-bold text-white">
							<span>Total Amount</span>
							<span className="text-emerald-400 text-2xl">{formatCurrency(currentOrder.totalAmount)}</span>
						</div>
					</Card>
				</div>

				{/* Sidebar Info */}
				<div className="space-y-6">
					<Card title="Customer Details" className="p-6 space-y-4">
						<h3 className="font-semibold text-white mb-4">Customer Info</h3>
						<div>
							<p className="text-xs text-gray-500 uppercase tracking-wider">Name</p>
							<p className="text-white font-medium">{currentOrder.user?.name || "Guest"}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
							<a href={`mailto:${currentOrder.user?.email}`} className="text-emerald-400 hover:underline">{currentOrder.user?.email}</a>
						</div>
						{currentOrder.paymentSessionId && (
							<div className="pt-4 border-t border-gray-800">
								<p className="text-xs text-gray-500 uppercase tracking-wider">Payment ID</p>
								<p className="text-gray-400 text-[10px] break-all font-mono mt-1">{currentOrder.paymentSessionId}</p>
							</div>
						)}
					</Card>
				</div>
			</div>
		</Container>
	);
};

export default OrderDetailsPage;