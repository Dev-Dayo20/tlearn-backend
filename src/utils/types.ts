export interface AUthPayload {
  id: number;
  email: string;
  role: string;
  schoolId?: number;
  subdomain?: string;
}

export interface createSchoolPayload {
  // School details
  schoolName: string;
  subdomain: string;
  schoolEmail: string;
  address?: string;
  logo?: string;
  // School Admin details
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface schoolIdParam {
  id: number;
}
