export interface Client {
    id: number;
    fullName: string;
    identificationNumber: string;
    installationAddress: string;
    city: string;
    primaryPhone: string;
    secondaryPhone?: string;
    email: string;
    onuSerialNumber?: string;
    status: string;
    deletedAt?: string | null;
    created_at: string;
    updated_at: string;
    suspension_extension_date?: string | null;
    latestInstallationDate?: string | null;
    pendingInteractionsCount?: number;
}