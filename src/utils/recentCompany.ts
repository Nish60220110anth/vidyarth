// utils/recentCompany.ts

import { Company } from "@/components/CompanySearchDropDown";

export function addCompanyToRecentHistory(company: Company) {
    try {
        const stored = localStorage.getItem("recent_companies");
        const current: Company[] = stored ? JSON.parse(stored) : [];

        const updated = [company, ...current.filter((c) => c.id !== company.id)].slice(0, 5);
        localStorage.setItem("recent_companies", JSON.stringify(updated));

        window.dispatchEvent(new Event("recent-companies-updated"));
    } catch (err) {
        console.error("Failed to update recent company history", err);
    }
}

export function getRecentCompanies(): Company[] {
    try {
        const stored = localStorage.getItem("recent_companies");
        return stored ? JSON.parse(stored) : [];
    } catch (err) {
        console.error("Failed to retrieve recent company history", err);
        return [];
    }
}