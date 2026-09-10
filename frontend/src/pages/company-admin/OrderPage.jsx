import {
    Package,
    Clock3,
    Truck,
    CheckCircle2,
    Search,
    Download,
    TrendingUp,
} from "lucide-react";

const stats = [
    {
        title: "Today's Orders",
        value: 18,
        icon: Package,
        color: "bg-blue-100 text-blue-600",
        growth: "+5%",
    },
    {
        title: "This Week",
        value: 126,
        icon: TrendingUp,
        color: "bg-purple-100 text-purple-600",
        growth: "+14%",
    },
    {
        title: "This Month",
        value: 482,
        icon: Truck,
        color: "bg-orange-100 text-orange-600",
        growth: "+31%",
    },
    {
        title: "Delivered",
        value: 430,
        icon: CheckCircle2,
        color: "bg-emerald-100 text-emerald-600",
        growth: "89%",
    },
];

const orders = [
    {
        id: "ORD-1001",
        customer: "Rahul",
        pickup: "Kochi",
        destination: "Bangalore",
        employee: "Arun",
        courier: "DTDC",
        status: "Delivered",
        date: "Today",
    },
    {
        id: "ORD-1002",
        customer: "Nisha",
        pickup: "Calicut",
        destination: "Chennai",
        employee: "David",
        courier: "Blue Dart",
        status: "Pending",
        date: "Today",
    },
    {
        id: "ORD-1003",
        customer: "Ajay",
        pickup: "Kannur",
        destination: "Delhi",
        employee: "Akhil",
        courier: "Delhivery",
        status: "In Transit",
        date: "Yesterday",
    },
];

export default function OrdersPage() {

    return (

        <div className="space-y-8">

            {/* Header */}

            <div className="flex items-center justify-between">

                <div>

                    <h1 className="text-3xl font-bold text-slate-900">

                        Orders Overview

                    </h1>

                    <p className="text-slate-500 mt-2">

                        Monitor all shipment orders across your company.

                    </p>

                </div>

                <button
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-2xl font-semibold transition cursor-pointer"
                >
                    <Download size={18} />

                    Export Report
                </button>

            </div>

            {/* Statistics */}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                {stats.map((item, index) => {

                    const Icon = item.icon;

                    return (

                        <div
                            key={index}
                            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200"
                        >

                            <div className="flex justify-between items-center">

                                <div>

                                    <p className="text-slate-500 text-sm">

                                        {item.title}

                                    </p>

                                    <h2 className="text-3xl font-bold mt-3">

                                        {item.value}

                                    </h2>

                                    <p className="text-emerald-600 text-sm mt-2 font-medium">

                                        {item.growth}

                                    </p>

                                </div>

                                <div
                                    className={`h-14 w-14 rounded-2xl flex items-center justify-center ${item.color}`}
                                >

                                    <Icon size={28} />

                                </div>

                            </div>

                        </div>

                    );

                })}

            </div>

            {/* Status Cards */}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-5">

                <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-5">

                    <p className="text-sm text-yellow-700 font-medium">

                        Pending

                    </p>

                    <h2 className="text-3xl font-bold text-yellow-900 mt-2">

                        22

                    </h2>

                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5">

                    <p className="text-sm text-blue-700 font-medium">

                        In Transit

                    </p>

                    <h2 className="text-3xl font-bold text-blue-900 mt-2">

                        31

                    </h2>

                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5">

                    <p className="text-sm text-emerald-700 font-medium">

                        Delivered

                    </p>

                    <h2 className="text-3xl font-bold text-emerald-900 mt-2">

                        430

                    </h2>

                </div>

                <div className="bg-red-50 border border-red-200 rounded-3xl p-5">

                    <p className="text-sm text-red-700 font-medium">

                        Cancelled

                    </p>

                    <h2 className="text-3xl font-bold text-red-900 mt-2">

                        12

                    </h2>

                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-3xl p-5">

                    <p className="text-sm text-orange-700 font-medium">

                        Delayed

                    </p>

                    <h2 className="text-3xl font-bold text-orange-900 mt-2">

                        8

                    </h2>

                </div>

            </div>

            {/* Search & Filters */}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                    {/* Search */}

                    <div className="lg:col-span-2 relative">

                        <Search
                            size={20}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="text"
                            placeholder="Search Order ID or Customer..."
                            className="w-full h-12 rounded-2xl border border-slate-200 pl-12 pr-4 outline-none focus:border-teal-500"
                        />

                    </div>

                    {/* Status */}

                    <select
                        className="h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-teal-500"
                    >

                        <option>

                            All Status

                        </option>

                        <option>

                            Pending

                        </option>

                        <option>

                            In Transit

                        </option>

                        <option>

                            Delivered

                        </option>

                        <option>

                            Cancelled

                        </option>

                    </select>

                    {/* Courier */}

                    <select
                        className="h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-teal-500"
                    >

                        <option>

                            All Couriers

                        </option>

                        <option>

                            DTDC

                        </option>

                        <option>

                            Delhivery

                        </option>

                        <option>

                            Blue Dart

                        </option>

                    </select>

                    {/* Date */}

                    <select
                        className="h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-teal-500"
                    >

                        <option>

                            Today

                        </option>

                        <option>

                            Yesterday

                        </option>

                        <option>

                            This Week

                        </option>

                        <option>

                            This Month

                        </option>

                    </select>

                </div>

            </div>
            {/* Orders Table */}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

                <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">

                    <div>

                        <h2 className="text-xl font-bold text-slate-900">

                            Recent Orders

                        </h2>

                        <p className="text-sm text-slate-500 mt-1">

                            Monitor all shipment orders in your organization.

                        </p>

                    </div>

                    <span className="text-sm font-semibold text-slate-500">

                        {orders.length} Orders

                    </span>

                </div>

                <div className="overflow-x-auto">

                    <table className="min-w-full">

                        <thead className="bg-slate-50">

                            <tr>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                    Order ID

                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                    Customer

                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                    Pickup

                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                    Destination

                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                    Employee

                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                    Courier

                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                    Status

                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                    Date

                                </th>

                                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">

                                    Action

                                </th>

                            </tr>

                        </thead>

                        <tbody className="divide-y divide-slate-100">

                            {orders.map((order) => (

                                <tr
                                    key={order.id}
                                    className="hover:bg-slate-50 transition-colors"
                                >

                                    <td className="px-6 py-5 font-semibold text-slate-900">

                                        {order.id}

                                    </td>

                                    <td className="px-6 py-5">

                                        {order.customer}

                                    </td>

                                    <td className="px-6 py-5">

                                        {order.pickup}

                                    </td>

                                    <td className="px-6 py-5">

                                        {order.destination}

                                    </td>

                                    <td className="px-6 py-5">

                                        {order.employee}

                                    </td>

                                    <td className="px-6 py-5">

                                        {order.courier}

                                    </td>

                                    <td className="px-6 py-5">

                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold
                                                ${order.status === "Delivered"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : order.status === "Pending"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : order.status === "In Transit"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-red-100 text-red-700"
                                                }
                                            `}
                                        >

                                            {order.status}

                                        </span>

                                    </td>

                                    <td className="px-6 py-5 text-slate-500">

                                        {order.date}

                                    </td>

                                    <td className="px-6 py-5 text-center">

                                        <button
                                            className="px-4 py-2 rounded-xl bg-teal-50 text-teal-600 font-semibold hover:bg-teal-100 transition cursor-pointer"
                                        >

                                            View

                                        </button>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

            {/* Bottom Section */}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Today's Orders */}

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

                    <h2 className="text-xl font-bold text-slate-900">

                        Today's Orders

                    </h2>

                    <p className="text-sm text-slate-500 mt-1 mb-6">

                        Recent order activities

                    </p>

                    <div className="space-y-5">

                        <div className="flex items-start gap-4">

                            <div className="w-3 h-3 mt-2 rounded-full bg-emerald-500"></div>

                            <div>

                                <p className="font-semibold text-slate-900">

                                    ORD-1001 Delivered

                                </p>

                                <span className="text-sm text-slate-500">

                                    08:20 AM

                                </span>

                            </div>

                        </div>

                        <div className="flex items-start gap-4">

                            <div className="w-3 h-3 mt-2 rounded-full bg-blue-500"></div>

                            <div>

                                <p className="font-semibold text-slate-900">

                                    ORD-1002 In Transit

                                </p>

                                <span className="text-sm text-slate-500">

                                    09:35 AM

                                </span>

                            </div>

                        </div>

                        <div className="flex items-start gap-4">

                            <div className="w-3 h-3 mt-2 rounded-full bg-yellow-500"></div>

                            <div>

                                <p className="font-semibold text-slate-900">

                                    ORD-1003 Pending

                                </p>

                                <span className="text-sm text-slate-500">

                                    10:10 AM

                                </span>

                            </div>

                        </div>

                        <div className="flex items-start gap-4">

                            <div className="w-3 h-3 mt-2 rounded-full bg-red-500"></div>

                            <div>

                                <p className="font-semibold text-slate-900">

                                    ORD-1004 Cancelled

                                </p>

                                <span className="text-sm text-slate-500">

                                    11:40 AM

                                </span>

                            </div>

                        </div>

                    </div>

                </div>

                {/* Top Employees */}

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

                    <h2 className="text-xl font-bold text-slate-900">

                        Top Employees

                    </h2>

                    <p className="text-sm text-slate-500 mt-1 mb-6">

                        Best delivery performance

                    </p>

                    <div className="space-y-5">

                        {[
                            {
                                name: "Arun",
                                orders: 82,
                            },
                            {
                                name: "David",
                                orders: 76,
                            },
                            {
                                name: "Akhil",
                                orders: 71,
                            },
                            {
                                name: "Rahul",
                                orders: 65,
                            },
                        ].map((employee, index) => (

                            <div
                                key={index}
                                className="flex items-center justify-between"
                            >

                                <div className="flex items-center gap-3">

                                    <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700">

                                        {employee.name.charAt(0)}

                                    </div>

                                    <div>

                                        <p className="font-semibold text-slate-900">

                                            {employee.name}

                                        </p>

                                        <p className="text-sm text-slate-500">

                                            Delivery Executive

                                        </p>

                                    </div>

                                </div>

                                <span className="font-bold text-teal-600">

                                    {employee.orders}

                                </span>

                            </div>

                        ))}

                    </div>

                </div>

                {/* Top Couriers */}

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

                    <h2 className="text-xl font-bold text-slate-900">

                        Courier Partners

                    </h2>

                    <p className="text-sm text-slate-500 mt-1 mb-6">

                        Orders handled this month

                    </p>

                    <div className="space-y-5">

                        {[
                            {
                                courier: "DTDC",
                                orders: 165,
                            },
                            {
                                courier: "Delhivery",
                                orders: 142,
                            },
                            {
                                courier: "Blue Dart",
                                orders: 98,
                            },
                            {
                                courier: "India Post",
                                orders: 77,
                            },
                        ].map((courier, index) => (

                            <div
                                key={index}
                                className="flex items-center justify-between"
                            >

                                <div>

                                    <p className="font-semibold text-slate-900">

                                        {courier.courier}

                                    </p>

                                    <p className="text-sm text-slate-500">

                                        Active Partner

                                    </p>

                                </div>

                                <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 font-semibold">

                                    {courier.orders}

                                </span>

                            </div>

                        ))}

                    </div>

                </div>

            </div>

            {/* Bottom Analytics */}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Monthly Performance */}

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

                    <div className="flex items-center justify-between mb-8">

                        <div>

                            <h2 className="text-xl font-bold text-slate-900">

                                Monthly Orders

                            </h2>

                            <p className="text-sm text-slate-500">

                                Orders received this year

                            </p>

                        </div>

                    </div>

                    <div className="space-y-5">

                        {[
                            { month: "Jan", value: 42 },
                            { month: "Feb", value: 65 },
                            { month: "Mar", value: 88 },
                            { month: "Apr", value: 120 },
                            { month: "May", value: 146 },
                            { month: "Jun", value: 182 },
                        ].map((item) => (

                            <div
                                key={item.month}
                                className="flex items-center gap-4"
                            >

                                <div className="w-10 text-sm font-semibold text-slate-600">

                                    {item.month}

                                </div>

                                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">

                                    <div
                                        className="bg-teal-600 h-3 rounded-full"
                                        style={{
                                            width: `${item.value / 2}%`,
                                        }}
                                    />

                                </div>

                                <div className="font-bold text-slate-700 w-10 text-right">

                                    {item.value}

                                </div>

                            </div>

                        ))}

                    </div>

                </div>

                {/* Recent Activity */}

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

                    <h2 className="text-xl font-bold text-slate-900 mb-6">

                        Recent Activity

                    </h2>

                    <div className="space-y-6">

                        {[
                            {
                                title: "Order ORD-1001 Delivered",
                                time: "2 minutes ago",
                                color: "bg-emerald-500",
                            },
                            {
                                title: "New Order Assigned",
                                time: "15 minutes ago",
                                color: "bg-blue-500",
                            },
                            {
                                title: "Shipment Delayed",
                                time: "45 minutes ago",
                                color: "bg-yellow-500",
                            },
                            {
                                title: "Courier Updated",
                                time: "1 hour ago",
                                color: "bg-purple-500",
                            },
                            {
                                title: "Customer Address Changed",
                                time: "Today",
                                color: "bg-red-500",
                            },
                        ].map((activity, index) => (

                            <div
                                key={index}
                                className="flex items-start gap-4"
                            >

                                <div
                                    className={`w-3 h-3 rounded-full mt-2 ${activity.color}`}
                                />

                                <div>

                                    <p className="font-semibold text-slate-900">

                                        {activity.title}

                                    </p>

                                    <p className="text-sm text-slate-500">

                                        {activity.time}

                                    </p>

                                </div>

                            </div>

                        ))}

                    </div>

                </div>

            </div>

        </div>

    );

}