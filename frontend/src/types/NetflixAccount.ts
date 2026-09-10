export interface NetflixSlotClient {
    id: number;
    fullName: string;
    primaryPhone: string;
}

export interface NetflixSlot {
    id: number;
    slotIndex: number;
    profileName: string;
    pin: string;
    assignedAt: string | null;
    free: boolean;
    client: NetflixSlotClient | null;
}

export interface NetflixAccount {
    id: number;
    email: string;
    maxSlots: number;
    notes: string | null;
    slots: NetflixSlot[];
    freeSlots: number;
    occupiedSlots: number;
    full: boolean;
}

export interface ClientNetflixSlot {
    id: number;
    profileName: string;
    pin: string;
    slotIndex: number;
    assignedAt: string | null;
    account: { id: number; email: string };
}

export interface ClientOption {
    id: number;
    fullName: string;
    primaryPhone: string;
}