import { emptyProfileView, getProfileView } from "./data";
import { ProfileForm } from "./profile-form";
import { AdminFormCard, AdminPage } from "../admin-page";

export const metadata = {
  title: "Admin profile",
};

export default async function AdminProfilePage() {
  const profile = (await getProfileView()) ?? emptyProfileView();

  return (
    <AdminPage title="Profile">
      <AdminFormCard className="admin-form-card--wide">
        <h2>Profile details</h2>
        <ProfileForm initial={profile} />
      </AdminFormCard>
    </AdminPage>
  );
}
