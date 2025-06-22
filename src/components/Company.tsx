import Head from "next/head";
import { Company } from "./CompanySearchDropDown";

export default function CompanyPage({ id, company }: {
    id: number,
    company: Company
}) {

    const companyId = Array.isArray(id) ? id[0] : id;

    return (
        <>
            <Head>
                <title>Company Page</title>
            </Head>
            <div className="min-h-screen flex items-center justify-center bg-gray-100 font-[Urbanist] px-4">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="bg-white px-8 py-6 rounded-lg shadow-md text-center text-lg md:text-xl text-gray-800 min-w-[250px]">
                        <div className="mb-1 text-sm text-gray-500">Company ID</div>
                        <div className="font-semibold text-cyan-600">{companyId}</div>
                    </div>

                    <div className="bg-white px-8 py-6 rounded-lg shadow-md text-center text-lg md:text-xl text-gray-800 min-w-[250px]">
                        <div className="mb-1 text-sm text-gray-500">Company Name</div>
                        <div className="font-semibold text-cyan-600">{company.company_full}</div>
                    </div>
                </div>
            </div>

        </>
    );
}
