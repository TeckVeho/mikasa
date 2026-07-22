export const TENANT_ID = "01HZXEXAMPLE00000000000000";

const tenantRef = { deletedAt: null as Date | null };

export const adminUser = {
  id: "dev-user",
  tenantId: TENANT_ID,
  email: "admin@example.com",
  firebaseUid: "dev-firebase-uid",
  role: "admin",
  name: "管理者",
  tenant: tenantRef,
};

export const operatorUser = {
  id: "dev-operator",
  tenantId: TENANT_ID,
  email: "operator@example.com",
  firebaseUid: "dev-firebase-uid-operator",
  role: "operator",
  name: "オペレーター",
  tenant: tenantRef,
};

export function userById(id: string) {
  if (id === adminUser.id) return adminUser;
  if (id === operatorUser.id) return operatorUser;
  return null;
}
