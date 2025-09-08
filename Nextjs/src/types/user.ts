export type SessionUserType = {
    email: string;
    access_token: string;
    refresh_token: string;
    _id: string;
    isProfileUpdated?: boolean;
    roleCode?: string;
    companyId?: string;
}

export type IronSessionData = {
    user?: SessionUserType;
}           