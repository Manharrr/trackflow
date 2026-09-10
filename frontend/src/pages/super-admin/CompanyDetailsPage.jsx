import { useEffect, useState } from "react";
import { useNavigate, useParams, } from "react-router-dom";
import axiosInstance from "../../api/axios";


export default function CompanyDetailsPage() {

    const navigate = useNavigate();
    const { id } = useParams();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    const [reason, setReason] = useState("");
    const [showRejectBox, setShowRejectBox] = useState(false);

    const loadCompany =
        async () => {

            try {

                const res =
                    await axiosInstance.get(
                        `/super-admin/companies/${id}/`
                    );

                setCompany(
                    res.data
                );

            }

            catch (err) {

                console.log(err);

            }

            finally {

                setLoading(false);

            }

        };

    useEffect(() => {

        loadCompany();

    }, []);

    const approveCompany =
        async () => {

            try {

                await axiosInstance.patch(
                    `/super-admin/companies/${id}/approve/`
                );

                navigate(
                    "/super-admin/companies"
                );

            }

            catch (err) {

                console.log(err);

            }

        };

    const rejectCompany = async () => {

        if (!reason.trim()) {
            alert("Please enter rejection reason.");
            return;
        }

        try {

            await axiosInstance.patch(
                `/super-admin/companies/${id}/reject/`,
                {
                    reason,
                }
            );

            navigate(
                "/super-admin/companies"
            );

        }

        catch (err) {

            console.log(err);

        }

    };

    if (loading) {

        return (
            <div className="p-8">
                Loading...
            </div>
        );

    }

    if (!company) {

        return (
            <div className="p-8">
                Company not found.
            </div>
        );

    }

    return (

        <div className="space-y-8">

            <button

                onClick={() =>
                    navigate(
                        "/super-admin/companies"
                    )
                }

                className="text-blue-600"

            >

                ← Back

            </button>

            <div>

                <h1 className="text-3xl font-bold">

                    Company Details

                </h1>

                <p className="text-gray-500 mt-2">

                    View and manage company information.

                </p>

            </div>

            <div className="grid md:grid-cols-2 gap-6">

                <div className="bg-white rounded-xl shadow p-6">

                    <h2 className="text-xl font-semibold mb-6">

                        Company Information

                    </h2>

                    <div className="space-y-5">

                        <div>

                            <p className="text-gray-500">
                                Company Name
                            </p>

                            <p className="font-semibold">
                                {company.name}
                            </p>

                        </div>

                        <div>

                            <p className="text-gray-500">
                                Email
                            </p>

                            <p>
                                {company.email}
                            </p>

                        </div>

                        <div>

                            <p className="text-gray-500">
                                Phone
                            </p>

                            <p>
                                {company.phone}
                            </p>

                        </div>

                        <div>

                            <p className="text-gray-500">
                                Subdomain
                            </p>

                            <p>
                                {company.schema_name}
                            </p>

                        </div>

                        <div>

                            <p className="text-gray-500">
                                Status
                            </p>

                            <span
                                className={`px-3 py-1 rounded-full text-sm
                                ${company.status === "approved"
                                        ? "bg-green-100 text-green-700"
                                        : company.status === "pending"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-red-100 text-red-700"
                                    }`}
                            >
                                {company.status}
                            </span>

                        </div>

                        <div>

                            <p className="text-gray-500">
                                Created
                            </p>

                            <p>
                                {
                                    new Date(
                                        company.created_at
                                    ).toLocaleString()
                                }
                            </p>

                        </div>

                    </div>

                </div>

                <div className="bg-white rounded-xl shadow p-6">

                    <h2 className="text-xl font-semibold mb-6">

                        Workspace Actions

                    </h2>

                    {

                        company.status === "pending"

                            ?

                            <div className="space-y-4">

                                <button

                                    onClick={
                                        approveCompany
                                    }

                                    className="w-full bg-green-600 text-white py-3 rounded-lg"

                                >

                                    Approve Company

                                </button>

                                <button

                                    onClick={() =>
                                        setShowRejectBox(true)
                                    }

                                    className="w-full bg-red-600 text-white py-3 rounded-lg"

                                >

                                    Reject Company

                                </button>

                                {
                                    showRejectBox && (

                                        <div className="mt-6 border-t pt-6">

                                            <label className="block text-sm font-medium mb-2">

                                                Rejection Reason

                                            </label>

                                            <textarea

                                                rows={5}

                                                value={reason}

                                                onChange={(e) =>
                                                    setReason(
                                                        e.target.value
                                                    )
                                                }

                                                placeholder="Explain why this company is being rejected..."

                                                className="
                    w-full
                    border
                    rounded-lg
                    p-3
                    resize-none
                    focus:outline-none
                    focus:ring-2
                    focus:ring-red-500
                "

                                            />

                                            <div className="flex gap-3 mt-4">

                                                <button

                                                    onClick={
                                                        rejectCompany
                                                    }

                                                    className="
                        bg-red-600
                        text-white
                        px-6
                        py-2
                        rounded-lg
                    "

                                                >

                                                    Confirm Reject

                                                </button>

                                                <button

                                                    onClick={() => {

                                                        setReason("");

                                                        setShowRejectBox(false);

                                                    }}

                                                    className="
                        bg-gray-200
                        px-6
                        py-2
                        rounded-lg
                    "

                                                >

                                                    Cancel

                                                </button>

                                            </div>

                                        </div>

                                    )
                                }

                            </div>

                            :

                            <div>

                                <p className="text-green-700 font-medium">

                                    This workspace has already been processed.

                                </p>

                            </div>

                    }

                </div>

            </div>

        </div>

    );

}